from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Delta AI Tutor"
    VERSION: str = "0.2.0"
    API_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://delta:delta@localhost:5432/delta_ai"
    DATABASE_URL_SYNC: str = "postgresql://delta:delta@localhost:5432/delta_ai"
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    BIFROST_ENABLED: bool = False
    BIFROST_URL: str = "http://localhost:8080/v1"
    BIFROST_API_KEY: str = ""
    BIFROST_VIRTUAL_KEY_FREE: str = ""
    BIFROST_VIRTUAL_KEY_PREMIUM: str = ""
    BIFROST_VIRTUAL_KEY_FAMILY: str = ""
    BIFROST_CACHE_TTL: int = 86400
    BIFROST_GUARDRAILS_ENABLED: bool = True

    LLM_BINDING: str = "openai"
    LLM_MODEL: str = "deepseek/deepseek-chat"
    LLM_API_KEY: str = ""
    LLM_HOST: str = "https://api.deepseek.com/v1"

    EMBEDDING_BINDING: str = "openai"
    EMBEDDING_MODEL: str = "text-embedding-3-large"
    EMBEDDING_API_KEY: str = ""
    EMBEDDING_HOST: str = "https://api.openai.com/v1/embeddings"
    EMBEDDING_DIMENSION: int = 3072

    LOGTO_ENABLED: bool = False
    LOGTO_ENDPOINT: str = "http://localhost:3301"
    LOGTO_APP_ID: str = ""
    LOGTO_APP_SECRET: str = ""
    LOGTO_M2M_APP_ID: str = ""
    LOGTO_M2M_APP_SECRET: str = ""
    LOGTO_DEFAULT_ROLE: str = "student"

    NEON_ENABLED: bool = False
    NEON_CONNECTION_STRING: str = ""
    NEON_API_KEY: str = ""
    NEON_PROJECT_ID: str = ""
    NEON_BRANCH_PREFIX: str = "student-"

    CHROMA_COLLECTION_NAME: str = "delta-textbooks"
    CHROMA_PERSIST_DIR: str = "chroma_data"
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 80

    OCR_ENGINE: str = "rapidocr"
    PADDLEOCR_URL: str = "http://localhost:8868"

    ASR_ENGINE: str = "local_funasr"
    FUNASR_URL: str = "http://localhost:10095"
    FASTER_WHISPER_URL: str = "http://localhost:10300"

    TTS_ENGINE: str = "edge_tts"
    KOKORO_URL: str = "http://localhost:8880"
    EDGE_TTS_VOICE: str = "zh-CN-XiaoxiaoNeural"

    SENTRY_DSN: Optional[str] = None
    LOGFIRE_TOKEN: Optional[str] = None

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    SUPER_USER_ID: str = "77"
    SUPER_USER_ROLE: str = "superadmin"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def llm_base_url(self) -> str:
        if self.BIFROST_ENABLED and self.BIFROST_URL:
            return self.BIFROST_URL
        return self.LLM_HOST

    @property
    def llm_api_key_resolved(self) -> str:
        if self.BIFROST_ENABLED and self.BIFROST_API_KEY:
            return self.BIFROST_API_KEY
        return self.LLM_API_KEY

    @property
    def effective_database_url(self) -> str:
        if self.NEON_ENABLED and self.NEON_CONNECTION_STRING:
            return self.NEON_CONNECTION_STRING
        return self.DATABASE_URL

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
