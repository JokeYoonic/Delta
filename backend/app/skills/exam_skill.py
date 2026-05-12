from app.skills.base import ZhixuebanSkill, SkillContext, SkillResult
from app.services.ai_tutor import ai_tutor_engine


class ExamSkill(ZhixuebanSkill):
    name = "考试"
    description = "智能组卷、监考、AI批改"
    triggers = ["考试", "测验", "组卷", "出题", "练习题", "测试"]
    priority = 20

    async def execute(self, context: SkillContext) -> SkillResult:
        try:
            subject = context.subject or "数学"
            chapter = context.extra.get("chapter", "综合")
            difficulty = context.extra.get("difficulty", "medium")
            count = context.extra.get("count", 10)

            questions = await ai_tutor_engine.generate_exam_questions(
                subject=subject,
                chapter=chapter,
                difficulty=difficulty,
                count=count,
            )
            return SkillResult(
                success=True,
                response=f"已为您生成{len(questions)}道{subject}练习题",
                data={"questions": questions},
                skill_name=self.name,
            )
        except Exception as e:
            return SkillResult(
                success=False,
                response="组卷服务暂时不可用",
                skill_name=self.name,
                error=str(e),
            )
