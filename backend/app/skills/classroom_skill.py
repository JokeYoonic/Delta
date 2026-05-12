from app.skills.base import ZhixuebanSkill, SkillContext, SkillResult
from app.services import ai_tutor_engine
from app.services.rag_service import ragflow_service


TEACHING_STEPS = [
    {
        "key": "objectives",
        "label": "学习目标",
        "prompt_template": "请为{subject}的{topic}列出3-5个清晰的学习目标，用简洁的语言描述学生学完后应该掌握什么。用中文回答。",
    },
    {
        "key": "explain",
        "label": "概念讲解",
        "prompt_template": "请讲解{subject}的{topic}的核心概念。要求：\n1. 从简单到复杂，循序渐进\n2. 用2-3个生活化的类比帮助理解\n3. 关键概念用**加粗**标注\n4. 适合{grade}学生理解\n用中文回答。",
    },
    {
        "key": "examples",
        "label": "典型例题",
        "prompt_template": "请给出{subject}的{topic}的2-3个典型例题，每个例题包含：\n1. 题目\n2. 解题思路（苏格拉底式引导，不直接给答案）\n3. 详细解答\n4. 方法总结\n用中文回答。",
    },
    {
        "key": "practice",
        "label": "随堂练习",
        "prompt_template": "请为{subject}的{topic}出3道随堂练习题，难度递增。每道题包含：\n1. 题目\n2. 提示（不直接给答案）\n3. 参考答案（放在最后）\n用中文回答。",
    },
    {
        "key": "summary",
        "label": "课堂总结",
        "prompt_template": "请总结{subject}的{topic}这节课的要点：\n1. 核心知识点（3-5条）\n2. 易错点提醒\n3. 拓展思考题\n4. 下节课预告\n用中文回答。",
    },
]


class ClassroomSkill(ZhixuebanSkill):
    name = "课堂"
    description = "AI课堂，DeepTutor Book Engine驱动"
    triggers = ["课堂", "上课", "学习新知识", "开始学习", "新课"]
    priority = 15

    async def execute(self, context: SkillContext) -> SkillResult:
        subject = context.subject or "数学"
        topic = self._extract_topic(context.message) or "综合练习"
        grade = context.grade or context.tutor_config.get("grade", "初中")
        step = context.extra.get("teaching_step", "objectives")

        step_config = next((s for s in TEACHING_STEPS if s["key"] == step), TEACHING_STEPS[0])

        prompt = step_config["prompt_template"].format(
            subject=subject,
            topic=topic,
            grade=grade,
        )

        rag_context = ""
        try:
            rag_result = await ragflow_service.query(f"{subject} {topic}")
            if rag_result.get("answer"):
                rag_context = f"\n\n参考教材内容：\n{rag_result['answer']}"
        except Exception:
            pass

        full_prompt = prompt + rag_context

        response = await ai_tutor_engine.chat(
            messages=[{"role": "user", "content": full_prompt}],
            tutor_config=context.tutor_config,
            use_rag=False,
        )

        current_step_idx = next((i for i, s in enumerate(TEACHING_STEPS) if s["key"] == step), 0)
        next_step = None
        if current_step_idx < len(TEACHING_STEPS) - 1:
            next_step = TEACHING_STEPS[current_step_idx + 1]["key"]

        return SkillResult(
            success=True,
            response=response,
            data={
                "subject": subject,
                "topic": topic,
                "mode": "classroom",
                "current_step": step,
                "current_step_label": step_config["label"],
                "next_step": next_step,
                "total_steps": len(TEACHING_STEPS),
                "step_index": current_step_idx,
                "teaching_steps": [{"key": s["key"], "label": s["label"]} for s in TEACHING_STEPS],
            },
            skill_name=self.name,
        )

    def _extract_topic(self, message: str) -> str:
        topic_keywords = {
            "数学": ["方程", "函数", "几何", "概率", "统计", "数列", "向量", "三角", "微积分", "代数"],
            "语文": ["古诗词", "文言文", "阅读理解", "作文", "修辞", "语法", "名著"],
            "英语": ["语法", "阅读", "写作", "听力", "口语", "词汇", "时态"],
            "物理": ["力学", "电学", "光学", "热学", "声学", "能量", "运动"],
            "化学": ["元素", "化学键", "反应", "有机", "无机", "酸碱", "氧化"],
            "生物": ["细胞", "遗传", "进化", "生态", "人体", "植物", "微生物"],
        }
        for subject, keywords in topic_keywords.items():
            for kw in keywords:
                if kw in message:
                    return kw
        return ""
