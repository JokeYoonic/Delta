from app.skills.base import ZhixuebanSkill, SkillContext, SkillResult
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class SkillRegistry:
    def __init__(self):
        self._skills: dict[str, ZhixuebanSkill] = {}

    def register(self, skill: ZhixuebanSkill):
        self._skills[skill.name] = skill
        logger.info(f"Skill registered: {skill.name} (priority={skill.priority})")

    def unregister(self, name: str):
        if name in self._skills:
            del self._skills[name]

    def get(self, name: str) -> Optional[ZhixuebanSkill]:
        return self._skills.get(name)

    def list_skills(self) -> list[dict]:
        return [skill.to_dict() for skill in sorted(self._skills.values(), key=lambda s: s.priority)]

    async def dispatch(self, context: SkillContext) -> Optional[SkillResult]:
        candidates = []
        for skill in self._skills.values():
            if await skill.validate(context):
                candidates.append(skill)

        if not candidates:
            return None

        candidates.sort(key=lambda s: s.priority, reverse=True)
        best_skill = candidates[0]
        logger.info(f"Dispatching to skill: {best_skill.name}")
        return await best_skill.execute(context)

    async def execute_skill(self, name: str, context: SkillContext) -> Optional[SkillResult]:
        skill = self._skills.get(name)
        if not skill:
            return None
        return await skill.execute(context)


skill_registry = SkillRegistry()


def auto_load_skills():
    from app.skills.qa_skill import QASkill
    from app.skills.exam_skill import ExamSkill
    from app.skills.textbook_skill import TextbookSkill
    from app.skills.oral_skill import OralSkill
    from app.skills.study_report_skill import StudyReportSkill
    from app.skills.parent_skill import ParentSkill
    from app.skills.classroom_skill import ClassroomSkill

    for skill_cls in [QASkill, ExamSkill, TextbookSkill, OralSkill, StudyReportSkill, ParentSkill, ClassroomSkill]:
        skill_registry.register(skill_cls())

    logger.info(f"Auto-loaded {len(skill_registry._skills)} skills: {list(skill_registry._skills.keys())}")
