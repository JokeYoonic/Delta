import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import StudyDailyLog

logger = logging.getLogger(__name__)


class StudyTracker:
    async def _get_today_log(
        self,
        user_id: str,
        db: AsyncSession,
    ) -> StudyDailyLog:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        result = await db.execute(
            select(StudyDailyLog).where(
                StudyDailyLog.user_id == user_id,
                StudyDailyLog.date == today,
            )
        )
        log = result.scalar_one_or_none()
        if not log:
            log = StudyDailyLog(
                user_id=user_id,
                date=today,
                study_time=0,
                questions_answered=0,
                questions_correct=0,
                conversations_count=0,
                exam_count=0,
                subjects_data={},
            )
            db.add(log)
            await db.flush()
        return log

    async def track_chat_interaction(
        self,
        user_id: str,
        db: AsyncSession,
        subject: str = "",
        duration_seconds: int = 0,
    ) -> dict:
        log = await self._get_today_log(user_id, db)
        log.conversations_count += 1
        if duration_seconds > 0:
            log.study_time += duration_seconds
        subjects_data = dict(log.subjects_data or {})
        if subject:
            subjects_data[subject] = subjects_data.get(subject, 0) + 1
        log.subjects_data = subjects_data
        await db.flush()
        logger.info(f"Tracked chat interaction for user {user_id}: conversations={log.conversations_count}")
        return {
            "date": log.date,
            "conversations_count": log.conversations_count,
            "study_time": log.study_time,
        }

    async def track_question_answered(
        self,
        user_id: str,
        db: AsyncSession,
        is_correct: bool = False,
        subject: str = "",
        duration_seconds: int = 0,
    ) -> dict:
        log = await self._get_today_log(user_id, db)
        log.questions_answered += 1
        if is_correct:
            log.questions_correct += 1
        if duration_seconds > 0:
            log.study_time += duration_seconds
        subjects_data = dict(log.subjects_data or {})
        if subject:
            subjects_data[subject] = subjects_data.get(subject, 0) + 1
        log.subjects_data = subjects_data
        await db.flush()
        logger.info(f"Tracked question for user {user_id}: answered={log.questions_answered}, correct={log.questions_correct}")
        return {
            "date": log.date,
            "questions_answered": log.questions_answered,
            "questions_correct": log.questions_correct,
        }

    async def track_exam_completed(
        self,
        user_id: str,
        db: AsyncSession,
        subject: str = "",
        score: int = 0,
        total_score: int = 100,
        correct_count: int = 0,
        wrong_count: int = 0,
        duration_seconds: int = 0,
    ) -> dict:
        log = await self._get_today_log(user_id, db)
        log.exam_count += 1
        log.questions_answered += correct_count + wrong_count
        log.questions_correct += correct_count
        if duration_seconds > 0:
            log.study_time += duration_seconds
        subjects_data = dict(log.subjects_data or {})
        if subject:
            exam_key = f"{subject}_exam"
            subjects_data[exam_key] = subjects_data.get(exam_key, 0) + 1
        log.subjects_data = subjects_data
        await db.flush()
        logger.info(f"Tracked exam for user {user_id}: exams={log.exam_count}, score={score}/{total_score}")
        return {
            "date": log.date,
            "exam_count": log.exam_count,
            "questions_answered": log.questions_answered,
            "questions_correct": log.questions_correct,
        }

    async def track_speaking_session(
        self,
        user_id: str,
        db: AsyncSession,
        duration_seconds: int = 0,
        subject: str = "英语",
    ) -> dict:
        log = await self._get_today_log(user_id, db)
        log.conversations_count += 1
        if duration_seconds > 0:
            log.study_time += duration_seconds
        subjects_data = dict(log.subjects_data or {})
        speaking_key = f"{subject}_speaking"
        subjects_data[speaking_key] = subjects_data.get(speaking_key, 0) + 1
        log.subjects_data = subjects_data
        await db.flush()
        logger.info(f"Tracked speaking session for user {user_id}: conversations={log.conversations_count}")
        return {
            "date": log.date,
            "conversations_count": log.conversations_count,
            "study_time": log.study_time,
        }

    async def track_classroom_session(
        self,
        user_id: str,
        db: AsyncSession,
        subject: str = "",
        duration_seconds: int = 0,
    ) -> dict:
        log = await self._get_today_log(user_id, db)
        log.conversations_count += 1
        if duration_seconds > 0:
            log.study_time += duration_seconds
        subjects_data = dict(log.subjects_data or {})
        if subject:
            classroom_key = f"{subject}_classroom"
            subjects_data[classroom_key] = subjects_data.get(classroom_key, 0) + 1
        log.subjects_data = subjects_data
        await db.flush()
        logger.info(f"Tracked classroom session for user {user_id}: conversations={log.conversations_count}")
        return {
            "date": log.date,
            "conversations_count": log.conversations_count,
            "study_time": log.study_time,
        }

    async def track_study_time(
        self,
        user_id: str,
        db: AsyncSession,
        duration_seconds: int,
        subject: str = "",
    ) -> dict:
        log = await self._get_today_log(user_id, db)
        log.study_time += duration_seconds
        subjects_data = dict(log.subjects_data or {})
        if subject:
            time_key = f"{subject}_time"
            subjects_data[time_key] = subjects_data.get(time_key, 0) + duration_seconds
        log.subjects_data = subjects_data
        await db.flush()
        return {
            "date": log.date,
            "study_time": log.study_time,
        }

    async def get_today_stats(
        self,
        user_id: str,
        db: AsyncSession,
    ) -> dict:
        log = await self._get_today_log(user_id, db)
        return {
            "date": log.date,
            "study_time": log.study_time,
            "questions_answered": log.questions_answered,
            "questions_correct": log.questions_correct,
            "conversations_count": log.conversations_count,
            "exam_count": log.exam_count,
            "subjects_data": log.subjects_data,
        }

    async def get_streak_days(
        self,
        user_id: str,
        db: AsyncSession,
    ) -> int:
        result = await db.execute(
            select(StudyDailyLog)
            .where(StudyDailyLog.user_id == user_id)
            .order_by(StudyDailyLog.date.desc())
            .limit(365)
        )
        logs = list(result.scalars().all())
        if not logs:
            return 0

        streak = 0
        today = datetime.now(timezone.utc).date()
        for log in logs:
            log_date = datetime.strptime(log.date, "%Y-%m-%d").date()
            expected = today - timedelta(days=streak)
            if log_date == expected and (log.study_time > 0 or log.conversations_count > 0):
                streak += 1
            else:
                break
        return streak


study_tracker = StudyTracker()
