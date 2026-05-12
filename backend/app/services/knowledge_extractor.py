import json
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import KnowledgePoint
from app.services import ai_tutor_engine

logger = logging.getLogger(__name__)

EXTRACT_PROMPT = """分析以下学习对话，提取其中涉及的知识点。

用户问题：{user_message}
AI回答：{ai_response}
科目：{subject}

请以JSON格式返回提取的知识点列表：
[
  {{
    "name": "知识点名称（简洁明确）",
    "description": "知识点简要描述",
    "difficulty": "easy/medium/hard",
    "chapter": "所属章节（如无法确定则留空）"
  }}
]

只返回JSON，不要其他内容。如果没有明确的知识点，返回空数组 []。"""


class KnowledgeExtractor:
    async def extract_from_conversation(
        self,
        user_id: str,
        user_message: str,
        ai_response: str,
        subject: str,
        db: AsyncSession,
    ) -> list[dict]:
        try:
            prompt = EXTRACT_PROMPT.format(
                user_message=user_message,
                ai_response=ai_response[:1000],
                subject=subject or "综合",
            )

            result = await ai_tutor_engine.chat(
                messages=[{"role": "user", "content": prompt}],
                tutor_config=None,
                use_rag=False,
            )

            json_str = result.strip()
            if json_str.startswith("```"):
                json_str = json_str.split("\n", 1)[1].rsplit("```", 1)[0]

            knowledge_items = json.loads(json_str)
            if not isinstance(knowledge_items, list):
                return []

            created = []
            for item in knowledge_items[:5]:
                kp = await self._create_or_update_kp(
                    user_id=user_id,
                    name=item.get("name", ""),
                    description=item.get("description", ""),
                    subject=subject or "综合",
                    chapter=item.get("chapter", ""),
                    difficulty=item.get("difficulty", "medium"),
                    db=db,
                )
                if kp:
                    created.append({
                        "id": kp.id,
                        "name": kp.name,
                        "mastery": kp.mastery,
                        "is_new": kp.review_count == 0,
                    })

            return created

        except (json.JSONDecodeError, IndexError, Exception) as e:
            logger.warning(f"Failed to extract knowledge points: {e}")
            return []

    async def _create_or_update_kp(
        self,
        user_id: str,
        name: str,
        description: str,
        subject: str,
        chapter: str,
        difficulty: str,
        db: AsyncSession,
    ) -> Optional[KnowledgePoint]:
        if not name or len(name) < 2:
            return None

        result = await db.execute(
            select(KnowledgePoint).where(
                KnowledgePoint.user_id == user_id,
                KnowledgePoint.name == name,
                KnowledgePoint.subject == subject,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            if description and description != existing.description:
                existing.description = description
            existing.related_questions += 1
            await db.flush()
            return existing

        kp = KnowledgePoint(
            user_id=user_id,
            name=name,
            description=description,
            subject=subject,
            chapter=chapter,
            difficulty=difficulty,
            mastery=0,
            related_questions=1,
            review_count=0,
            next_review=None,
            easiness_factor=2.5,
            interval_days=1,
        )
        db.add(kp)
        await db.flush()
        logger.info(f"Created knowledge point: {name} for user {user_id}")
        return kp


knowledge_extractor = KnowledgeExtractor()
