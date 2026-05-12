from app.skills.base import ZhixuebanSkill, SkillContext, SkillResult
from app.services.rag_service import ragflow_service


class TextbookSkill(ZhixuebanSkill):
    name = "教材"
    description = "RAGFlow知识库查询与章节浏览"
    triggers = ["教材", "课本", "知识点", "章节", "大纲", "目录"]
    priority = 15

    async def execute(self, context: SkillContext) -> SkillResult:
        try:
            result = await ragflow_service.query(
                question=context.message,
                kb_name=context.extra.get("kb_name"),
            )
            answer = result.get("answer", "未找到相关教材内容")
            sources = result.get("sources", [])
            return SkillResult(
                success=True,
                response=answer,
                data={"sources": sources, "confidence": result.get("confidence", 0)},
                skill_name=self.name,
            )
        except Exception as e:
            return SkillResult(
                success=False,
                response="教材查询服务暂时不可用",
                skill_name=self.name,
                error=str(e),
            )
