"""
InsightForge AI — Database Layer
SQLAlchemy models and session management for user auth and data persistence.
"""

from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

# ── Database Engine ───────────────────────────────────────────
is_sqlite = settings.sqlalchemy_database_url.startswith("sqlite")
engine_args = {}

if is_sqlite:
    engine_args["connect_args"] = {"check_same_thread": False}

engine = create_engine(
    settings.sqlalchemy_database_url,
    **engine_args,
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
    preferences = Column(Text, default="{}")  # Stores memory, context, and UI preferences
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


class DatasetFile(Base):
    """
    Persistent dataset registry per user.
    Stores the file path so users can switch datasets without re-uploading.
    """

    __tablename__ = "dataset_files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    dataset_id = Column(String(64), index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    rows = Column(Integer, default=0)
    columns = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime, nullable=True)


class UserSettings(Base):
    """
    Small per-user settings. MVP: track active dataset.
    """

    __tablename__ = "user_settings"

    user_id = Column(Integer, primary_key=True, index=True)
    active_dataset_id = Column(String(64), nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DatasetJob(Base):
    __tablename__ = "dataset_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    dataset_id = Column(String(64), index=True, nullable=False)
    job_id = Column(String(64), index=True, nullable=False)
    job_type = Column(String(50), nullable=False)  # e.g. "index", "report"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SharedPin(Base):
    __tablename__ = "shared_pins"

    id = Column(String(36), primary_key=True, index=True) # UUID
    user_id = Column(Integer, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    content_type = Column(String(50), nullable=False) # 'insight', 'chart'
    content_data = Column(Text, nullable=False) # JSON
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DatasetAccess(Base):
    """
    Tracks which users have access to which datasets (sharing).
    """
    __tablename__ = "dataset_access"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(String(64), index=True, nullable=False)
    owner_id = Column(Integer, index=True, nullable=False)
    shared_with_id = Column(Integer, index=True, nullable=False)
    access_level = Column(String(20), default="viewer") # viewer | editor
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# ── Create all tables ──────────────────────────────────────────
def init_db():
    from sqlalchemy import text
    try:
        if not is_sqlite:
            with engine.begin() as conn:
                conn.execute(text("DROP SEQUENCE IF EXISTS dataset_access_id_seq CASCADE"))
    except Exception as e:
        pass
    Base.metadata.create_all(bind=engine)


# ── Dependency ─────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
