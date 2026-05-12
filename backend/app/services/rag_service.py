import httpx
from typing import Optional
from app.core.config import settings


class RAGFlowService:
    def __init__(self):
        self.base_url = settings.RAGFLOW_API_URL
        self.api_key = settings.RAGFLOW_API_KEY
        self.headers = {"Authorization": f"Bearer {self.api_key}"}

    async def _request(self, method: str, path: str, json_data: dict = None, timeout: float = 30.0) -> dict:
        async with httpx.AsyncClient(timeout=timeout) as client:
            url = f"{self.base_url}/api/v1{path}"
            response = await client.request(method, url, json=json_data, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def list_datasets(self) -> list[dict]:
        data = await self._request("GET", "/datasets")
        return data.get("data", [])

    async def create_dataset(self, name: str, description: str = "") -> dict:
        return await self._request("POST", "/datasets", {
            "name": name,
            "description": description,
        })

    async def get_or_create_dataset(self, name: str) -> str:
        datasets = await self.list_datasets()
        for ds in datasets:
            if ds.get("name") == name:
                return ds["id"]
        result = await self.create_dataset(name, f"Delta AI Tutor - {name}")
        return result.get("data", {}).get("id", "")

    async def upload_document(self, dataset_id: str, file_name: str, file_content: bytes) -> dict:
        async with httpx.AsyncClient(timeout=120.0) as client:
            url = f"{self.base_url}/api/v1/datasets/{dataset_id}/documents"
            files = {"file": (file_name, file_content)}
            response = await client.post(url, files=files, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def list_documents(self, dataset_id: str) -> list[dict]:
        data = await self._request("GET", f"/datasets/{dataset_id}/documents")
        return data.get("data", [])

    async def delete_document(self, dataset_id: str, document_id: str) -> dict:
        return await self._request("DELETE", f"/datasets/{dataset_id}/documents/{document_id}")

    async def create_chat_assistant(self, name: str, dataset_ids: list[str], llm_config: dict = None) -> dict:
        payload = {
            "name": name,
            "dataset_ids": dataset_ids,
        }
        if llm_config:
            payload["llm"] = llm_config
        return await self._request("POST", "/chats", payload)

    async def chat(self, assistant_id: str, question: str, conversation_id: Optional[str] = None) -> dict:
        payload = {
            "question": question,
            "stream": False,
        }
        if conversation_id:
            payload["conversation_id"] = conversation_id
        return await self._request("POST", f"/chats/{assistant_id}/completions", payload)

    async def chat_stream(self, assistant_id: str, question: str, conversation_id: Optional[str] = None):
        async with httpx.AsyncClient(timeout=60.0) as client:
            url = f"{self.base_url}/api/v1/chats/{assistant_id}/completions"
            payload = {
                "question": question,
                "stream": True,
            }
            if conversation_id:
                payload["conversation_id"] = conversation_id
            async with client.stream("POST", url, json=payload, headers=self.headers) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        yield line[5:].strip()

    async def query(self, question: str, kb_name: str = None, top_k: int = 5) -> dict:
        kb = kb_name or settings.RAGFLOW_KB_NAME
        dataset_id = await self.get_or_create_dataset(kb)
        datasets = await self.list_datasets()
        ds_ids = [ds["id"] for ds in datasets if ds.get("name") == kb]
        if not ds_ids:
            return {"answer": "知识库为空，请先上传教材", "sources": [], "confidence": 0.0}

        assistants = await self._request("GET", "/chats")
        assistant_id = None
        for a in assistants.get("data", []):
            if kb in a.get("name", ""):
                assistant_id = a["id"]
                break

        if not assistant_id:
            result = await self.create_chat_assistant(f"delta-{kb}", ds_ids)
            assistant_id = result.get("data", {}).get("id")

        chat_result = await self.chat(assistant_id, question)
        return {
            "answer": chat_result.get("data", {}).get("answer", ""),
            "sources": chat_result.get("data", {}).get("reference", {}).get("chunks", []),
            "confidence": 0.85,
        }


ragflow_service = RAGFlowService()
