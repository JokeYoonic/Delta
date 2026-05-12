from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, KnowledgePoint
from app.services.sm2_scheduler import sm2_scheduler

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("/due-reviews")
async def get_due_reviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KnowledgePoint).where(KnowledgePoint.user_id == current_user.id)
    )
    all_kps = list(result.scalars().all())
    due = sm2_scheduler.get_due_knowledge_points(all_kps)
    return {
        "due_count": len(due),
        "knowledge_points": [
            {
                "id": kp.id,
                "name": kp.name,
                "subject": kp.subject,
                "chapter": kp.chapter,
                "mastery": kp.mastery,
                "difficulty": kp.difficulty,
            }
            for kp in due
        ],
    }


@router.post("/review/{kp_id}")
async def submit_review(
    kp_id: str,
    quality: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KnowledgePoint).where(KnowledgePoint.id == kp_id, KnowledgePoint.user_id == current_user.id)
    )
    kp = result.scalar_one_or_none()
    if not kp:
        return {"error": "Knowledge point not found"}

    update = sm2_scheduler.evaluate(kp, quality)

    kp.easiness_factor = update["easiness_factor"]
    kp.interval_days = update["interval_days"]
    kp.review_count = update["review_count"]
    kp.next_review = update["next_review"]
    kp.mastery = update["mastery"]
    await db.flush()
    await db.refresh(kp)

    return {
        "id": kp.id,
        "mastery": kp.mastery,
        "easiness_factor": kp.easiness_factor,
        "interval_days": kp.interval_days,
        "next_review": kp.next_review.isoformat() if kp.next_review else None,
    }


@router.get("/adaptive-questions")
async def get_adaptive_questions(
    target_count: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KnowledgePoint).where(KnowledgePoint.user_id == current_user.id)
    )
    all_kps = list(result.scalars().all())
    questions = sm2_scheduler.get_difficulty_adjusted_questions(all_kps, target_count)
    return {"questions": questions}
