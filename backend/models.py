"""
InsightForge AI — Pydantic Request / Response Models
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────
class ImputeStrategy(str, Enum):
    MEAN = "mean"
    MEDIAN = "median"
    MODE = "mode"
    DROP = "drop"


class UserRole(str, Enum):
    ANALYST = "analyst"
    MANAGER = "manager"
    CEO = "ceo"


class MLTask(str, Enum):
    REGRESSION = "regression"
    CLUSTERING = "clustering"
    ANOMALY = "anomaly"


# ── Auth Models ────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(default="", max_length=200)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: str
    avatar_url: str
    created_at: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    message: str


# ── Data Requests ──────────────────────────────────────────────
class QueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)
    role: UserRole = UserRole.ANALYST
    top_k: int = Field(default=5, ge=1, le=20)
    use_hybrid: bool = True
    stream: bool = False


class PredictRequest(BaseModel):
    target_column: str
    feature_columns: Optional[List[str]] = None
    test_size: float = Field(default=0.2, ge=0.05, le=0.5)


class ClusterRequest(BaseModel):
    n_clusters: Optional[int] = None  # Auto if None
    feature_columns: Optional[List[str]] = None


class AnomalyRequest(BaseModel):
    contamination: float = Field(default=0.05, ge=0.01, le=0.5)
    feature_columns: Optional[List[str]] = None


class ForecastRequest(BaseModel):
    date_column: str
    target_column: str
    periods: int = Field(default=30, ge=1, le=365)


class UploadConfig(BaseModel):
    impute_strategy: ImputeStrategy = ImputeStrategy.MEAN
    normalize: bool = True
    encode_categoricals: bool = True


# ── Responses ──────────────────────────────────────────────────
class UploadResponse(BaseModel):
    filename: str
    rows: int
    columns: int
    column_types: Dict[str, str]
    missing_values: Dict[str, int]
    preview: List[Dict[str, Any]]
    message: str


class SummaryResponse(BaseModel):
    statistics: Dict[str, Any]
    profiling: Dict[str, Any]
    data_quality: Dict[str, Any]


class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    query: str
    role: str


class PredictResponse(BaseModel):
    task: str
    target: str
    metrics: Dict[str, float]
    feature_importance: List[Dict[str, Any]]
    predictions_sample: List[Dict[str, Any]]
    explanation: str


class ClusterResponse(BaseModel):
    n_clusters: int
    cluster_sizes: Dict[str, int]
    cluster_centers: List[List[float]]
    silhouette_score: float
    labels: List[int]
    feature_columns: List[str]


class AnomalyResponse(BaseModel):
    n_anomalies: int
    anomaly_ratio: float
    anomaly_indices: List[int]
    anomaly_scores: List[float]
    anomaly_samples: List[Dict[str, Any]]
    explanation: str


class ForecastResponse(BaseModel):
    historical: List[Dict[str, Any]]
    forecast: List[Dict[str, Any]]
    metrics: Dict[str, float]
    explanation: str


class PinCreateRequest(BaseModel):
    title: str
    content_type: str
    content_data: Dict[str, Any]

class PinResponse(BaseModel):
    id: str
    title: str
    content_type: str
    content_data: Dict[str, Any]
    created_at: str


class ChatHistoryItem(BaseModel):
    query: str
    answer: str
    role: str
    timestamp: str
    sources_count: int


class ReportResponse(BaseModel):
    report_url: str
    filename: str
    message: str
