import base64
import io
import httpx
from typing import Optional
from PIL import Image

from app.core.config import settings


class OCRService:
    def __init__(self):
        self.engine = settings.OCR_ENGINE

    async def recognize(self, image_base64: str) -> dict:
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))

        if self.engine == "rapidocr":
            return await self._rapidocr_recognize(image_data)
        elif self.engine == "paddleocr":
            return await self._paddleocr_recognize(image_base64)
        else:
            return await self._rapidocr_recognize(image_data)

    async def _rapidocr_recognize(self, image_data: bytes) -> dict:
        try:
            from rapidocr_onnxruntime import RapidOCR
            ocr = RapidOCR()
            result, elapse = ocr(image_data)

            texts = []
            boxes = []
            for line in result or []:
                boxes.append({
                    "box": line[0],
                    "text": line[1],
                    "confidence": line[2],
                })
                texts.append(line[1])

            full_text = "\n".join(texts)
            avg_confidence = sum(b["confidence"] for b in boxes) / len(boxes) if boxes else 0

            formula = None
            for text in texts:
                if any(c in text for c in ["=", "+", "-", "×", "÷", "²", "√", "∫", "∑"]):
                    formula = text
                    break

            return {
                "text": full_text,
                "formula": formula,
                "confidence": avg_confidence,
                "boxes": boxes,
            }
        except ImportError:
            return {"text": "", "formula": None, "confidence": 0, "boxes": []}

    async def _paddleocr_recognize(self, image_base64: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.PADDLEOCR_URL}/predict",
                    json={"image": image_base64},
                )
                response.raise_for_status()
                data = response.json()

                texts = []
                boxes = []
                for item in data.get("result", []):
                    boxes.append({
                        "box": item.get("box", []),
                        "text": item.get("text", ""),
                        "confidence": item.get("confidence", 0),
                    })
                    texts.append(item.get("text", ""))

                full_text = "\n".join(texts)
                avg_confidence = sum(b["confidence"] for b in boxes) / len(boxes) if boxes else 0

                formula = None
                for text in texts:
                    if any(c in text for c in ["=", "+", "-", "×", "÷", "²", "√", "∫", "∑"]):
                        formula = text
                        break

                return {
                    "text": full_text,
                    "formula": formula,
                    "confidence": avg_confidence,
                    "boxes": boxes,
                }
        except (httpx.HTTPError, Exception):
            return {"text": "", "formula": None, "confidence": 0, "boxes": []}


ocr_service = OCRService()
