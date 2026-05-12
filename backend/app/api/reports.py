from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, StudyDailyLog, ExamResult, KnowledgePoint
from app.schemas import StudyReportResponse
from app.services.study_tracker import study_tracker

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/study", response_model=StudyReportResponse)
async def get_study_report(
    period: str = "week",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StudyDailyLog)
        .where(StudyDailyLog.user_id == current_user.id)
        .order_by(StudyDailyLog.date.desc())
        .limit(30)
    )
    logs = list(result.scalars().all())

    if period == "day":
        logs = logs[:1]
    elif period == "week":
        logs = logs[:7]
    elif period == "month":
        logs = logs[:30]

    total_study_time = sum(log.study_time for log in logs)
    total_questions = sum(log.questions_answered for log in logs)
    total_correct = sum(log.questions_correct for log in logs)
    total_conversations = sum(log.conversations_count for log in logs)
    total_exams = sum(log.exam_count for log in logs)
    avg_correct_rate = (total_correct / total_questions * 100) if total_questions > 0 else 0

    exam_result = await db.execute(
        select(ExamResult)
        .where(ExamResult.user_id == current_user.id)
        .order_by(ExamResult.created_at.desc())
        .limit(10)
    )
    exams = list(exam_result.scalars().all())
    avg_score = (sum(e.score for e in exams) / len(exams)) if exams else 0

    kp_result = await db.execute(
        select(KnowledgePoint)
        .where(KnowledgePoint.user_id == current_user.id)
        .order_by(KnowledgePoint.mastery.asc())
    )
    knowledge_points = list(kp_result.scalars().all())

    subject_mastery = {}
    for kp in knowledge_points:
        if kp.subject not in subject_mastery:
            subject_mastery[kp.subject] = {"total": 0, "mastery_sum": 0}
        subject_mastery[kp.subject]["total"] += 1
        subject_mastery[kp.subject]["mastery_sum"] += kp.mastery

    subject_mastery_list = [
        {
            "subject": subj,
            "average_mastery": data["mastery_sum"] / data["total"] if data["total"] > 0 else 0,
            "total_points": data["total"],
        }
        for subj, data in subject_mastery.items()
    ]

    knowledge_gaps = [
        kp.name for kp in knowledge_points if kp.mastery < 60
    ][:10]

    trend = [
        {
            "date": log.date,
            "study_time": log.study_time,
            "questions_answered": log.questions_answered,
            "correct_rate": (log.questions_correct / log.questions_answered * 100) if log.questions_answered > 0 else 0,
        }
        for log in reversed(logs)
    ]

    return StudyReportResponse(
        period=period,
        study_time=total_study_time,
        questions_answered=total_questions,
        questions_correct=total_correct,
        conversations_count=total_conversations,
        exam_count=total_exams,
        average_score=avg_score,
        subject_mastery=subject_mastery_list,
        knowledge_gaps=knowledge_gaps,
        trend=trend,
    )


@router.get("/today")
async def get_today_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stats = await study_tracker.get_today_stats(current_user.id, db)
    streak = await study_tracker.get_streak_days(current_user.id, db)

    if streak != current_user.streak_days:
        current_user.streak_days = streak
        await db.flush()

    return {
        **stats,
        "streak_days": streak,
    }
