"""
InsightForge AI — Authentication Routes
Register, login, logout, current user — all cookie-based.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from loguru import logger

from database import User, get_db
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    set_auth_cookie,
    clear_auth_cookie,
    get_current_user,
)
from models import RegisterRequest, LoginRequest, UserResponse, AuthResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    """Create a new user account."""
    # Check duplicates
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=409, detail="Username already taken")

    user = User(
        email=req.email,
        username=req.username,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        role="analyst",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Issue JWT cookie
    token = create_access_token(user.id, user.email)
    set_auth_cookie(response, token)

    logger.info(f"New user registered: {user.email}")
    return AuthResponse(
        user=_user_response(user),
        message="Account created successfully",
        token=token,
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Log in with email + password. Sets httpOnly cookie and returns token."""
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(user.id, user.email)
    set_auth_cookie(response, token)

    logger.info(f"User logged in: {user.email}")
    return AuthResponse(
        user=_user_response(user),
        message="Logged in successfully",
        token=token,
    )


@router.post("/logout")
async def logout(response: Response):
    """Clear the auth cookie."""
    clear_auth_cookie(response)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return _user_response(user)


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    full_name: str = None,
    role: str = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user profile fields."""
    if full_name is not None:
        user.full_name = full_name
    if role in ("analyst", "manager", "ceo"):
        user.role = role
    db.commit()
    db.refresh(user)
    return _user_response(user)


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name or "",
        role=user.role or "analyst",
        avatar_url=user.avatar_url or "",
        created_at=user.created_at.isoformat() if user.created_at else "",
    )
