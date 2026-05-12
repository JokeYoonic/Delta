from pydantic import BaseModel
from typing import Optional
from enum import Enum


class AgentRole(str, Enum):
    STRICT_TEACHER = "strict"
    GENTLE_SENIOR = "gentle"
    PEER_COMPANION = "peer"
    FOREIGN_TUTOR = "foreign"
    MASTER = "master"


class AgentConfig(BaseModel):
    role: AgentRole
    name: str
    persona: str
    voice_provider: str = "kokoro"
    voice_id: str = "z"
    voice_speed: float = 1.0
    triggers: list[str] = []
    skills: list[str] = []


AGENT_CONFIGS: dict[AgentRole, AgentConfig] = {
    AgentRole.STRICT_TEACHER: AgentConfig(
        role=AgentRole.STRICT_TEACHER,
        name="严厉老师",
        persona="你是一位严格的中学老师，直接指出学生的错误，要求精确和严谨。你不会放过任何细节错误，但批评后会给出清晰的改进方向。你的目标是让学生养成严谨的学习习惯。",
        voice_provider="kokoro",
        voice_id="z",
        voice_speed=1.0,
        triggers=["考试模式", "正式测评", "严格"],
        skills=["考试", "批改"],
    ),
    AgentRole.GENTLE_SENIOR: AgentConfig(
        role=AgentRole.GENTLE_SENIOR,
        name="温柔学姐",
        persona="你是一位温柔耐心的学姐，总是鼓励学生，循序渐进地引导。即使学生犯了错误，你也会先肯定他们的尝试，然后温和地指出可以改进的地方。你善于用生活化的类比帮助理解。",
        voice_provider="kokoro",
        voice_id="z",
        voice_speed=0.9,
        triggers=["基础薄弱", "需要鼓励", "温柔"],
        skills=["答疑", "教材"],
    ),
    AgentRole.PEER_COMPANION: AgentConfig(
        role=AgentRole.PEER_COMPANION,
        name="同龄学伴",
        persona="你是一个和用户同龄的学习伙伴，平等交流，共同探讨问题。你不会居高临下地教导，而是以'我们一起看看'的态度合作学习。你偶尔也会说自己也不太确定，需要一起查资料。",
        voice_provider="kokoro",
        voice_id="a",
        voice_speed=1.0,
        triggers=["轻松", "讨论", "一起"],
        skills=["答疑", "口语"],
    ),
    AgentRole.FOREIGN_TUTOR: AgentConfig(
        role=AgentRole.FOREIGN_TUTOR,
        name="外教",
        persona="You are a native English-speaking tutor. You conduct conversations primarily in English, providing cultural context and authentic expressions. You gently correct pronunciation and grammar while encouraging the student to express themselves freely.",
        voice_provider="edge-tts",
        voice_id="en-US-GuyNeural",
        voice_speed=0.9,
        triggers=["英语", "English", "口语"],
        skills=["口语"],
    ),
    AgentRole.MASTER: AgentConfig(
        role=AgentRole.MASTER,
        name="主控Agent",
        persona="你是智学伴的主控调度Agent，负责根据学生的状态和场景自动选择最合适的教学角色。你分析学生的年级、当前学习状态、问题类型，然后调度对应的专业Agent。",
        triggers=[],
        skills=["答疑", "考试", "教材", "口语", "学情", "家长", "课堂"],
    ),
}


class AgentDispatcher:
    def __init__(self):
        self.agents = AGENT_CONFIGS

    def select_agent(
        self,
        student_level: str = "medium",
        scenario: str = "qa",
        user_preference: str = "",
    ) -> AgentConfig:
        if user_preference and user_preference in self.agents:
            return self.agents[AgentRole(user_preference)]

        if scenario == "exam":
            return self.agents[AgentRole.STRICT_TEACHER]
        if scenario == "oral" or scenario == "speaking":
            return self.agents[AgentRole.FOREIGN_TUTOR]
        if student_level in ("weak", "beginner", "基础"):
            return self.agents[AgentRole.GENTLE_SENIOR]
        if scenario == "casual" or scenario == "discussion":
            return self.agents[AgentRole.PEER_COMPANION]

        return self.agents[AgentRole.GENTLE_SENIOR]

    def get_agent(self, role: str) -> Optional[AgentConfig]:
        try:
            return self.agents[AgentRole(role)]
        except ValueError:
            return None

    def list_agents(self) -> list[dict]:
        return [
            {
                "role": agent.role.value,
                "name": agent.name,
                "persona_preview": agent.persona[:50] + "...",
                "voice_provider": agent.voice_provider,
                "voice_id": agent.voice_id,
                "triggers": agent.triggers,
                "skills": agent.skills,
            }
            for agent in self.agents.values()
        ]


agent_dispatcher = AgentDispatcher()
