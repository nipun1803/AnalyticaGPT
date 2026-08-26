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
    token: Optional[str] = None


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


class ClassifyRequest(BaseModel):
    target_column: str
    feature_columns: Optional[List[str]] = None
    test_size: float = Field(default=0.2, ge=0.05, le=0.5)
    n_estimators: int = Field(default=100, ge=10, le=1000)


class ForecastRequest(BaseModel):
    date_column: str
    target_column: str
    periods: int = Field(default=30, ge=1, le=365)


class StatTestRequest(BaseModel):
    col1: str
    col2: str
    test_type: str = "auto"


class UploadConfig(BaseModel):
    impute_strategy: ImputeStrategy = ImputeStrategy.MEAN
    normalize: bool = True
    encode_categoricals: bool = True


# ── Responses ──────────────────────────────────────────────────
class UploadResponse(BaseModel):
    filename: str
    rows: int
    columns: int
    column_types: Dict[str, List[str]]
    missing_values: Dict[str, int]
    preview: List[Dict[str, Any]]
    message: str
    suggestions: List[str] = []
    job_id: Optional[str] = None
    indexing_status: Optional[str] = None


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


class ClassifyResponse(BaseModel):
    task: str
    target: str
    metrics: Dict[str, Any]
    confusion_matrix: Dict[str, Any]
    feature_importance: List[Dict[str, Any]]
    per_class_metrics: Dict[str, Any]
    class_names: List[str]
    explanation: str


class ForecastResponse(BaseModel):
    historical: List[Dict[str, Any]]
    forecast: List[Dict[str, Any]]
    metrics: Dict[str, float]
    explanation: str


class StatTestResponse(BaseModel):
    test_type: str
    col1: str
    col2: str
    statistic: float
    p_value: float
    significant: bool
    interpretation: str
    # Flexible fields for different tests
    effect_size_cohens_d: Optional[float] = None
    effect_size_rank_biserial: Optional[float] = None
    effect_size_cramers_v: Optional[float] = None
    effect_size_eta_squared: Optional[float] = None
    mean_col1: Optional[float] = None
    mean_col2: Optional[float] = None
    median_col1: Optional[float] = None
    median_col2: Optional[float] = None
    std_col1: Optional[float] = None
    std_col2: Optional[float] = None
    equal_variance_p: Optional[float] = None
    degrees_of_freedom: Optional[int] = None
    contingency_table: Optional[Dict[str, Any]] = None
    group_means: Optional[Dict[str, float]] = None
    n_groups: Optional[int] = None
    numeric_column: Optional[str] = None
    group_column: Optional[str] = None


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
