import httpx
from typing import Optional
from app.core.config import settings


class LogtoService:
    def __init__(self):
        self.endpoint = settings.LOGTO_ENDPOINT.rstrip("/")
        self.app_id = settings.LOGTO_APP_ID
        self.app_secret = settings.LOGTO_APP_SECRET
        self.m2m_app_id = settings.LOGTO_M2M_APP_ID
        self.m2m_app_secret = settings.LOGTO_M2M_APP_SECRET
        self.enabled = settings.LOGTO_ENABLED

    def get_authorization_url(self, redirect_uri: str, state: str = "") -> str:
        if not self.enabled:
            return ""
        params = {
            "client_id": self.app_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid profile email",
            "state": state,
            "resource": f"{settings.API_PREFIX}",
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.endpoint}/oidc/auth?{query}"

    async def exchange_code(self, code: str, redirect_uri: str) -> dict:
        if not self.enabled:
            return {}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.endpoint}/oidc/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            return response.json()

    async def get_user_info(self, access_token: str) -> dict:
        if not self.enabled:
            return {}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.endpoint}/oidc/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            return response.json()

    async def get_m2m_token(self) -> str:
        if not self.enabled:
            return ""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.endpoint}/oidc/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.m2m_app_id,
                    "client_secret": self.m2m_app_secret,
                    "scope": "all",
                    "resource": f"{self.endpoint}/api",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            return response.json().get("access_token", "")

    async def get_user_roles(self, user_id: str, m2m_token: str) -> list[str]:
        if not self.enabled:
            return [settings.LOGTO_DEFAULT_ROLE]
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.endpoint}/api/users/{user_id}/roles",
                    headers={"Authorization": f"Bearer {m2m_token}"},
                )
                response.raise_for_status()
                roles = response.json()
                return [r.get("name", "") for r in roles] if roles else [settings.LOGTO_DEFAULT_ROLE]
        except Exception:
            return [settings.LOGTO_DEFAULT_ROLE]

    async def verify_token(self, token: str) -> Optional[dict]:
        if not self.enabled:
            return None
        try:
            user_info = await self.get_user_info(token)
            if user_info.get("sub"):
                return user_info
        except Exception:
            pass
        return None


logto_service = LogtoService()
