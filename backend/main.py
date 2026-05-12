"""
InsightForge AI — FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
import sys
import os

from config import settings
from database import init_db
from api.routes import router as api_router
from api.auth_routes import router as auth_router
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis

# ── Logging ────────────────────────────────────────────────────
logger.remove()
logger.add(
    sys.stderr,
    level=settings.LOG_LEVEL,
    format="<green>{time:HH:mm:ss}</green> | <level>{level:<8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
)
os.makedirs("logs", exist_ok=True)
logger.add("logs/insightforge.log", rotation="10 MB", retention="7 days", level="DEBUG")

# ── Initialise database ───────────────────────────────────────
init_db()
logger.info("Database initialised")

# ── Rate Limiting ──────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs("data/reports", exist_ok=True)
    os.makedirs("data/chroma_db", exist_ok=True)
    init_db()
    
    # Initialize Redis Cache
    redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
    
    logger.info("InsightForge AI Backend Started")
    yield
    # Shutdown
    logger.info("InsightForge AI Backend Shutting Down")

app = FastAPI(
    title="InsightForge AI",
    description="RAG-Based Data Analysis & Insight Generator",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── CORS ───────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files for generated reports ─────────────────────────
os.makedirs("data/reports", exist_ok=True)
app.mount("/reports", StaticFiles(directory="data/reports"), name="reports")

# ── Routes ─────────────────────────────────────────────────────
app.include_router(auth_router, prefix="/api")
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "app": "InsightForge AI",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
