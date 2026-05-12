import json
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import User, ChatMessage, Conversation
from app.models.memory import StudentProfile


class MemoryEvolutionEngine:

    async def _get_or_create_profile(self, user_id: str, db: AsyncSession) -> StudentProfile:
        result = await db.execute(
            select(StudentProfile).where(StudentProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            profile = StudentProfile(
                user_id=user_id,
                total_interactions=0,
                subjects_engaged=[],
                weak_areas=[],
                strong_areas=[],
                preferred_learning_style="visual",
                avg_session_duration=0.0,
                mastery_trend=[],
            )
            db.add(profile)
            await db.flush()
        return profile

    async def update_student_profile(
        self,
        user_id: str,
        interaction_data: dict,
        db: AsyncSession,
    ) -> dict:
        profile = await self._get_or_create_profile(user_id, db)

        profile.total_interactions += 1
        subjects = list(profile.subjects_engaged or [])
        if interaction_data.get("subject") and interaction_data["subject"] not in subjects:
            subjects.append(interaction_data["subject"])
        profile.subjects_engaged = subjects

        weak = list(profile.weak_areas or [])
        strong = list(profile.strong_areas or [])
        if interaction_data.get("is_correct") is False:
            for kp in interaction_data.get("knowledge_points", []):
                if kp not in weak:
                    weak.append(kp)
        elif interaction_data.get("is_correct") is True:
            for kp in interaction_data.get("knowledge_points", []):
                if kp in weak:
                    weak.remove(kp)
                if kp not in strong:
                    strong.append(kp)
        profile.weak_areas = weak
        profile.strong_areas = strong

        profile.last_active = datetime.now(timezone.utc)
        await db.flush()

        return {
            "total_interactions": profile.total_interactions,
            "subjects_engaged": profile.subjects_engaged,
            "weak_areas": profile.weak_areas,
            "strong_areas": profile.strong_areas,
            "preferred_learning_style": profile.preferred_learning_style,
            "avg_session_duration": profile.avg_session_duration,
            "mastery_trend": profile.mastery_trend,
            "last_active": profile.last_active.isoformat() if profile.last_active else None,
        }

    async def get_proactive_suggestion(self, user_id: str, db: AsyncSession) -> Optional[dict]:
        result = await db.execute(
            select(StudentProfile).where(StudentProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            return None

        suggestions = []

        if profile.weak_areas:
            weak = list(profile.weak_areas)
            suggestions.append({
                "type": "review_reminder",
                "message": f"你有{len(weak)}个薄弱知识点需要复习",
                "data": {"weak_areas": weak[:5]},
            })

        if profile.total_interactions > 0 and profile.total_interactions % 10 == 0:
            suggestions.append({
                "type": "milestone",
                "message": f"你已完成{profile.total_interactions}次学习互动，继续加油！",
                "data": {},
            })

        return suggestions[0] if suggestions else None

    async def reflect_on_history(
        self,
        user_id: str,
        db: AsyncSession,
        limit: int = 50,
    ) -> dict:
        result = await db.execute(
            select(ChatMessage)
            .join(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        messages = result.scalars().all()

        if not messages:
            return {"patterns": [], "insights": []}

        user_messages = [m for m in messages if m.role == "user"]
        subjects_mentioned = {}
        question_types = {"factual": 0, "procedural": 0, "conceptual": 0}

        for msg in user_messages:
            content = msg.content.lower()
            for keyword, subject in [
                ("方程", "数学"), ("函数", "数学"), ("几何", "数学"),
                ("语法", "英语"), ("单词", "英语"), ("阅读", "英语"),
                ("古文", "语文"), ("作文", "语文"), ("诗词", "语文"),
                ("力学", "物理"), ("电路", "物理"),
                ("元素", "化学"), ("反应", "化学"),
            ]:
                if keyword in content:
                    subjects_mentioned[subject] = subjects_mentioned.get(subject, 0) + 1

            if any(kw in content for kw in ["怎么做", "步骤", "方法"]):
                question_types["procedural"] += 1
            elif any(kw in content for kw in ["为什么", "原理", "原因"]):
                question_types["conceptual"] += 1
            else:
                question_types["factual"] += 1

        dominant_subject = max(subjects_mentioned, key=subjects_mentioned.get) if subjects_mentioned else "未知"
        dominant_q_type = max(question_types, key=question_types.get)

        return {
            "patterns": [
                f"最常学习的科目：{dominant_subject}",
                f"提问类型偏好：{dominant_q_type}",
            ],
            "insights": [
                f"共{len(user_messages)}条学习记录",
                f"涉及{len(subjects_mentioned)}个科目",
            ],
            "subjects_mentioned": subjects_mentioned,
            "question_types": question_types,
        }


memory_engine = MemoryEvolutionEngine()
