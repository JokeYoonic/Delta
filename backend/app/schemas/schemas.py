from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    name: str
    email: str
    grade: str = ""
    school: str = ""


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    grade: Optional[str] = None
    school: Optional[str] = None
    avatar: Optional[str] = None


class UserResponse(UserBase):
    id: str
    avatar: str = ""
    role: str = "student"
    points: int = 0
    streak_days: int = 0
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: str
    password: str


class ChatMessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    attachment: Optional[dict] = None


class ChatMessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    message_type: str = "text"
    attachment: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationCreate(BaseModel):
    title: str = "新对话"
    subject: str = ""
    mode: str = "chat"


class ConversationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    subject: str
    mode: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailResponse(ConversationResponse):
    messages: list[ChatMessageResponse] = []


class ExamSubmitRequest(BaseModel):
    exam_title: str
    exam_type: str
    subject: str
    score: int
    total_score: int
    correct_count: int
    wrong_count: int
    time_used: int = 0
    knowledge_mastery: list[dict] = []
    wrong_questions: list[dict] = []
    suggestions: list[str] = []


class ExamResultResponse(BaseModel):
    id: str
    exam_title: str
    exam_type: str
    subject: str
    score: int
    total_score: int
    correct_count: int
    wrong_count: int
    time_used: int
    knowledge_mastery: list[dict]
    wrong_questions: list[dict]
    suggestions: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class TutorConfigUpdate(BaseModel):
    depth: Optional[int] = Field(None, ge=1, le=10)
    learning_style: Optional[str] = None
    communication_style: Optional[str] = None
    tone_style: Optional[str] = None
    reasoning_framework: Optional[str] = None
    language: Optional[str] = None
    use_emojis: Optional[bool] = None


class TutorConfigResponse(BaseModel):
    id: str
    user_id: str
    depth: int
    learning_style: str
    communication_style: str
    tone_style: str
    reasoning_framework: str
    language: str
    use_emojis: bool
    updated_at: datetime

    model_config = {"from_attributes": True}


class OCRRequest(BaseModel):
    image_base64: str


class OCRResponse(BaseModel):
    text: str
    formula: Optional[str] = None
    confidence: float
    boxes: list[dict]


class SpeakingSessionCreate(BaseModel):
    role: str = "gentle"
    scene: str = "daily"
    subject: str = ""
    topic: str = ""


class SpeakingSessionResponse(BaseModel):
    id: str
    user_id: str
    role: str
    scene: str
    subject: str
    topic: str
    duration: int
    pronunciation_score: Optional[int] = None
    fluency_score: Optional[int] = None
    accuracy_score: Optional[int] = None
    messages: list[dict] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class StudyReportResponse(BaseModel):
    period: str
    study_time: int
    questions_answered: int
    questions_correct: int
    conversations_count: int
    exam_count: int
    average_score: float
    subject_mastery: list[dict]
    knowledge_gaps: list[str]
    trend: list[dict]


class RAGQueryRequest(BaseModel):
    question: str
    kb_name: str = "delta-textbooks"
    top_k: int = 5


class RAGQueryResponse(BaseModel):
    answer: str
    sources: list[dict]
    confidence: float
