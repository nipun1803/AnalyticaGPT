"""
InsightForge AI — Database Layer
SQLAlchemy models and session management for user auth and data persistence.
"""

from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite specific
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── ORM Models ─────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), default="")
    avatar_url = Column(String(500), default="")
    role = Column(String(20), default="analyst")  # analyst | manager | ceo
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    query = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    role = Column(String(20), default="analyst")
    sources_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DatasetLog(Base):
    __tablename__ = "dataset_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    rows = Column(Integer, default=0)
    columns = Column(Integer, default=0)
    dataset_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SharedPin(Base):
    __tablename__ = "shared_pins"

    id = Column(String(36), primary_key=True, index=True) # UUID
    user_id = Column(Integer, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    content_type = Column(String(50), nullable=False) # 'insight', 'chart'
    content_data = Column(Text, nullable=False) # JSON
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# ── Create all tables ──────────────────────────────────────────
def init_db():
    Base.metadata.create_all(bind=engine)


# ── Dependency ─────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
