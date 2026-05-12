from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models import User
from app.skills import skill_registry, SkillContext

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("")
async def list_skills():
    return skill_registry.list_skills()


@router.post("/dispatch")
async def dispatch_skill(
    message: str,
    subject: str = "",
    current_user: User = Depends(get_current_user),
):
    context = SkillContext(
        user_id=current_user.id,
        message=message,
        subject=subject,
        grade=current_user.grade,
        user_role=current_user.role,
    )
    result = await skill_registry.dispatch(context)
    if result is None:
        return {"dispatched": False, "message": "No matching skill found"}
    return {
        "dispatched": True,
        "skill": result.skill_name,
        "response": result.response,
        "data": result.data,
        "success": result.success,
    }


@router.post("/execute/{skill_name}")
async def execute_skill(
    skill_name: str,
    message: str,
    subject: str = "",
    current_user: User = Depends(get_current_user),
):
    context = SkillContext(
        user_id=current_user.id,
        message=message,
        subject=subject,
        grade=current_user.grade,
        user_role=current_user.role,
    )
    result = await skill_registry.execute_skill(skill_name, context)
    if result is None:
        return {"executed": False, "message": f"Skill '{skill_name}' not found"}
    return {
        "executed": True,
        "skill": result.skill_name,
        "response": result.response,
        "data": result.data,
        "success": result.success,
    }
