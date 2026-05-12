import httpx
import hashlib
import json
from typing import Optional, AsyncGenerator
from openai import AsyncOpenAI
from app.core.config import settings


class BifrostGateway:
    def __init__(self):
        self.base_url = settings.BIFROST_URL.rstrip("/")
        self.enabled = settings.BIFROST_ENABLED
        self._client: Optional[AsyncOpenAI] = None

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None and self.enabled:
            api_key = settings.llm_api_key_resolved or "sk-placeholder"
            self._client = AsyncOpenAI(
                api_key=api_key,
                base_url=settings.llm_base_url,
            )
        return self._client

    def _get_virtual_key(self, user_role: str = "free") -> str:
        key_map = {
            "free": settings.BIFROST_VIRTUAL_KEY_FREE,
            "premium": settings.BIFROST_VIRTUAL_KEY_PREMIUM,
            "family": settings.BIFROST_VIRTUAL_KEY_FAMILY,
            "superadmin": settings.BIFROST_VIRTUAL_KEY_FAMILY,
        }
        return key_map.get(user_role, settings.BIFROST_VIRTUAL_KEY_FREE) or settings.BIFROST_API_KEY

    def _cache_key(self, messages: list[dict], model: str) -> str:
        content = json.dumps(messages[-3:], ensure_ascii=False, sort_keys=True)
        return hashlib.sha256(f"{model}:{content}".encode()).hexdigest()

    async def chat(
        self,
        messages: list[dict],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        user_role: str = "free",
        stream: bool = False,
    ):
        resolved_model = model or settings.LLM_MODEL

        if not self.enabled:
            from app.services.ai_tutor_engine import ai_tutor_engine
            if stream:
                return ai_tutor_engine.chat_stream(messages)
            return await ai_tutor_engine.chat(messages)

        api_key = self._get_virtual_key(user_role)
        client = AsyncOpenAI(api_key=api_key, base_url=self.base_url)

        if stream:
            return self._stream_chat(client, messages, resolved_model, temperature, max_tokens)

        response = await client.chat.completions.create(
            model=resolved_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content

    async def chat_stream(
        self,
        messages: list[dict],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        user_role: str = "free",
    ) -> AsyncGenerator[str, None]:
        resolved_model = model or settings.LLM_MODEL

        if not self.enabled:
            from app.services.ai_tutor_engine import ai_tutor_engine
            async for chunk in ai_tutor_engine.chat_stream(messages):
                yield chunk
            return

        api_key = self._get_virtual_key(user_role)
        client = AsyncOpenAI(api_key=api_key, base_url=self.base_url)

        async for chunk in self._stream_chat(client, messages, resolved_model, temperature, max_tokens):
            yield chunk

    async def _stream_chat(
        self,
        client: AsyncOpenAI,
        messages: list[dict],
        model: str,
        temperature: float,
        max_tokens: int,
    ) -> AsyncGenerator[str, None]:
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def check_guardrails(self, text: str) -> dict:
        if not self.enabled or not settings.BIFROST_GUARDRAILS_ENABLED:
            return {"safe": True, "filtered": text}

        dangerous_patterns = [
            "rm -rf", "DROP TABLE", "DELETE FROM", "TRUNCATE",
            "sudo ", "chmod 777", "/etc/passwd", "curl | bash",
            "绕过家长", "跳过监管", "破解密码", "hack",
            "如何作弊", "考试作弊", "抄答案",
        ]
        text_lower = text.lower()
        for pattern in dangerous_patterns:
            if pattern.lower() in text_lower:
                return {"safe": False, "filtered": "", "reason": f"Content blocked: {pattern}"}

        return {"safe": True, "filtered": text}

    async def get_usage(self, virtual_key: str = None) -> dict:
        if not self.enabled:
            return {"usage": {}}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self.base_url}/usage",
                    headers={"Authorization": f"Bearer {virtual_key or settings.BIFROST_API_KEY}"},
                )
                return resp.json()
        except Exception:
            return {"usage": {}}


bifrost_gateway = BifrostGateway()
