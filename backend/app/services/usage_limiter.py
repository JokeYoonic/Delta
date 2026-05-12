import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import User, StudyDailyLog

logger = logging.getLogger(__name__)

FREE_TIER_LIMITS = {
    "chat_messages": 30,
    "speaking_sessions": 5,
    "exam_attempts": 3,
    "classroom_sessions": 3,
    "ocr_uses": 10,
}

PRO_TIER_LIMITS = {
    "chat_messages": -1,
    "speaking_sessions": -1,
    "exam_attempts": -1,
    "classroom_sessions": -1,
    "ocr_uses": -1,
}

PREMIUM_TIER_LIMITS = {
    "chat_messages": -1,
    "speaking_sessions": -1,
    "exam_attempts": -1,
    "classroom_sessions": -1,
    "ocr_uses": -1,
}

TIER_LIMITS = {
    "free": FREE_TIER_LIMITS,
    "pro": PRO_TIER_LIMITS,
    "premium": PREMIUM_TIER_LIMITS,
}


class UsageLimiter:
    def _get_limits(self, tier: str) -> dict:
        return TIER_LIMITS.get(tier, FREE_TIER_LIMITS)

    async def check_limit(
        self,
        user_id: str,
        feature: str,
        db: AsyncSession,
        user: Optional[User] = None,
    ) -> dict:
        if not user:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
        if not user:
            return {"allowed": False, "reason": "用户不存在", "limit": 0, "used": 0}

        tier = user.subscription_tier or "free"
        limits = self._get_limits(tier)
        limit = limits.get(feature, -1)

        if limit == -1:
            return {"allowed": True, "reason": "", "limit": -1, "used": 0, "tier": tier}

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        result = await db.execute(
            select(StudyDailyLog).where(
                StudyDailyLog.user_id == user_id,
                StudyDailyLog.date == today,
            )
        )
        log = result.scalar_one_or_none()

        used = 0
        if log:
            usage_map = {
                "chat_messages": log.conversations_count,
                "speaking_sessions": (log.subjects_data or {}).get("speaking_count", 0),
                "exam_attempts": log.exam_count,
                "classroom_sessions": (log.subjects_data or {}).get("classroom_count", 0),
                "ocr_uses": (log.subjects_data or {}).get("ocr_count", 0),
            }
            used = usage_map.get(feature, 0)

        allowed = used < limit
        remaining = max(limit - used, 0)

        return {
            "allowed": allowed,
            "reason": "" if allowed else f"今日{feature}使用已达上限({limit}次)，升级Pro可无限使用",
            "limit": limit,
            "used": used,
            "remaining": remaining,
            "tier": tier,
        }

    async def increment_usage(
        self,
        user_id: str,
        feature: str,
        db: AsyncSession,
    ) -> None:
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

        count_keys = {
            "speaking_sessions": "speaking_count",
            "classroom_sessions": "classroom_count",
            "ocr_uses": "ocr_count",
        }

        if feature == "chat_messages":
            log.conversations_count += 1
        elif feature == "exam_attempts":
            log.exam_count += 1
        elif feature in count_keys:
            subjects_data = dict(log.subjects_data or {})
            key = count_keys[feature]
            subjects_data[key] = subjects_data.get(key, 0) + 1
            log.subjects_data = subjects_data

        await db.flush()
        logger.info(f"Incremented {feature} usage for user {user_id}")


usage_limiter = UsageLimiter()
