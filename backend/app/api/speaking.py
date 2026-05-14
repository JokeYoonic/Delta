import json
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db, async_session
from app.core.security import get_current_user
from app.models import User, SpeakingSession, TutorConfig
from app.schemas import SpeakingSessionCreate, SpeakingSessionResponse
from app.services import ai_tutor_engine
from app.services.bifrost_gateway import bifrost_gateway
from app.services.study_tracker import study_tracker
from app.services.usage_limiter import usage_limiter

router = APIRouter(prefix="/speaking", tags=["speaking"])


@router.get("/sessions", response_model=list[SpeakingSessionResponse])
async def list_speaking_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SpeakingSession)
        .where(SpeakingSession.user_id == current_user.id)
        .order_by(SpeakingSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [SpeakingSessionResponse.model_validate(s) for s in sessions]


@router.post("/sessions", response_model=SpeakingSessionResponse)
async def create_speaking_session(
    data: SpeakingSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = SpeakingSession(
        user_id=current_user.id,
        role=data.role,
        scene=data.scene,
        subject=data.subject,
        topic=data.topic,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return SpeakingSessionResponse.model_validate(session)


@router.get("/sessions/{session_id}", response_model=SpeakingSessionResponse)
async def get_speaking_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SpeakingSession).where(SpeakingSession.id == session_id, SpeakingSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Speaking session not found")
    return SpeakingSessionResponse.model_validate(session)


SPEAKING_SYSTEM_PROMPTS = {
    "daily": """你是一个友好的英语口语练习伙伴。和学生进行日常对话练习。
规则：
1. 用简单自然的英语对话
2. 每次回复2-3句话
3. 适时纠正明显的语法错误
4. 鼓励学生多说
5. 如果学生用中文，温和地引导回英语""",
    "exam": """你是一个严格的英语口语考官，模拟雅思/托福口语考试。
规则：
1. 按考试流程提问
2. 给学生30秒-1分钟回答时间
3. 回答后给出评分和改进建议
4. 关注流利度、词汇、语法、发音四个维度
5. 逐步增加问题难度""",
    "recitation": """你是一个温柔的朗读指导老师，帮助学生练习朗读。
规则：
1. 提供一段文本让学生朗读
2. 关注停顿、重音、语调
3. 给出具体的改进建议
4. 用鼓励的方式指出问题
5. 适合中文和英文朗读""",
    "presentation": """你是一个演讲教练，帮助学生练习说题/演讲。
规则：
1. 帮助学生组织思路
2. 提供结构化表达框架
3. 关注逻辑性和表达清晰度
4. 模拟提问环节
5. 给出改进建议""",
}


@router.websocket("/ws/{token}")
async def websocket_speaking(websocket: WebSocket, token: str):
    # 开发阶段：跳过鉴权，始终使用超级管理员
    user_id = settings.SUPER_USER_ID

    await websocket.accept()

    scene = "daily"
    role = "peer"
    history = []

    async with async_session() as db:
        config_result = await db.execute(
            select(TutorConfig).where(TutorConfig.user_id == user_id)
        )
        tutor_config_obj = config_result.scalar_one_or_none()

    tutor_config = {}
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
                scene = message.get("scene", "daily")
                role = message.get("role", "peer")
                history = []

                async with async_session() as limit_db:
                    limit_check = await usage_limiter.check_limit(
                        user_id=user_id, feature="speaking_sessions", db=limit_db,
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

                system_prompt = SPEAKING_SYSTEM_PROMPTS.get(scene, SPEAKING_SYSTEM_PROMPTS["daily"])

                greeting = await ai_tutor_engine.chat(
                    messages=[{"role": "user", "content": f"开始口语练习，场景：{scene}，我的角色是学生，请用英语打招呼开始对话。"}],
                    tutor_config={**tutor_config, "language": "en"},
                    use_rag=False,
                )
                history.append({"role": "assistant", "content": greeting})
                await websocket.send_json({
                    "type": "greeting",
                    "content": greeting,
                    "scene": scene,
                })
                continue

            if message.get("type") == "chat":
                user_content = message.get("content", "")
                system_prompt = SPEAKING_SYSTEM_PROMPTS.get(scene, SPEAKING_SYSTEM_PROMPTS["daily"])

                history.append({"role": "user", "content": user_content})

                full_response = ""
                async for chunk in ai_tutor_engine.chat_stream(
                    messages=history,
                    tutor_config={**tutor_config, "language": "en"},
                    use_rag=False,
                ):
                    full_response += chunk
                    await websocket.send_json({
                        "type": "chunk",
                        "content": chunk,
                    })

                history.append({"role": "assistant", "content": full_response})

                await websocket.send_json({
                    "type": "done",
                    "content": full_response,
                })

            if message.get("type") == "evaluate":
                user_text = message.get("text", "")
                reference = message.get("reference", "")

                eval_prompt = f"""请评估以下口语表达：

学生说的：{user_text}
参考表达：{reference if reference else '无参考'}

请从以下维度评分（1-10分）并给出建议：
1. 流利度
2. 语法准确性
3. 词汇丰富度
4. 表达自然度

以JSON格式返回：
{{"fluency": X, "grammar": X, "vocabulary": X, "naturalness": X, "feedback": "具体建议", "corrections": ["纠错1", "纠错2"]}}"""

                eval_result = await ai_tutor_engine.chat(
                    messages=[{"role": "user", "content": eval_prompt}],
                    tutor_config=tutor_config,
                    use_rag=False,
                )
                try:
                    json_str = eval_result.strip()
                    if json_str.startswith("```"):
                        json_str = json_str.split("\n", 1)[1].rsplit("```", 1)[0]
                    evaluation = json.loads(json_str)
                except (json.JSONDecodeError, IndexError):
                    evaluation = {
                        "fluency": 5,
                        "grammar": 5,
                        "vocabulary": 5,
                        "naturalness": 5,
                        "feedback": eval_result,
                        "corrections": [],
                    }

                await websocket.send_json({
                    "type": "evaluation",
                    "data": evaluation,
                })

                try:
                    async with async_session() as track_db:
                        await study_tracker.track_speaking_session(
                            user_id=user_id, db=track_db,
                            duration_seconds=0, subject="英语",
                        )
                        await track_db.commit()
                except Exception:
                    pass

    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.send_json({"type": "error", "message": "Internal error"})
        except Exception:
            pass
