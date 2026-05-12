from app.skills.base import ZhixuebanSkill, SkillContext, SkillResult


class ParentSkill(ZhixuebanSkill):
    name = "家长"
    description = "家长监管后台，学习报告推送"
    triggers = ["家长", "查看报告", "学习情况", "时长", "监管"]
    priority = 25

    async def execute(self, context: SkillContext) -> SkillResult:
        return SkillResult(
            success=True,
            response="正在汇总学生学情数据...",
            data={"parent_mode": True, "report_type": "parent_overview"},
            skill_name=self.name,
        )
