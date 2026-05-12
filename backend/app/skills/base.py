from pydantic import BaseModel
from typing import Any, Optional
from abc import ABC, abstractmethod


class SkillContext(BaseModel):
    user_id: str
    message: str
    subject: str = ""
    grade: str = ""
    conversation_history: list[dict] = []
    tutor_config: dict = {}
    user_role: str = "student"
    extra: dict = {}

    model_config = {"arbitrary_types_allowed": True}


class SkillResult(BaseModel):
    success: bool = True
    response: str = ""
    data: dict = {}
    skill_name: str = ""
    should_continue: bool = True
    error: Optional[str] = None


class ZhixuebanSkill(ABC):
    name: str = ""
    description: str = ""
    triggers: list[str] = []
    priority: int = 0

    @abstractmethod
    async def execute(self, context: SkillContext) -> SkillResult:
        pass

    async def validate(self, context: SkillContext) -> bool:
        if not self.triggers:
            return True
        message_lower = context.message.lower()
        return any(trigger.lower() in message_lower for trigger in self.triggers)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "triggers": self.triggers,
            "priority": self.priority,
        }
