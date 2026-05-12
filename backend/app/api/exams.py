from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, ExamResult
from app.schemas import ExamSubmitRequest, ExamResultResponse
from app.services.study_tracker import study_tracker

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("/results", response_model=list[ExamResultResponse])
async def list_exam_results(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExamResult)
        .where(ExamResult.user_id == current_user.id)
        .order_by(ExamResult.created_at.desc())
    )
    exams = result.scalars().all()
    return [ExamResultResponse.model_validate(e) for e in exams]


@router.post("/results", response_model=ExamResultResponse)
async def submit_exam_result(
    data: ExamSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exam = ExamResult(
        user_id=current_user.id,
        exam_title=data.exam_title,
        exam_type=data.exam_type,
        subject=data.subject,
        score=data.score,
        total_score=data.total_score,
        correct_count=data.correct_count,
        wrong_count=data.wrong_count,
        time_used=data.time_used,
        knowledge_mastery=data.knowledge_mastery,
        wrong_questions=data.wrong_questions,
        suggestions=data.suggestions,
    )
    db.add(exam)
    await db.flush()
    await db.refresh(exam)

    try:
        await study_tracker.track_exam_completed(
            user_id=current_user.id,
            db=db,
            subject=data.subject,
            score=data.score,
            total_score=data.total_score,
            correct_count=data.correct_count,
            wrong_count=data.wrong_count,
            duration_seconds=data.time_used,
        )
    except Exception:
        pass

    return ExamResultResponse.model_validate(exam)


@router.get("/results/{exam_id}", response_model=ExamResultResponse)
async def get_exam_result(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExamResult).where(ExamResult.id == exam_id, ExamResult.user_id == current_user.id)
    )
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam result not found")
    return ExamResultResponse.model_validate(exam)
