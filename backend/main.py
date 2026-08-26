"""
InsightForge AI — FastAPI Application Entry Point
"""

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
import sys
import os

# ── distutils shim for Python 3.12+ ───────────────────────────
try:
    import distutils
except ImportError:
    try:
        import setuptools.distutils as distutils
        sys.modules['distutils'] = distutils
    except ImportError:
        pass
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
# Removed module-level init_db() to prevent blocking on import. 
# init_db() is called inside lifespan instead.

# ── Rate Limiting ──────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs("data/reports", exist_ok=True)
    os.makedirs("data/chroma_db", exist_ok=True)
    init_db()
    
    # Initialize Cache (Redis with In-Memory fallback)
    try:
        if settings.REDIS_URL and settings.REDIS_URL.startswith("redis"):
            import asyncio
            from urllib.parse import urlparse
            parsed = urlparse(settings.REDIS_URL)
            host = parsed.hostname
            port = parsed.port or 6379

            # Quick probe with 1.5s timeout to prevent hanging on unreachable hosts
            loop = asyncio.get_running_loop()
            await asyncio.wait_for(
                loop.getaddrinfo(host, port),
                timeout=1.5
            )

            redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf8",
                decode_responses=True,
                socket_connect_timeout=1.5,
                socket_timeout=1.5,
            )
            await asyncio.wait_for(redis.ping(), timeout=1.5)
            FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
            logger.info("Cache initialized with Redis")
        else:
            raise ValueError("No Redis URL")
    except Exception as e:
        from fastapi_cache.backends.inmemory import InMemoryBackend
        FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")
        logger.warning(f"Redis unavailable, using In-Memory cache: {e}")
    
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
@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin")
    if request.method == "OPTIONS":
        res = Response(status_code=200)
    else:
        try:
            res = await call_next(request)
        except Exception as e:
            logger.error(f"Unhandled exception in request: {e}")
            from fastapi.responses import JSONResponse
            res = JSONResponse(status_code=500, content={"detail": "Internal Server Error"})
    
    if origin:
        res.headers["Access-Control-Allow-Origin"] = origin
        res.headers["Access-Control-Allow-Credentials"] = "true"
        res.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"
        res.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin, User-Agent, X-Requested-With, *"
        res.headers["Access-Control-Expose-Headers"] = "*"
        res.headers["Access-Control-Max-Age"] = "86400"
    return res

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"^https?:\/\/.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ── Static files for frontend & reports ────────────────────────
os.makedirs("data/reports", exist_ok=True)
app.mount("/reports", StaticFiles(directory="data/reports"), name="reports")

# Serve the React frontend (only if the directory exists, e.g. in production)
if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")


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

    uvicorn.run("main:app", host="0.0.0.0", port=7860, reload=False)
