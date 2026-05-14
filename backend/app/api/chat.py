import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db, async_session
from app.core.config import settings
from app.core.security import get_current_user, create_access_token
from app.models import User, Conversation, ChatMessage, TutorConfig
from app.services import ai_tutor_engine
from app.services.bifrost_gateway import bifrost_gateway
from app.services.agent_dispatcher import agent_dispatcher
from app.services.study_tracker import study_tracker
from app.services.memory_engine import memory_engine
from app.services.usage_limiter import usage_limiter
from app.services.knowledge_extractor import knowledge_extractor
from app.skills import skill_registry, SkillContext
from app.schemas import ChatMessageResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


def _build_tutor_config_dict(tutor_config_obj: TutorConfig | None) -> dict:
    if not tutor_config_obj:
        return {}
    return {
        "depth": tutor_config_obj.depth,
        "learning_style": tutor_config_obj.learning_style,
        "communication_style": tutor_config_obj.communication_style,
        "tone_style": tutor_config_obj.tone_style,
        "reasoning_framework": tutor_config_obj.reasoning_framework,
        "language": tutor_config_obj.language,
    }


async def _process_chat_message(
    user_content: str,
    history: list[dict],
    tutor_config: dict,
    user_id: str,
    user_role: str,
    agent_role: str | None = None,
) -> tuple[str, dict]:
    context = SkillContext(
        user_id=user_id,
        message=user_content,
        conversation_history=history,
        tutor_config=tutor_config,
        user_role=user_role,
    )

    skill_result = await skill_registry.dispatch(context)

    if skill_result and skill_result.success and skill_result.response:
        response_text = skill_result.response
        extra_data = skill_result.data
    else:
        agent_persona = ""
        if agent_role:
            agent_config = agent_dispatcher.get_agent(agent_role)
            if agent_config:
                agent_persona = agent_config.persona

        if agent_persona:
            system_override = {"agent_persona": agent_persona}
            merged_config = {**tutor_config, **system_override}
        else:
            merged_config = tutor_config

        response_text = await ai_tutor_engine.chat(
            messages=history + [{"role": "user", "content": user_content}],
            tutor_config=merged_config,
            use_rag=True,
        )
        extra_data = {}

    guardrails_result = await bifrost_gateway.check_guardrails(response_text)
    if not guardrails_result.get("safe", True):
        response_text = "抱歉，我无法回答这个问题。请换一个学习相关的问题。"
        extra_data["filtered"] = True

    return response_text, extra_data


@router.post("/completions")
async def chat_completion(
    conversation_id: str,
    content: str,
    agent_role: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        return {"error": "Conversation not found"}

    user_msg = ChatMessage(
        conversation_id=conversation_id,
        role="user",
        content=content,
    )
    db.add(user_msg)
    await db.flush()

    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at)
    )
    messages = [{"role": m.role, "content": m.content} for m in msg_result.scalars().all()]

    config_result = await db.execute(
        select(TutorConfig).where(TutorConfig.user_id == current_user.id)
    )
    tutor_config = _build_tutor_config_dict(config_result.scalar_one_or_none())

    ai_response, extra_data = await _process_chat_message(
        user_content=content,
        history=messages,
        tutor_config=tutor_config,
        user_id=current_user.id,
        user_role=current_user.role,
        agent_role=agent_role,
    )

    ai_msg = ChatMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=ai_response,
    )
    db.add(ai_msg)
    await db.flush()
    await db.refresh(ai_msg)

    try:
        await study_tracker.track_chat_interaction(
            user_id=current_user.id, db=db, subject=conv.subject or "",
        )
    except Exception:
        pass

    try:
        await memory_engine.update_student_profile(
            user_id=current_user.id,
            interaction_data={
                "subject": conv.subject or "",
                "is_correct": None,
                "knowledge_points": [],
            },
            db=db,
        )
    except Exception:
        pass

    return ChatMessageResponse.model_validate(ai_msg)


@router.websocket("/ws/{token}")
async def websocket_chat(websocket: WebSocket, token: str):
    # 开发阶段：跳过鉴权，始终使用超级管理员
    user_id = settings.SUPER_USER_ID
    user_role = settings.SUPER_USER_ROLE

    await websocket.accept()

    conversation_id = None
    tutor_config = {}
    agent_role = None
    chat_subject = ""

    async with async_session() as db:
        config_result = await db.execute(
            select(TutorConfig).where(TutorConfig.user_id == user_id)
        )
        tutor_config = _build_tutor_config_dict(config_result.scalar_one_or_none())

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "init":
                conversation_id = message.get("conversation_id")
                chat_subject = message.get("subject", "")
                if message.get("tutor_config"):
                    tutor_config.update(message["tutor_config"])
                if message.get("agent_role"):
                    agent_role = message["agent_role"]
                continue

            if message.get("type") == "chat":
                user_content = message.get("content", "")
                conversation_id = message.get("conversation_id", conversation_id)
                if message.get("agent_role"):
                    agent_role = message["agent_role"]

                async with async_session() as limit_db:
                    limit_check = await usage_limiter.check_limit(
                        user_id=user_id, feature="chat_messages", db=limit_db,
                    )
                if not limit_check["allowed"]:
                    await websocket.send_json({
                        "type": "error",
                        "message": limit_check["reason"],
                        "code": "usage_limit",
                        "data": {
                            "limit": limit_check["limit"],
                            "used": limit_check["used"],
                            "remaining": limit_check["remaining"],
                            "tier": limit_check["tier"],
                        },
                    })
                    continue

                history = message.get("history", [])
                history.append({"role": "user", "content": user_content})

                context = SkillContext(
                    user_id=user_id,
                    message=user_content,
                    conversation_history=history,
                    tutor_config=tutor_config,
                    user_role=user_role,
                    subject=chat_subject,
                )

                skill_result = await skill_registry.dispatch(context)

                if skill_result and skill_result.success and skill_result.response:
                    full_response = skill_result.response
                    extra_data = skill_result.data
                else:
                    agent_persona = ""
                    if agent_role:
                        agent_config = agent_dispatcher.get_agent(agent_role)
                        if agent_config:
                            agent_persona = agent_config.persona

                    if agent_persona:
                        system_override = {"agent_persona": agent_persona}
                        merged_config = {**tutor_config, **system_override}
                    else:
                        merged_config = tutor_config

                    full_response = ""
                    stream_gen, rag_sources = await ai_tutor_engine.chat_stream_with_sources(
                        messages=history,
                        tutor_config=merged_config,
                        use_rag=True,
                        kb_name=chat_subject or None,
                    )
                    async for chunk in stream_gen:
                        full_response += chunk
                        await websocket.send_json({
                            "type": "chunk",
                            "content": chunk,
                        })
                    extra_data = {}
                    if rag_sources:
                        source_refs = []
                        for src in rag_sources[:5]:
                            chunk_info = src if isinstance(src, dict) else {}
                            source_refs.append({
                                "document": chunk_info.get("document_name", chunk_info.get("doc_name", "")),
                                "similarity": chunk_info.get("similarity", 0),
                                "content_preview": (chunk_info.get("content", "") or "")[:100],
                            })
                        extra_data["rag_sources"] = source_refs

                guardrails_result = await bifrost_gateway.check_guardrails(full_response)
                if not guardrails_result.get("safe", True):
                    full_response = "抱歉，我无法回答这个问题。请换一个学习相关的问题。"
                    extra_data["filtered"] = True

                await websocket.send_json({
                    "type": "done",
                    "content": full_response,
                    "conversation_id": conversation_id,
                    "agent_role": agent_role,
                    "data": extra_data,
                })

                try:
                    async with async_session() as track_db:
                        await study_tracker.track_chat_interaction(
                            user_id=user_id, db=track_db, subject="",
                        )
                        await track_db.commit()
                except Exception:
                    pass

                try:
                    async with async_session() as kp_db:
                        extracted = await knowledge_extractor.extract_from_conversation(
                            user_id=user_id,
                            user_message=user_content,
                            ai_response=full_response,
                            subject="",
                            db=kp_db,
                        )
                        if extracted:
                            await kp_db.commit()
                            logger.info(f"Extracted {len(extracted)} knowledge points for user {user_id}")
                except Exception:
                    pass

                try:
                    async with async_session() as mem_db:
                        await memory_engine.update_student_profile(
                            user_id=user_id,
                            interaction_data={
                                "subject": "",
                                "is_correct": None,
                                "knowledge_points": [],
                            },
                            db=mem_db,
                        )
                        await mem_db.commit()
                except Exception:
                    pass

    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.send_json({"type": "error", "message": "Internal error"})
        except Exception:
            pass
