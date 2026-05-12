from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models import User
from app.services import ai_tutor_engine

router = APIRouter(prefix="/exam", tags=["exam"])


@router.post("/generate")
async def generate_exam_questions(
    subject: str,
    chapter: str,
    difficulty: str = "medium",
    count: int = 10,
    question_types: list[str] = None,
    current_user: User = Depends(get_current_user),
):
    questions = await ai_tutor_engine.generate_exam_questions(
        subject=subject,
        chapter=chapter,
        difficulty=difficulty,
        count=count,
        question_types=question_types,
    )
    return {"questions": questions}


@router.post("/evaluate")
async def evaluate_answer(
    question: str,
    correct_answer: str,
    user_answer: str,
    subject: str = "",
    current_user: User = Depends(get_current_user),
):
    result = await ai_tutor_engine.evaluate_answer(
        question=question,
        correct_answer=correct_answer,
        user_answer=user_answer,
        subject=subject,
    )
    return result


@router.post("/analyze-mistakes")
async def analyze_mistakes(
    wrong_questions: list[dict],
    subject: str = "",
    current_user: User = Depends(get_current_user),
):
    result = await ai_tutor_engine.analyze_mistakes(
        wrong_questions=wrong_questions,
        subject=subject,
    )
    return result
