from app.skills.base import ZhixuebanSkill, SkillContext, SkillResult
from app.services.ai_tutor import ai_tutor_engine


class QASkill(ZhixuebanSkill):
    name = "答疑"
    description = "AI智能答疑，通过苏格拉底式引导帮助学生理解问题"
    triggers = ["怎么做", "为什么", "是什么", "解释", "帮我", "不懂", "不会", "?", "？"]
    priority = 10

    async def execute(self, context: SkillContext) -> SkillResult:
        try:
            response = await ai_tutor_engine.chat(
                messages=context.conversation_history + [{"role": "user", "content": context.message}],
                tutor_config=context.tutor_config,
                use_rag=True,
            )
            return SkillResult(
                success=True,
                response=response,
                skill_name=self.name,
            )
        except Exception as e:
            return SkillResult(
                success=False,
                response="抱歉，答疑服务暂时不可用，请稍后再试。",
                skill_name=self.name,
                error=str(e),
            )
