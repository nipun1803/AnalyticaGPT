"""
InsightForge AI — General Helper Utilities
"""

import hashlib
import json
import os
import pickle
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from loguru import logger
from config import settings


def file_hash(filepath: str) -> str:
    """SHA-256 hash of a file for cache-key generation."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def now_iso() -> str:
    """Current UTC timestamp in ISO format."""
    return datetime.now(timezone.utc).isoformat()


def save_cache(key: str, data: Any) -> None:
    """Persist an object to the local disk cache."""
    cache_path = Path(settings.CACHE_DIR) / f"{key}.pkl"
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_path, "wb") as f:
        pickle.dump(data, f)
    logger.debug(f"Cached → {cache_path}")


def load_cache(key: str) -> Any | None:
    """Load a cached object, or return None if not found."""
    cache_path = Path(settings.CACHE_DIR) / f"{key}.pkl"
    if cache_path.exists():
        with open(cache_path, "rb") as f:
            logger.debug(f"Cache hit ← {cache_path}")
            return pickle.load(f)
    return None


def clear_cache(key: str | None = None) -> None:
    """Clear a specific cache key or the entire cache directory."""
    cache_dir = Path(settings.CACHE_DIR)
    if key:
        target = cache_dir / f"{key}.pkl"
        if target.exists():
            target.unlink()
    else:
        for f in cache_dir.glob("*.pkl"):
            f.unlink()


def safe_json(obj: Any) -> Any:
    """Make an object JSON-serialisable (handle numpy, etc.)."""
    import numpy as np

    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        if np.isnan(obj):
            return None
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, dict):
        return {k: safe_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [safe_json(v) for v in obj]
    return obj
