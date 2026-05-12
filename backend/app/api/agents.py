from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models import User
from app.services.agent_dispatcher import agent_dispatcher

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("")
async def list_agents():
    return agent_dispatcher.list_agents()


@router.post("/select")
async def select_agent(
    student_level: str = "medium",
    scenario: str = "qa",
    preference: str = "",
    current_user: User = Depends(get_current_user),
):
    agent = agent_dispatcher.select_agent(
        student_level=student_level,
        scenario=scenario,
        user_preference=preference,
    )
    return {
        "role": agent.role.value,
        "name": agent.name,
        "persona": agent.persona,
        "voice_provider": agent.voice_provider,
        "voice_id": agent.voice_id,
        "voice_speed": agent.voice_speed,
        "skills": agent.skills,
    }


@router.get("/{role}")
async def get_agent(role: str):
    agent = agent_dispatcher.get_agent(role)
    if not agent:
        return {"error": f"Agent role '{role}' not found"}
    return {
        "role": agent.role.value,
        "name": agent.name,
        "persona": agent.persona,
        "voice_provider": agent.voice_provider,
        "voice_id": agent.voice_id,
        "voice_speed": agent.voice_speed,
        "triggers": agent.triggers,
        "skills": agent.skills,
    }
