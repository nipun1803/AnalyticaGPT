"""
InsightForge AI — Authentication Service
JWT-based auth with httpOnly cookie transport, bcrypt password hashing.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
try:
    import jwt
    from jwt import PyJWTError as JWTError
except ImportError:
    from jose import jwt, JWTError
from fastapi import HTTPException, Request, Response, Depends, status
from sqlalchemy.orm import Session

from config import settings
from database import User, get_db


# ── Password Hashing ──────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT Token ─────────────────────────────────────────────────

def create_access_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── Cookie Helpers ────────────────────────────────────────────

COOKIE_NAME = "insightforge_token"


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        # Must be True for SameSite=None
        secure=True, 
        samesite="none", # Required for cross-domain (Vercel -> HF)
        max_age=settings.JWT_EXPIRE_HOURS * 3600,
        path="/",
    )

def clear_auth_cookie(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Extract user from httpOnly cookie JWT. Raises 401 if invalid."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    user_id = int(payload.get("sub", 0))
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Like get_current_user but returns None instead of raising."""
    try:
        return get_current_user(request, db)
    except HTTPException:
        return None
