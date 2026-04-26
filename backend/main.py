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

# ── App ────────────────────────────────────────────────────────
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs("data/reports", exist_ok=True)
    os.makedirs("data/chroma_db", exist_ok=True)
    init_db()
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
