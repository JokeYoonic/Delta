from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.conversations import router as conversations_router
from app.api.chat import router as chat_router
from app.api.exams import router as exams_router
from app.api.exam_engine import router as exam_engine_router
from app.api.tutor import router as tutor_router
from app.api.reports import router as reports_router
from app.api.speaking import router as speaking_router
from app.api.rag import router as rag_router
from app.api.ocr import router as ocr_router
from app.api.voice import router as voice_router
from app.api.knowledge import router as knowledge_router
from app.api.billing import router as billing_router
from app.api.skills import router as skills_router
from app.api.agents import router as agents_router
from app.api.memory_books import router as memory_books_router
from app.api.classroom import router as classroom_router
from app.api.parent import router as parent_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(conversations_router)
api_router.include_router(chat_router)
api_router.include_router(exams_router)
api_router.include_router(exam_engine_router)
api_router.include_router(tutor_router)
api_router.include_router(reports_router)
api_router.include_router(speaking_router)
api_router.include_router(rag_router)
api_router.include_router(ocr_router)
api_router.include_router(voice_router)
api_router.include_router(knowledge_router)
api_router.include_router(billing_router)
api_router.include_router(skills_router)
api_router.include_router(agents_router)
api_router.include_router(memory_books_router)
api_router.include_router(classroom_router)
api_router.include_router(parent_router)
