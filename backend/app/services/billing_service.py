import httpx
from typing import Optional
from app.core.config import settings


class LagoBillingService:
    def __init__(self):
        self.base_url = "http://lago:5050/api/v1"
        self.api_key = ""
        self.headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    async def _request(self, method: str, path: str, json_data: dict = None) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}{path}"
            response = await client.request(method, url, json=json_data, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def create_customer(self, user_id: str, name: str, email: str) -> dict:
        return await self._request("POST", "/customers", {
            "customer": {
                "external_id": user_id,
                "name": name,
                "email": email,
            }
        })

    async def create_subscription(self, user_id: str, plan_code: str) -> dict:
        return await self._request("POST", "/subscriptions", {
            "subscription": {
                "external_customer_id": user_id,
                "plan_code": plan_code,
            }
        })

    async def track_usage(self, user_id: str, event_code: str, properties: dict = None) -> dict:
        return await self._request("POST", "/events", {
            "event": {
                "transaction_id": f"delta-{user_id}-{event_code}-{__import__('time').time()}",
                "external_customer_id": user_id,
                "code": event_code,
                "properties": properties or {},
            }
        })

    async def get_customer_usage(self, user_id: str) -> dict:
        try:
            return await self._request("GET", f"/customers/{user_id}/current_usage")
        except httpx.HTTPError:
            return {"customer_usage": {"amount_cents": 0, "usage": []}}

    async def get_customer_invoices(self, user_id: str) -> dict:
        try:
            return await self._request("GET", f"/customers/{user_id}/invoices")
        except httpx.HTTPError:
            return {"invoices": []}


lago_service = LagoBillingService()
