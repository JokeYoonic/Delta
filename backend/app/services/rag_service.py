import os
import re
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# ChromaDB + embedding 延迟加载
_client = None
_embed_fn = None

CHROMA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_data")


def _get_client():
    global _client
    if _client is None:
        import chromadb
        os.makedirs(CHROMA_PATH, exist_ok=True)
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
    return _client


def _get_embed_fn():
    global _embed_fn
    if _embed_fn is not None:
        return _embed_fn

    if settings.EMBEDDING_API_KEY:
        from openai import OpenAI
        client = OpenAI(
            api_key=settings.EMBEDDING_API_KEY,
            base_url=settings.EMBEDDING_HOST or "https://api.openai.com/v1",
        )

        def _openai_embed(texts: list[str]) -> list[list[float]]:
            resp = client.embeddings.create(model=settings.EMBEDDING_MODEL, input=texts)
            return [d.embedding for d in resp.data]

        _embed_fn = _openai_embed
    else:
        from sentence_transformers import SentenceTransformer

        # 本地模型：如果配置的 EMBEDDING_MODEL 不是 sentence-transformers 模型名，用默认值
        model_name = settings.EMBEDDING_MODEL or ""
        if "/" not in model_name and not model_name.startswith("sentence-transformers/"):
            model_name = "paraphrase-multilingual-MiniLM-L12-v2"

        logger.info(f"Loading local embedding model: {model_name}")
        st_model = SentenceTransformer(model_name)

        def _local_embed(texts: list[str]) -> list[list[float]]:
            return st_model.encode(texts, normalize_embeddings=True).tolist()

        _embed_fn = _local_embed

    return _embed_fn


def _split_text(text: str, chunk_size: int = 500, overlap: int = 80) -> list[str]:
    """按段落 + 句子拆分文本为 chunk。"""
    paragraphs = text.split("\n\n")
    chunks = []
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(para) <= chunk_size:
            chunks.append(para)
        else:
            sentences = re.split(r"(?<=[。！？.!?])\s*", para)
            current = ""
            for sent in sentences:
                if len(current) + len(sent) <= chunk_size:
                    current += sent
                else:
                    if current.strip():
                        chunks.append(current.strip())
                    current = current[-overlap:] + sent if len(current) > overlap else sent
            if current.strip():
                chunks.append(current.strip())
    return chunks


class ChromaRAGService:
    """基于 ChromaDB 的本地 RAG 引擎，替代 RAGFlow。

    RAGFlow 未使用的原因为：
    1. Docker 镜像过大 (12.6GB)，开发笔记本 (16GB RAM) 启动即 OOM
    2. 最新版 (v0.25.3) 有 itsdangerous / hpack 等依赖链断裂，无法正常启动
    3. ChromaDB 为 pip install 级别轻量方案，功能生态位完全覆盖上传→分块→向量化→检索全流程
    4. 避免了 RAGFlow 的"双重 LLM"问题：原 RAGFlow query 内部调用 LLM 生成答案，
       再作为 context 喂给 DeepSeek，导致同一问题经过两个 LLM
    """

    def _get_collection(self, kb_name: str):
        name = re.sub(r"[^a-zA-Z0-9_-]", "_", kb_name or settings.RAGFLOW_KB_NAME)
        return _get_client().get_or_create_collection(name=name)

    async def list_datasets(self) -> list[dict]:
        collections = _get_client().list_collections()
        return [{"id": c.name, "name": c.name, "count": c.count()} for c in collections]

    async def get_or_create_dataset(self, name: str) -> str:
        safe = re.sub(r"[^a-zA-Z0-9_-]", "_", name)
        _get_client().get_or_create_collection(name=safe)
        return safe

    async def upload_document(self, dataset_id: str, file_name: str, file_content: bytes) -> dict:
        collection = _get_client().get_or_create_collection(name=dataset_id)
        embed_fn = _get_embed_fn()

        try:
            text = file_content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = file_content.decode("gbk")
            except Exception:
                return {"status": "error", "message": "无法解码文件，仅支持 UTF-8/GBK 文本"}

        chunks = _split_text(text, chunk_size=500, overlap=80)
        if not chunks:
            return {"status": "error", "message": "文件内容为空或过短"}

        embeddings = embed_fn(chunks)
        ids = [f"{file_name}_{i}" for i in range(len(chunks))]
        # 从文件名提取科目名：数学_知识点.txt → 数学
        subject_tag = re.split(r"[_\-.]", file_name)[0] if file_name else ""
        metadatas = [{"document_name": file_name, "chunk_index": i, "text": c, "subject": subject_tag} for i, c in enumerate(chunks)]

        collection.add(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)

        return {
            "status": "uploaded",
            "filename": file_name,
            "dataset_id": dataset_id,
            "chunks": len(chunks),
        }

    async def list_documents(self, dataset_id: str) -> list[dict]:
        try:
            collection = _get_client().get_collection(name=dataset_id)
            data = collection.get()
            docs_set = {}
            for meta in data.get("metadatas", []):
                doc_name = meta.get("document_name", "unknown")
                if doc_name not in docs_set:
                    docs_set[doc_name] = {"name": doc_name, "chunks": 0}
                docs_set[doc_name]["chunks"] += 1
            return list(docs_set.values())
        except Exception:
            return []

    async def delete_document(self, dataset_id: str, document_name: str) -> dict:
        collection = _get_client().get_collection(name=dataset_id)
        data = collection.get()
        ids_to_delete = []
        for i, meta in enumerate(data.get("metadatas", [])):
            if meta.get("document_name") == document_name:
                ids_to_delete.append(data["ids"][i])
        if ids_to_delete:
            collection.delete(ids=ids_to_delete)
        return {"status": "deleted", "count": len(ids_to_delete)}

    async def query(self, question: str, kb_name: str = None, top_k: int = 5) -> dict:
        """纯检索——支持按科目(文档名)过滤。"""
        kb = kb_name or settings.RAGFLOW_KB_NAME
        embed_fn = _get_embed_fn()

        # 始终在 delta-textbooks 集合中检索
        collection_name = re.sub(r"[^a-zA-Z0-9_-]", "_", settings.RAGFLOW_KB_NAME)
        try:
            collection = _get_client().get_collection(name=collection_name)
        except Exception:
            return {"answer": "知识库为空，请先上传教材", "sources": [], "confidence": 0.0}

        query_embedding = embed_fn([question])

        # 如果 kb_name 是科目名（非集合名），按文档名过滤
        results = None
        if kb_name and kb_name != settings.RAGFLOW_KB_NAME:
            # 先尝试按科目过滤
            results = collection.query(
                query_embeddings=query_embedding, n_results=top_k,
                where={"subject": kb_name},
            )

        # 过滤无结果则回退全库搜索
        if results is None or not results.get("documents") or not results["documents"][0]:
            results = collection.query(query_embeddings=query_embedding, n_results=top_k)

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        sources = []
        chunks = []
        for i, doc in enumerate(documents):
            meta = metadatas[i] if i < len(metadatas) else {}
            dist = distances[i] if i < len(distances) else 1.0
            sources.append({
                "document_name": meta.get("document_name", ""),
                "similarity": round(max(0, 1 - dist), 4),
                "content": doc[:200],
            })
            chunks.append(doc)

        context = "\n\n---\n\n".join(chunks)

        return {
            "answer": context,
            "sources": sources,
            "confidence": round(max(0, 1 - distances[0]), 4) if distances and distances[0] < 1 else 0.85,
        }


# 全局单例，接口兼容旧的 ragflow_service
ragflow_service = ChromaRAGService()
