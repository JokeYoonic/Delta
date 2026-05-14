"""统一知识库种子脚本——从 data/knowledge/ JSON 文件加载并写入 ChromaDB。"""
import os
import sys
import re
import asyncio
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.rag_service import rag_service
from app.services.knowledge_service import load_all_knowledge, load_knowledge_file, list_subjects, get_knowledge_stats


async def seed_knowledge(kb_name: str = "delta-textbooks", subjects: list[str] | None = None, data_file: str | None = None):
    if data_file:
        knowledge = load_knowledge_file(data_file)
    else:
        knowledge = load_all_knowledge()

    if subjects:
        knowledge = {s: knowledge[s] for s in subjects if s in knowledge}

    if not knowledge:
        print("没有找到匹配的知识数据")
        return

    total = 0
    for subject, texts in knowledge.items():
        content = "\n\n".join(texts)
        result = await rag_service.upload_document(kb_name, f"{subject}_知识点.txt", content.encode("utf-8"))
        print(f"[{subject}] {result['status']}: {result.get('chunks', 0)} chunks")
        total += result.get("chunks", 0)
    print(f"\n总计: {total} chunks 写入知识库 '{kb_name}'")


async def list_knowledge(kb_name: str = "delta-textbooks"):
    stats = get_knowledge_stats()
    print("本地知识数据统计:")
    for subject, count in stats.items():
        print(f"  {subject}: {count} 条")
    print(f"\n可用科目: {', '.join(list_subjects())}")

    datasets = await rag_service.list_datasets()
    for ds in datasets:
        if ds["name"] == kb_name:
            docs = await rag_service.list_documents(ds["name"])
            print(f"\nChromaDB 知识库 '{kb_name}': {len(docs)} 篇文档, {ds['count']} chunks")
            for d in docs:
                print(f"  - {d['name']}: {d['chunks']} chunks")


async def crawl_url(url: str, kb_name: str = "delta-textbooks"):
    try:
        import urllib.request
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", errors="ignore")
        text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", "", text)
        text = re.sub(r"\n\s*\n", "\n\n", text)
        text = text.strip()[:50000]

        if not text:
            print("爬取失败：无有效文本")
            return

        name = re.sub(r"[^\w]", "_", url)[:50]
        result = await rag_service.upload_document(kb_name, f"crawl_{name}.txt", text.encode("utf-8"))
        print(f"爬取完成: {result['status']}, {result.get('chunks', 0)} chunks")
    except Exception as e:
        print(f"爬取失败: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="K12 教材知识库种子脚本（统一版）")
    parser.add_argument("--kb", default="delta-textbooks", help="知识库名称")
    parser.add_argument("--list", action="store_true", help="列出已有知识点")
    parser.add_argument("--crawl", help="从指定 URL 爬取文本")
    parser.add_argument("--subjects", nargs="*", help="指定科目（如 数学 物理），不指定则全部")
    parser.add_argument("--data-file", help="指定数据文件名（如 core_subjects.json），不指定则加载全部")
    args = parser.parse_args()

    if args.list:
        asyncio.run(list_knowledge(args.kb))
    elif args.crawl:
        asyncio.run(crawl_url(args.crawl, args.kb))
    else:
        asyncio.run(seed_knowledge(args.kb, args.subjects, args.data_file))
