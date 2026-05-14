import os
import re
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

_client = None
_embed_fn = None


def _get_client():
    global _client
    if _client is None:
        import chromadb
        chroma_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            settings.CHROMA_PERSIST_DIR,
        )
        os.makedirs(chroma_path, exist_ok=True)
        _client = chromadb.PersistentClient(path=chroma_path)
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

        model_name = settings.EMBEDDING_MODEL or ""
        if "/" not in model_name and not model_name.startswith("sentence-transformers/"):
            model_name = "paraphrase-multilingual-MiniLM-L12-v2"

        logger.info(f"Loading local embedding model: {model_name}")
        st_model = SentenceTransformer(model_name)

        def _local_embed(texts: list[str]) -> list[list[float]]:
            return st_model.encode(texts, normalize_embeddings=True).tolist()

        _embed_fn = _local_embed

    return _embed_fn


def _split_text(text: str, chunk_size: int = None, overlap: int = None) -> list[str]:
    paragraphs = text.split("\n\n")
    chunks = []
    _chunk_size = chunk_size or settings.CHUNK_SIZE
    _overlap = overlap or settings.CHUNK_OVERLAP
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(para) <= _chunk_size:
            chunks.append(para)
        else:
            sentences = re.split(r"(?<=[。！？.!?])\s*", para)
            current = ""
            for sent in sentences:
                if len(current) + len(sent) <= _chunk_size:
                    current += sent
                else:
                    if current.strip():
                        chunks.append(current.strip())
                    current = current[-_overlap:] + sent if len(current) > _overlap else sent
            if current.strip():
                chunks.append(current.strip())
    return chunks


class ChromaRAGService:
    """基于 ChromaDB 的本地 RAG 引擎。

    ChromaDB 为 pip install 级别轻量方案，覆盖上传→分块→向量化→检索全流程。
    纯检索模式，不调用 LLM，避免"双重 LLM"问题。
    """

    def _get_collection(self, kb_name: str):
        name = re.sub(r"[^a-zA-Z0-9_-]", "_", kb_name or settings.CHROMA_COLLECTION_NAME)
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

        chunks = _split_text(text)
        if not chunks:
            return {"status": "error", "message": "文件内容为空或过短"}

        embeddings = embed_fn(chunks)
        ids = [f"{file_name}_{i}" for i in range(len(chunks))]
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
        """纯检索——支持按科目(subject metadata)过滤。"""
        kb = kb_name or settings.CHROMA_COLLECTION_NAME
        embed_fn = _get_embed_fn()

        collection_name = re.sub(r"[^a-zA-Z0-9_-]", "_", settings.CHROMA_COLLECTION_NAME)
        try:
            collection = _get_client().get_collection(name=collection_name)
        except Exception:
            return {"answer": "知识库为空，请先上传教材", "sources": [], "confidence": 0.0}

        query_embedding = embed_fn([question])

        results = None
        if kb_name and kb_name != settings.CHROMA_COLLECTION_NAME:
            results = collection.query(
                query_embeddings=query_embedding, n_results=top_k,
                where={"subject": kb_name},
            )

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


rag_service = ChromaRAGService()
