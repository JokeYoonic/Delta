import json
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db, async_session
from app.core.security import get_current_user
from app.models import User, ParentStudentRelation, FamilyChat, StudyDailyLog
from app.services import ai_tutor_engine

router = APIRouter(prefix="/parent", tags=["parent"])


class LinkStudentRequest(BaseModel):
    student_email: str
    relation_type: str = "parent"


class FamilyMessageRequest(BaseModel):
    student_id: str
    content: str


class NotifySettingsRequest(BaseModel):
    relation_id: str
    settings: dict


@router.get("/students")
async def list_linked_students(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")

    result = await db.execute(
        select(ParentStudentRelation, User).join(
            User, ParentStudentRelation.student_id == User.id
        ).where(
            ParentStudentRelation.parent_id == current_user.id,
            ParentStudentRelation.is_active == True,
        )
    )
    rows = result.all()

    students = []
    for rel, student in rows:
        today_result = await db.execute(
            select(StudyDailyLog).where(
                StudyDailyLog.user_id == student.id,
            ).order_by(StudyDailyLog.date.desc()).limit(1)
        )
        latest_log = today_result.scalar_one_or_none()

        students.append({
            "relation_id": rel.id,
            "student_id": student.id,
            "name": student.name,
            "grade": student.grade,
            "avatar": student.avatar,
            "streak_days": student.streak_days,
            "relation_type": rel.relation_type,
            "today_study_time": latest_log.study_time if latest_log else 0,
            "today_questions": latest_log.questions_answered if latest_log else 0,
        })

    return students


@router.post("/link")
async def link_student(
    data: LinkStudentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can link students")

    student_result = await db.execute(
        select(User).where(User.email == data.student_email)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    existing = await db.execute(
        select(ParentStudentRelation).where(
            ParentStudentRelation.parent_id == current_user.id,
            ParentStudentRelation.student_id == student.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already linked")

    relation = ParentStudentRelation(
        parent_id=current_user.id,
        student_id=student.id,
        relation_type=data.relation_type,
        notify_settings={"daily_report": True, "low_score_alert": True, "streak_alert": True},
    )
    db.add(relation)
    await db.flush()
    await db.refresh(relation)

    return {
        "id": relation.id,
        "student_name": student.name,
        "relation_type": relation.relation_type,
    }


@router.delete("/link/{relation_id}")
async def unlink_student(
    relation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ParentStudentRelation).where(
            ParentStudentRelation.id == relation_id,
            ParentStudentRelation.parent_id == current_user.id,
        )
    )
    relation = result.scalar_one_or_none()
    if not relation:
        raise HTTPException(status_code=404, detail="Relation not found")

    relation.is_active = False
    await db.flush()
    return {"unlinked": True}


@router.get("/student/{student_id}/report")
async def get_student_report(
    student_id: str,
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rel_result = await db.execute(
        select(ParentStudentRelation).where(
            ParentStudentRelation.parent_id == current_user.id,
            ParentStudentRelation.student_id == student_id,
            ParentStudentRelation.is_active == True,
        )
    )
    if not rel_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not authorized for this student")

    log_result = await db.execute(
        select(StudyDailyLog).where(
            StudyDailyLog.user_id == student_id,
        ).order_by(StudyDailyLog.date.desc()).limit(days)
    )
    logs = log_result.scalars().all()

    student_result = await db.execute(select(User).where(User.id == student_id))
    student = student_result.scalar_one_or_none()

    return {
        "student_name": student.name if student else "",
        "grade": student.grade if student else "",
        "streak_days": student.streak_days if student else 0,
        "daily_logs": [
            {
                "date": log.date,
                "study_time": log.study_time,
                "questions_answered": log.questions_answered,
                "questions_correct": log.questions_correct,
                "conversations_count": log.conversations_count,
                "exam_count": log.exam_count,
            }
            for log in logs
        ],
        "total_study_time": sum(l.study_time for l in logs),
        "total_questions": sum(l.questions_answered for l in logs),
        "avg_accuracy": (
            sum(l.questions_correct for l in logs) / max(sum(l.questions_answered for l in logs), 1) * 100
        ),
    }


@router.get("/family-chat/{student_id}")
async def get_family_chat(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rel_result = await db.execute(
        select(ParentStudentRelation).where(
            ParentStudentRelation.parent_id == current_user.id,
            ParentStudentRelation.student_id == student_id,
            ParentStudentRelation.is_active == True,
        )
    )
    if not rel_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(FamilyChat).where(
            FamilyChat.parent_id == current_user.id,
            FamilyChat.student_id == student_id,
        ).order_by(FamilyChat.created_at.desc()).limit(50)
    )
    messages = result.scalars().all()

    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "ai_summary": m.ai_summary,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in reversed(messages)
    ]


@router.post("/family-chat")
async def send_family_message(
    data: FamilyMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rel_result = await db.execute(
        select(ParentStudentRelation).where(
            ParentStudentRelation.parent_id == current_user.id,
            ParentStudentRelation.student_id == data.student_id,
            ParentStudentRelation.is_active == True,
        )
    )
    if not rel_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not authorized")

    msg = FamilyChat(
        parent_id=current_user.id,
        student_id=data.student_id,
        role="parent",
        content=data.content,
    )
    db.add(msg)
    await db.flush()
    await db.refresh(msg)

    try:
        summary = await ai_tutor_engine.chat(
            messages=[{"role": "user", "content": f"请用一句话总结家长这条消息的要点：{data.content}"}],
            tutor_config=None,
            use_rag=False,
        )
        msg.ai_summary = summary.strip()[:200]
        await db.flush()
    except Exception:
        pass

    return {
        "id": msg.id,
        "role": msg.role,
        "content": msg.content,
        "ai_summary": msg.ai_summary,
    }


@router.patch("/notify-settings")
async def update_notify_settings(
    data: NotifySettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ParentStudentRelation).where(
            ParentStudentRelation.id == data.relation_id,
            ParentStudentRelation.parent_id == current_user.id,
        )
    )
    relation = result.scalar_one_or_none()
    if not relation:
        raise HTTPException(status_code=404, detail="Relation not found")

    current_settings = dict(relation.notify_settings or {})
    current_settings.update(data.settings)
    relation.notify_settings = current_settings
    await db.flush()

    return {"notify_settings": relation.notify_settings}
