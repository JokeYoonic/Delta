from app.skills.base import ZhixuebanSkill, SkillContext, SkillResult


class OralSkill(ZhixuebanSkill):
    name = "口语"
    description = "口语训练，Pipecat语音管道，四模态纠错"
    triggers = ["口语", "说话", "发音", "对话", "朗读", "朗诵"]
    priority = 20

    async def execute(self, context: SkillContext) -> SkillResult:
        scenario = self._detect_scenario(context.message)
        return SkillResult(
            success=True,
            response=f"口语训练模式已启动，场景：{scenario}。请开始说话或输入文本练习。",
            data={
                "scenario": scenario,
                "agent_role": self._select_agent(scenario, context.extra.get("student_level", "beginner")),
            },
            skill_name=self.name,
        )

    def _detect_scenario(self, message: str) -> str:
        if any(kw in message for kw in ["考试", "模拟"]):
            return "exam"
        if any(kw in message for kw in ["朗诵", "诗词", "朗读"]):
            return "recitation"
        if any(kw in message for kw in ["解题", "说题"]):
            return "presentation"
        return "daily"

    def _select_agent(self, scenario: str, student_level: str) -> str:
        if scenario == "exam":
            return "strict"
        if scenario == "recitation":
            return "gentle"
        if student_level in ("beginner", "基础"):
            return "gentle"
        return "peer"
