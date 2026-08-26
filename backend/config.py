"""
InsightForge AI — Application Configuration
Loads environment variables and provides typed settings via Pydantic.
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Centralised, validated application settings."""

    # ── LLM Settings ───────────────────────────────────────────
    LLM_PROVIDER: str = "groq"  # Options: "groq", "nvidia"
    
    # Groq Configuration
    GROQ_API_KEY: str = "your_groq_api_key_here"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # NVIDIA NIM Configuration
    NVIDIA_API_KEY: str = ""
    NVIDIA_MODEL: str = "meta/llama-3.3-70b-instruct"
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"

    # ── Paths ──────────────────────────────────────────────────
    CHROMA_PERSIST_DIR: str = "./data/chroma_db"
    UPLOAD_DIR: str = "./data/uploads"
    CACHE_DIR: str = "./data/cache"

    # ── Embedding ──────────────────────────────────────────────
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # ── Server ─────────────────────────────────────────────────
    ENVIRONMENT: str = "development"  # "development" or "production"
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://analytica-gpt.vercel.app"

    # ── RAG ────────────────────────────────────────────────────
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 64
    TOP_K: int = 5

    # ── ML ─────────────────────────────────────────────────────
    MAX_CLUSTERS: int = 10
    ANOMALY_CONTAMINATION: float = 0.05

    # ── Auth & Database ────────────────────────────────────────
    JWT_SECRET: str = "insightforge-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 72
    DATABASE_URL: str = "sqlite:///./data/insightforge.db"

    @property
    def sqlalchemy_database_url(self) -> str:
        """Handle Render/Heroku postgres:// vs postgresql:// issue."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    # ── Background Jobs ────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure required directories exist
for d in [settings.UPLOAD_DIR, settings.CHROMA_PERSIST_DIR, settings.CACHE_DIR]:
    os.makedirs(d, exist_ok=True)
