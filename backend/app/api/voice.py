import io
from fastapi import APIRouter, Depends, UploadFile, File, Form
from app.core.security import get_current_user
from app.models import User
from app.services import voice_service

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    language: str = Form("zh"),
    current_user: User = Depends(get_current_user),
):
    audio_data = await audio.read()
    result = await voice_service.speech_to_text(audio_data, language)
    return result


@router.post("/tts")
async def text_to_speech(
    text: str = Form(...),
    voice: str = Form(None),
    current_user: User = Depends(get_current_user),
):
    audio = await voice_service.text_to_speech(text, voice)
    from fastapi.responses import Response
    return Response(content=audio, media_type="audio/wav")


@router.post("/evaluate-pronunciation")
async def evaluate_pronunciation(
    audio: UploadFile = File(...),
    reference_text: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    audio_data = await audio.read()
    result = await voice_service.evaluate_pronunciation(audio_data, reference_text)
    return result
