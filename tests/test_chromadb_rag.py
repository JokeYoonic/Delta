"""ChromaDB RAG 全链路测试：上传 → 检索 → 修改 → 聊天集成。"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.services.rag_service import ragflow_service, ChromaRAGService


async def test_upload():
    """测试 1：上传教材文档。"""
    print("\n=== 测试 1：上传文档 ===")

    test_content = """一元二次方程

一元二次方程是只含有一个未知数（一元），并且未知数项的最高次数是2（二次）的整式方程。

标准形式：ax² + bx + c = 0（a ≠ 0）

求根公式（公式法）：
x = (-b ± √(b² - 4ac)) / (2a)

其中 Δ = b² - 4ac 称为判别式。

判别式的意义：
- 当 Δ > 0 时，方程有两个不相等的实根
- 当 Δ = 0 时，方程有两个相等的实根
- 当 Δ < 0 时，方程没有实根（有两个共轭复根）

解法分类：
1. 直接开平方法：形如 (x+m)² = n 的方程
2. 配方法：将方程左边配成完全平方
3. 公式法：直接代入求根公式
4. 因式分解法：将方程左边分解为两个一次因式的乘积

韦达定理：
如果一元二次方程 ax² + bx + c = 0 的两根为 x₁ 和 x₂，那么：
x₁ + x₂ = -b/a
x₁ · x₂ = c/a
"""

    result = ragflow_service.upload_document("delta-textbooks", "一元二次方程.txt", test_content.encode("utf-8"))
    print(f"  上传结果: {result['status']}, 分块数: {result.get('chunks', 0)}")
    assert result["status"] == "uploaded"


def test_list_datasets():
    """测试：列出数据集。"""
    print("\n=== 测试：列出数据集 ===")
    datasets = ragflow_service.list_datasets()
    print(f"  数据集数量: {len(datasets)}")
    for ds in datasets:
        print(f"  - {ds['name']}: {ds.get('count', 0)} chunks")
    assert len(datasets) > 0


def test_list_documents():
    """测试：列出文档。"""
    print("\n=== 测试：列出文档 ===")
    docs = ragflow_service.list_documents("delta-textbooks")
    print(f"  文档数量: {len(docs)}")
    for d in docs:
        print(f"  - {d['name']}: {d.get('chunks', 0)} chunks")
    assert len(docs) > 0


async def test_query():
    """测试 2：检索——语义检索教材内容。"""
    print("\n=== 测试 2：检索 ===")

    questions = [
        "求根公式是什么？",
        "判别式小于0会怎样？",
        "什么是韦达定理？",
        "配方法怎么用？",
    ]

    for q in questions:
        result = ragflow_service.query(q, "delta-textbooks", top_k=3)
        print(f"\n  问题: {q}")
        print(f"  置信度: {result['confidence']}")
        print(f"  来源数: {len(result['sources'])}")
        if result["sources"]:
            print(f"  最相关: {result['sources'][0]['document_name']} (相似度 {result['sources'][0]['similarity']})")
            preview = result['sources'][0]['content'][:80].encode("ascii", "replace").decode("ascii")
            print(f"  content_preview: {preview}...")
        assert result["confidence"] > 0, f"Query '{q}' returned confidence 0"
        assert len(result["sources"]) > 0, f"Query '{q}' returned no sources"

    print("\n  [OK] 所有检索测试通过")


async def test_modify():
    """测试 3：修改知识库——删除旧文档，上传新版本。"""
    print("\n=== 测试 3：修改知识库 ===")

    # 上传第二份教材
    extra_content = """二次函数

二次函数的基本形式：y = ax² + bx + c（a ≠ 0）

图像：二次函数的图像是一条抛物线。
- 当 a > 0 时，抛物线开口向上
- 当 a < 0 时，抛物线开口向下

对称轴：x = -b / (2a)
顶点坐标：(-b/(2a), (4ac-b²)/(4a))

顶点式：y = a(x - h)² + k，其中 (h, k) 是顶点坐标。
"""

    result = ragflow_service.upload_document("delta-textbooks", "二次函数.txt", extra_content.encode("utf-8"))
    print(f"  上传二次函数: {result['status']}, 分块: {result.get('chunks', 0)}")

    # 检索确认新内容可用
    result = ragflow_service.query("二次函数的顶点坐标怎么求？", "delta-textbooks", top_k=3)
    print(f"  检索'顶点坐标': 置信度={result['confidence']}, 来源数={len(result['sources'])}")
    assert len(result["sources"]) > 0

    # 删除二次函数文档
    del_result = ragflow_service.delete_document("delta-textbooks", "二次函数.txt")
    print(f"  删除二次函数: {del_result['status']}, 删除了 {del_result['count']} chunks")

    # 确认已删除
    result = ragflow_service.query("二次函数的顶点坐标怎么求？", "delta-textbooks", top_k=3)
    print(f"  删除后检索'顶点坐标': 置信度={result['confidence']}")
    # 删除后confindence应该下降（因为相关内容被移除）

    print("  [OK] 修改测试通过")


async def test_chat_integration():
    """测试 4：与 Delta AI 聊天系统集成。"""
    print("\n=== 测试 4：聊天集成 ===")
    from app.services.ai_tutor import ai_tutor_engine

    messages = [{"role": "user", "content": "一元二次方程怎么解？有哪些方法？"}]
    tutor_config = {"depth": 3, "communication_style": "socratic", "language": "zh-CN"}

    response, sources = await ai_tutor_engine.chat_with_sources(
        messages=messages,
        tutor_config=tutor_config,
        use_rag=True,
    )

    print(f"  RAG 来源数: {len(sources)}")
    if sources:
        print(f"  来源文档: {[s.get('document_name', '') for s in sources]}")
        print(f"  最高相似度: {max(s.get('similarity', 0) for s in sources)}")
    print(f"  AI 回答 (前200字): {response[:200]}...")
    assert len(response) > 50, "AI response too short"
    assert len(sources) > 0, "No RAG sources returned"
    print("  [OK] 聊天集成测试通过")


async def main():
    print("=" * 60)
    print("ChromaDB RAG 全链路测试")
    print("=" * 60)

    await test_upload()
    test_list_datasets()
    test_list_documents()
    await test_query()
    await test_modify()
    await test_chat_integration()

    print("\n" + "=" * 60)
    print("全部测试通过！")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
