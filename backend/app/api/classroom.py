import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.config import settings
from app.core.database import async_session
from app.models import TutorConfig
from app.services import ai_tutor_engine
from app.services.rag_service import rag_service
from app.services.study_tracker import study_tracker
from app.services.usage_limiter import usage_limiter
from app.skills.classroom_skill import TEACHING_STEPS

router = APIRouter(prefix="/classroom", tags=["classroom"])


@router.websocket("/ws/{token}")
async def websocket_classroom(websocket: WebSocket, token: str):
    # 开发阶段：跳过鉴权，始终使用超级管理员
    user_id = settings.SUPER_USER_ID

    await websocket.accept()

    subject = "数学"
    topic = "综合练习"
    grade = "初中"
    current_step_idx = 0
    tutor_config = {}

    async with async_session() as db:
        config_result = await db.execute(
            select(TutorConfig).where(TutorConfig.user_id == user_id)
        )
        tutor_config_obj = config_result.scalar_one_or_none()
        if tutor_config_obj:
            tutor_config = {
                "depth": tutor_config_obj.depth,
                "learning_style": tutor_config_obj.learning_style,
                "communication_style": tutor_config_obj.communication_style,
                "tone_style": tutor_config_obj.tone_style,
            }

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "init":
                subject = message.get("subject", "数学")
                topic = message.get("topic", "综合练习")
                grade = message.get("grade", "初中")
                current_step_idx = 0

                async with async_session() as limit_db:
                    limit_check = await usage_limiter.check_limit(
                        user_id=user_id, feature="classroom_sessions", db=limit_db,
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

                await _send_step_content(
                    websocket, subject, topic, grade,
                    current_step_idx, tutor_config,
                )
                continue

            if message.get("type") == "next_step":
                if current_step_idx < len(TEACHING_STEPS) - 1:
                    current_step_idx += 1
                    await _send_step_content(
                        websocket, subject, topic, grade,
                        current_step_idx, tutor_config,
                    )
                else:
                    await websocket.send_json({
                        "type": "classroom_complete",
                        "data": {
                            "subject": subject,
                            "topic": topic,
                            "total_steps": len(TEACHING_STEPS),
                        },
                    })

                    try:
                        async with async_session() as track_db:
                            await study_tracker.track_classroom_session(
                                user_id=user_id, db=track_db,
                                subject=subject, duration_seconds=0,
                            )
                            await track_db.commit()
                    except Exception:
                        pass
                continue

            if message.get("type") == "prev_step":
                if current_step_idx > 0:
                    current_step_idx -= 1
                    await _send_step_content(
                        websocket, subject, topic, grade,
                        current_step_idx, tutor_config,
                    )
                continue

            if message.get("type") == "goto_step":
                step_key = message.get("step", "objectives")
                idx = next((i for i, s in enumerate(TEACHING_STEPS) if s["key"] == step_key), 0)
                current_step_idx = idx
                await _send_step_content(
                    websocket, subject, topic, grade,
                    current_step_idx, tutor_config,
                )
                continue

            if message.get("type") == "ask":
                user_question = message.get("content", "")
                step_config = TEACHING_STEPS[current_step_idx]

                qa_prompt = f"学生在学习{subject}的{topic}（{step_config['label']}阶段）时提问：{user_question}\n\n请用苏格拉底式引导回答，帮助学生理解。用中文回答。"

                full_response = ""
                async for chunk in ai_tutor_engine.chat_stream(
                    messages=[{"role": "user", "content": qa_prompt}],
                    tutor_config=tutor_config,
                    use_rag=True,
                ):
                    full_response += chunk
                    await websocket.send_json({
                        "type": "chunk",
                        "content": chunk,
                    })

                await websocket.send_json({
                    "type": "done",
                    "content": full_response,
                })

    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.send_json({"type": "error", "message": "Internal error"})
        except Exception:
            pass


async def _send_step_content(
    websocket: WebSocket,
    subject: str,
    topic: str,
    grade: str,
    step_idx: int,
    tutor_config: dict,
):
    step_config = TEACHING_STEPS[step_idx]

    await websocket.send_json({
        "type": "step_start",
        "data": {
            "step": step_config["key"],
            "label": step_config["label"],
            "step_index": step_idx,
            "total_steps": len(TEACHING_STEPS),
            "is_first": step_idx == 0,
            "is_last": step_idx == len(TEACHING_STEPS) - 1,
        },
    })

    prompt = step_config["prompt_template"].format(
        subject=subject,
        topic=topic,
        grade=grade,
    )

    rag_context = ""
    try:
        rag_result = await rag_service.query(f"{subject} {topic}")
        if rag_result.get("answer"):
            rag_context = f"\n\n参考教材内容：\n{rag_result['answer']}"
    except Exception:
        pass

    full_prompt = prompt + rag_context

    full_response = ""
    async for chunk in ai_tutor_engine.chat_stream(
        messages=[{"role": "user", "content": full_prompt}],
        tutor_config=tutor_config,
        use_rag=False,
    ):
        full_response += chunk
        await websocket.send_json({
            "type": "chunk",
            "content": chunk,
        })

    await websocket.send_json({
        "type": "step_done",
        "content": full_response,
        "data": {
            "step": step_config["key"],
            "label": step_config["label"],
            "step_index": step_idx,
            "total_steps": len(TEACHING_STEPS),
            "teaching_steps": [{"key": s["key"], "label": s["label"]} for s in TEACHING_STEPS],
        },
    })
