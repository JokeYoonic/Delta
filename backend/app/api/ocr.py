from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models import User
from app.services import ocr_service
from app.schemas import OCRRequest, OCRResponse

router = APIRouter(prefix="/ocr", tags=["ocr"])


@router.post("/recognize", response_model=OCRResponse)
async def recognize_image(
    data: OCRRequest,
    current_user: User = Depends(get_current_user),
):
    result = await ocr_service.recognize(data.image_base64)
    return OCRResponse(
        text=result["text"],
        formula=result.get("formula"),
        confidence=result["confidence"],
        boxes=result["boxes"],
    )
