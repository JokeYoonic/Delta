"""自动生成 K12 教材知识点并写入 ChromaDB RAG 知识库。"""
import os, sys, re, asyncio, argparse
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.rag_service import rag_service

# 人教版初中主科核心知识点（示例——实际生产应爬取或导入完整教材）
KNOWLEDGE_BASE = {
    "数学": [
        # 七年级
        "有理数：正数、负数、零统称为有理数。有理数可以表示为分数形式 p/q（q≠0）。数轴是规定了原点、正方向和单位长度的直线。绝对值是一个数在数轴上到原点的距离。",
        "整式的加减：单项式是数字与字母的乘积，多项式是几个单项式的和。合并同类项时，系数相加，字母部分不变。去括号法则：括号前是+号，去掉括号不变号；括号前是-号，去掉括号全部变号。",
        "一元一次方程：只含有一个未知数且未知数次数为1的方程。解一元一次方程的步骤：去分母、去括号、移项、合并同类项、系数化为1。移项要变号。",
        "二元一次方程组：含有两个未知数且每个未知数次数为1的方程组。解法有代入消元法和加减消元法。代入法：将一个方程变形后代入另一个。加减法：将两个方程相加或相减消去一个未知数。",
        # 八年级
        "三角形：由三条线段首尾顺次连接组成的封闭图形。三角形内角和为180°。三角形两边之和大于第三边。全等三角形的判定：SSS、SAS、ASA、AAS、HL（仅直角三角形）。",
        "勾股定理：直角三角形两条直角边的平方和等于斜边的平方，即 a² + b² = c²。勾股定理的逆定理：如果三角形三边满足 a² + b² = c²，则该三角形是直角三角形。",
        "一次函数：形如 y = kx + b（k≠0）的函数。k 是斜率，表示直线的倾斜程度。b 是截距，表示直线与 y 轴的交点。当 k>0 时 y 随 x 增大而增大，k<0 时 y 随 x 增大而减小。",
        # 九年级
        "一元二次方程：形如 ax² + bx + c = 0（a≠0）的方程。求根公式：x = (-b ± √(b²-4ac)) / (2a)。判别式 Δ = b²-4ac：Δ>0 有两个不等实根，Δ=0 有两个相等实根，Δ<0 无实根。四种解法：直接开平方法、配方法、公式法、因式分解法。",
        "二次函数：形如 y = ax² + bx + c（a≠0）的函数。图像是抛物线，a>0 开口向上，a<0 开口向下。对称轴 x = -b/(2a)，顶点坐标 (-b/(2a), (4ac-b²)/(4a))。顶点式 y = a(x-h)² + k。",
        "圆：平面上到定点距离等于定长的点的集合。垂径定理：垂直于弦的直径平分弦及弦所对的弧。圆周角定理：同弧所对圆周角等于圆心角的一半。切线垂直于过切点的半径。",
    ],
    "物理": [
        "运动的描述：机械运动是一个物体相对于另一个物体位置的变化。参照物是描述物体运动时选作标准的物体。速度 v = s/t，单位 m/s。匀速直线运动的速度大小和方向不变。",
        "声现象：声音由物体振动产生，以波的形式传播。声音传播需要介质，真空不能传声。声速与介质有关，15°C 空气中约 340m/s。响度与振幅有关，音调与频率有关，音色与材料结构有关。",
        "光的反射与折射：反射定律：入射角等于反射角，入射光线、反射光线、法线在同一平面内。平面镜成像特点：正立、等大、虚像、像距等于物距。折射时，光从空气斜射入玻璃/水中，折射角小于入射角。",
        "力与运动：力是物体对物体的作用。力的三要素：大小、方向、作用点。牛顿第一定律（惯性定律）：物体在不受外力时保持静止或匀速直线运动状态。惯性是物体保持原来运动状态的性质。",
        "压强：压强 p = F/S，单位 Pa（帕斯卡）。增大压强的方法：增大压力或减小受力面积。液体压强 p = ρgh。大气压强：1 标准大气压 = 1.013×10⁵ Pa = 760 mmHg。",
        "浮力：浸在液体中的物体受到向上的浮力。阿基米德原理：F浮 = ρ液·g·V排。浮沉条件：F浮>G 上浮，F浮=G 悬浮，F浮<G 下沉。轮船、潜艇、气球均利用浮力原理。",
        "欧姆定律：I = U/R，电流与电压成正比，与电阻成反比。U 单位伏特(V)，I 单位安培(A)，R 单位欧姆(Ω)。电阻与导体长度成正比，与横截面积成反比，与材料有关。",
        "电功率：P = UI = I²R = U²/R，单位瓦特(W)。额定功率是用电器在额定电压下正常工作的功率。实际功率随实际电压变化。焦耳定律：Q = I²Rt，电流通过导体产生的热量。",
    ],
    "英语": [
        # 初中核心语法
        "Simple Present Tense 一般现在时：表示经常性、习惯性的动作或状态。主语第三人称单数时动词加 s/es。标志词：always, usually, often, sometimes, never, every day。",
        "Simple Past Tense 一般过去时：表示过去某个时间发生的动作或状态。规则动词加 ed，不规则动词需特殊记忆。标志词：yesterday, last week, ago, in 2010。",
        "Present Perfect Tense 现在完成时：have/has + 过去分词。表示过去发生的动作对现在的影响或从过去持续到现在的状态。标志词：already, yet, just, ever, never, since, for。",
        "Passive Voice 被动语态：be + 过去分词。一般现在时的被动：am/is/are + done。一般过去时的被动：was/were + done。动作的承受者作主语，执行者用 by 引出。",
        "Object Clause 宾语从句：在动词或介词后充当宾语的句子。that 引导陈述句，if/whether 引导一般疑问句，疑问词引导特殊疑问句。主句过去时，从句也要用相应的过去时态（时态一致原则）。",
        "Conditional Sentences 条件状语从句：if 引导的条件句，主将从现（主句用一般将来时，从句用一般现在时）。if it rains tomorrow, I will stay at home.",
        "Relative Clauses 定语从句：修饰名词或代词的从句。关系代词 who/whom/that/which，关系副词 when/where/why。限制性定语从句不可省略，非限制性定语从句用逗号隔开。",
    ],
    "语文": [
        "修辞手法：比喻（明喻、暗喻、借喻）、拟人、夸张、排比、对偶、反复、设问、反问。比喻三要素：本体、喻体、比喻词。拟人就是把事物人格化。排比增强语言气势和节奏感。",
        "文言文虚词：之（代词/结构助词/动词）、而（并列/递进/转折/修饰）、以（用/因为/用来）、于（在/对于/比/被）、其（代词/语气词）、乃（于是/竟然/才）、则（就/却）。",
        "古诗词鉴赏：意象是融入了诗人主观情感的客观物象（如月亮代表思乡，柳树代表离别）。意境是意象组合形成的艺术境界。表现手法：借景抒情、托物言志、虚实结合、动静结合。",
        "记叙文六要素：时间、地点、人物、起因、经过、结果。记叙顺序：顺叙、倒叙、插叙、补叙。表达方式：记叙、描写、议论、抒情、说明。",
        "议论文三要素：论点（作者的观点主张）、论据（事实论据和道理论据）、论证（举例论证、道理论证、对比论证、比喻论证、引用论证）。论证方式：立论和驳论。",
    ],
}


async def seed_knowledge_base(kb_name: str = "delta-textbooks"):
    total = 0
    for subject, texts in KNOWLEDGE_BASE.items():
        content = "\n\n".join(texts)
        result = await rag_service.upload_document(kb_name, f"{subject}_知识点.txt", content.encode("utf-8"))
        print(f"[{subject}] {result['status']}: {result.get('chunks', 0)} chunks")
        total += result.get("chunks", 0)
    print(f"\n总计: {total} chunks 写入知识库 '{kb_name}'")


async def list_knowledge(kb_name: str = "delta-textbooks"):
    datasets = await rag_service.list_datasets()
    for ds in datasets:
        if ds["name"] == kb_name:
            docs = await rag_service.list_documents(ds["name"])
            print(f"知识库 '{kb_name}': {len(docs)} 篇文档, {ds['count']} chunks")
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
    parser = argparse.ArgumentParser(description="K12 教材知识库种子脚本")
    parser.add_argument("--kb", default="delta-textbooks", help="知识库名称")
    parser.add_argument("--list", action="store_true", help="列出已有知识点")
    parser.add_argument("--crawl", help="从指定 URL 爬取文本")
    args = parser.parse_args()

    if args.list:
        asyncio.run(list_knowledge(args.kb))
    elif args.crawl:
        asyncio.run(crawl_url(args.crawl, args.kb))
    else:
        asyncio.run(seed_knowledge_base(args.kb))
