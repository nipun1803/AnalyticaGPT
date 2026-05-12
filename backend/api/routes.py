"""
InsightForge AI — API Routes
All FastAPI endpoints: upload, query, summary, ML, report, chat history.
"""

import os
import json
import hashlib
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Depends
import io
from sse_starlette.sse import EventSourceResponse
from loguru import logger
from fastapi_cache.decorator import cache
# import sweetviz as sv  # Moved to lazy-load inside the route
import tempfile
from fastapi.responses import StreamingResponse, Response, HTMLResponse, FileResponse
from pydantic import BaseModel

from auth import get_current_user
from database import User, SharedPin, DatasetFile, UserSettings, get_db
from sqlalchemy.orm import Session
import uuid

from config import settings
from models import (
    UploadResponse,
    SummaryResponse,
    QueryRequest,
    QueryResponse,
    PredictRequest,
    PredictResponse,
    ClassifyRequest,
    ClassifyResponse,
    ClusterRequest,
    ClusterResponse,
    AnomalyRequest,
    AnomalyResponse,
    ForecastRequest,
    ForecastResponse,
    StatTestRequest,
    StatTestResponse,
    PinCreateRequest,
    PinResponse,
    ChatHistoryItem,
    ReportResponse,
    ImputeStrategy,
    UserRole,
)
from utils.parser import (
    parse_csv,
    get_column_info,
    get_missing_values,
    get_preview,
    get_summary_statistics,
    get_data_quality_report,
    get_correlation_matrix,
    clean_dataset,
    get_eda_details,
    engineer_features,
)
from utils.helpers import file_hash, now_iso, safe_json
from services.ml.preprocessing import DataPreprocessor
from services.ml.models import MLEngine
from services.rag.embed import EmbeddingService
from services.rag.retriever import VectorRetriever
from services.rag.generator import LLMGenerator
from services.report import ReportGenerator

router = APIRouter()

# ── Global Shared Services (Stateless/Shared Clients) ──────────
# These are safe to share across all users.
_embedding_service = EmbeddingService()
_retriever = VectorRetriever()
_generator = LLMGenerator()

# ── Per-user state (Stateful services) ────────────────────────

# ── Initialise database ───────────────────────────────────────
# Removed module-level init_db() to prevent blocking on import. 
# init_db() is called inside lifespan instead.
# In a full production app, use Redis or DiskCache for this.
_user_states = {}


def get_user_state(user_id: int):
    """Retrieve or initialize state for a specific user."""
    if user_id not in _user_states:
        _user_states[user_id] = {
            "df_raw": None,
            "df_processed": None,
            "dataset_name": None,
            "dataset_id": None,
            "preprocessor": DataPreprocessor(),
            "ml_engine": MLEngine(),
            "report_generator": ReportGenerator(),
            "chat_history": [],
            "ml_results": {},
        }
    return _user_states[user_id]


def _require_dataset(user_id: int):
    """Guard: ensure a dataset is loaded for the user."""
    state = get_user_state(user_id)
    if state["df_raw"] is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded yet. Use POST /api/upload first.")
    return state


def _set_active_dataset(db: Session, user_id: int, dataset_id: str | None):
    settings_row = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings_row:
        settings_row = UserSettings(user_id=user_id, active_dataset_id=dataset_id)
        db.add(settings_row)
    else:
        settings_row.active_dataset_id = dataset_id
        settings_row.updated_at = datetime.now(timezone.utc)
    db.commit()


def _activate_dataset_from_record(state: dict, dataset: DatasetFile):
    """
    Load dataset from disk into in-memory user state and (re)index it for RAG.
    """
    df = parse_csv(dataset.file_path)
    state["df_raw"] = df.copy()
    state["dataset_name"] = dataset.filename
    state["dataset_id"] = dataset.dataset_id

    # Keep ML/RAG state consistent across dataset switches
    state["ml_results"] = {}
    state["chat_history"] = []

    # Preprocess for ML if needed
    try:
        df_processed = state["preprocessor"].fit_transform(
            df.copy(),
            impute_strategy="mean",
            normalize=True,
            encode_categoricals=True,
        )
        state["df_processed"] = df_processed
    except Exception as e:
        logger.error(f"Preprocessing failed during activate: {e}")
        state["df_processed"] = df.copy()

    # RAG: Indexing is HEAVY. Only do it if the collection is empty.
    try:
        count = _retriever.collection.count()
        if count == 0:
            logger.info(f"Indexing dataset {dataset.dataset_id} for RAG...")
            chunks = _embedding_service.create_chunks(df, dataset.filename)
            texts = [c["text"] for c in chunks]
            embeddings = _embedding_service.embed_texts(texts, cache_key=dataset.dataset_id)
            _retriever.index_chunks(chunks, embeddings, dataset.dataset_id)
        else:
            logger.info(f"Vector store already contains {count} items. Skipping auto-index.")
    except Exception as e:
        logger.error(f"RAG indexing check failed: {e}")


# ═══════════════════════════════════════════════════════════════
# 1. UPLOAD & PROCESS
# ═══════════════════════════════════════════════════════════════

@router.post("/upload", response_model=UploadResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    impute_strategy: str = Form(default="mean"),
    normalize: bool = Form(default=True),
    encode_categoricals: bool = Form(default=True),
    user: User = Depends(get_current_user),
):
    """
    Upload a CSV dataset → parse → preprocess → embed → index into vector DB.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()

    # Compute dataset_id from content (stable, avoids filename collisions)
    dataset_id = hashlib.sha256(content).hexdigest()[:16]

    # Save file with dataset_id prefix to avoid overwrites
    safe_name = f"{dataset_id}_{file.filename}"
    filepath = os.path.join(settings.UPLOAD_DIR, safe_name)
    with open(filepath, "wb") as f:
        f.write(content)
    logger.info(f"File saved: {filepath} ({len(content)} bytes)")

    # Parse
    try:
        df = parse_csv(filepath)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {str(e)}")

    state = get_user_state(user.id)
    state["df_raw"] = df.copy()
    state["dataset_name"] = file.filename
    state["dataset_id"] = dataset_id

    # Preprocess
    try:
        df_processed = state["preprocessor"].fit_transform(
            df.copy(),
            impute_strategy=impute_strategy,
            normalize=normalize,
            encode_categoricals=encode_categoricals,
        )
        state["df_processed"] = df_processed
    except Exception as e:
        logger.error(f"Preprocessing failed: {e}")
        state["df_processed"] = df.copy()

    # RAG: chunk → embed → index
    try:
        chunks = _embedding_service.create_chunks(df, file.filename)
        texts = [c["text"] for c in chunks]
        embeddings = _embedding_service.embed_texts(texts, cache_key=dataset_id)
        _retriever.index_chunks(chunks, embeddings, dataset_id)
        logger.info(f"Indexed {len(chunks)} chunks into vector DB")
    except Exception as e:
        logger.error(f"RAG indexing failed: {e}")

    # Persistence: Log dataset upload
    from database import SessionLocal, DatasetLog
    with SessionLocal() as db:
        log = DatasetLog(
            user_id=user.id,
            filename=file.filename,
            rows=df.shape[0],
            columns=df.shape[1],
            dataset_id=dataset_id,
        )
        db.add(log)
        # Upsert DatasetFile (per user, per dataset_id)
        existing = db.query(DatasetFile).filter(
            DatasetFile.user_id == user.id,
            DatasetFile.dataset_id == dataset_id,
        ).first()
        if not existing:
            existing = DatasetFile(
                user_id=user.id,
                dataset_id=dataset_id,
                filename=file.filename,
                file_path=filepath,
                rows=df.shape[0],
                columns=df.shape[1],
                last_used_at=datetime.now(timezone.utc),
            )
            db.add(existing)
        else:
            existing.filename = file.filename
            existing.file_path = filepath
            existing.rows = df.shape[0]
            existing.columns = df.shape[1]
            existing.last_used_at = datetime.now(timezone.utc)
        db.commit()

        # Set active dataset for this user
        _set_active_dataset(db, user.id, dataset_id)

    return UploadResponse(
        filename=file.filename,
        rows=df.shape[0],
        columns=df.shape[1],
        column_types=get_column_info(df),
        missing_values=get_missing_values(df),
        preview=get_preview(df),
        message=f"Successfully uploaded and processed '{file.filename}'",
    )


@router.get("/upload/status")
async def get_upload_status(user: User = Depends(get_current_user)):
    """Check if a dataset is currently loaded in memory for this user."""
    state = get_user_state(user.id)
    # If nothing loaded in memory, try to auto-rehydrate from active dataset setting.
    if state["df_raw"] is None:
        from database import SessionLocal
        with SessionLocal() as db:
            settings_row = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
            if settings_row and settings_row.active_dataset_id:
                ds = db.query(DatasetFile).filter(
                    DatasetFile.user_id == user.id,
                    DatasetFile.dataset_id == settings_row.active_dataset_id,
                ).first()
                if ds:
                    try:
                        _activate_dataset_from_record(state, ds)
                        ds.last_used_at = datetime.now(timezone.utc)
                        db.commit()
                    except Exception as e:
                        logger.error(f"Failed to rehydrate active dataset: {e}")
    if state["df_raw"] is not None:
        return {
            "filename": state["dataset_name"],
            "rows": len(state["df_raw"]),
            "columns": len(state["df_raw"].columns),
            "column_types": get_column_info(state["df_raw"]),
            "missing_values": get_missing_values(state["df_raw"]),
            "preview": get_preview(state["df_raw"]),
            "dataset_id": state["dataset_id"],
        }
    return None


@router.get("/datasets")
async def list_datasets(user: User = Depends(get_current_user)):
    """List all persisted datasets for the current user."""
    from database import SessionLocal
    with SessionLocal() as db:
        settings_row = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
        active_id = settings_row.active_dataset_id if settings_row else None
        rows = (
            db.query(DatasetFile)
            .filter(DatasetFile.user_id == user.id)
            .order_by(DatasetFile.last_used_at.desc().nullslast(), DatasetFile.created_at.desc())
            .all()
        )
        return [
            {
                "dataset_id": r.dataset_id,
                "filename": r.filename,
                "rows": r.rows,
                "columns": r.columns,
                "created_at": r.created_at.isoformat(),
                "last_used_at": r.last_used_at.isoformat() if r.last_used_at else None,
                "active": r.dataset_id == active_id,
            }
            for r in rows
        ]


@router.get("/sample-data")
async def download_sample_data():
    """Download the sample employee dataset."""
    sample_path = "sample_employee_data.csv"
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Sample dataset not found")
    
    return FileResponse(
        path=sample_path,
        filename="sample_employee_data.csv",
        media_type="text/csv"
    )


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str, user: User = Depends(get_current_user)):
    """Return status of a background job. (Stubbed as 'finished' for now)"""
    return {"job_id": job_id, "status": "finished", "progress": 100}


@router.post("/datasets/{dataset_id}/activate")
async def activate_dataset(dataset_id: str, user: User = Depends(get_current_user)):
    """Switch the active dataset for the current user (rehydrates in-memory state)."""
    from database import SessionLocal
    with SessionLocal() as db:
        ds = db.query(DatasetFile).filter(DatasetFile.user_id == user.id, DatasetFile.dataset_id == dataset_id).first()
        if not ds:
            raise HTTPException(status_code=404, detail="Dataset not found")
        state = get_user_state(user.id)
        try:
            _activate_dataset_from_record(state, ds)
        except Exception as e:
            logger.error(f"Activation failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to activate dataset")
        ds.last_used_at = datetime.now(timezone.utc)
        db.commit()
        _set_active_dataset(db, user.id, dataset_id)

        return {
            "dataset_id": ds.dataset_id,
            "filename": ds.filename,
            "rows": len(state["df_raw"]),
            "columns": len(state["df_raw"].columns),
            "column_types": get_column_info(state["df_raw"]),
            "missing_values": get_missing_values(state["df_raw"]),
            "preview": get_preview(state["df_raw"]),
        }


@router.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str, user: User = Depends(get_current_user)):
    """Delete a dataset record for the user (does not delete shared pins/history)."""
    from database import SessionLocal
    with SessionLocal() as db:
        ds = db.query(DatasetFile).filter(DatasetFile.user_id == user.id, DatasetFile.dataset_id == dataset_id).first()
        if not ds:
            raise HTTPException(status_code=404, detail="Dataset not found")
        db.delete(ds)
        # If deleting active dataset, clear it
        settings_row = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
        if settings_row and settings_row.active_dataset_id == dataset_id:
            settings_row.active_dataset_id = None
            settings_row.updated_at = datetime.now(timezone.utc)
        db.commit()
    state = get_user_state(user.id)
    if state.get("dataset_id") == dataset_id:
        state["df_raw"] = None
        state["df_processed"] = None
        state["dataset_name"] = None
        state["dataset_id"] = None
        state["ml_results"] = {}
        state["chat_history"] = []
    return {"message": "Dataset deleted"}


# ═══════════════════════════════════════════════════════════════
# 2. RAG QUERY
# ═══════════════════════════════════════════════════════════════

@router.post("/query", response_model=QueryResponse)
async def query_dataset(req: QueryRequest, user: User = Depends(get_current_user)):
    """Natural language query against the indexed dataset using RAG."""
    state = _require_dataset(user.id)

    try:
        # Embed the query
        query_embedding = _embedding_service.embed_query(req.question)

        # Retrieve context
        if req.use_hybrid:
            docs = _retriever.hybrid_search(
                query=req.question,
                query_embedding=query_embedding,
                top_k=req.top_k,
                dataset_id=state["dataset_id"],
            )
        else:
            docs = _retriever.semantic_search(
                query_embedding=query_embedding,
                top_k=req.top_k,
                dataset_id=state["dataset_id"],
            )

        # Generate answer
        answer = _generator.generate(
            query=req.question,
            context_docs=docs,
            role=req.role.value,
            chat_history=state["chat_history"],
        )

        # Store in database
        from database import SessionLocal, ChatMessage
        with SessionLocal() as db:
            msg = ChatMessage(
                user_id=user.id,
                query=req.question,
                answer=answer,
                role=req.role.value,
                sources_count=len(docs),
            )
            db.add(msg)
            db.commit()

        # Update transient state for current session
        state["chat_history"].append({
            "query": req.question,
            "answer": answer,
            "role": req.role.value,
            "timestamp": now_iso(),
            "sources_count": len(docs),
        })

        sources = [{"text": d["text"][:200], "type": d["metadata"].get("type", "unknown"),
                     "relevance": d.get("relevance_score", 0)} for d in docs]

        return QueryResponse(
            answer=answer,
            sources=sources,
            query=req.question,
            role=req.role.value,
        )
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query/stream")
async def query_stream(req: QueryRequest, user: User = Depends(get_current_user)):
    """Stream RAG response token-by-token via SSE."""
    state = _require_dataset(user.id)

    query_embedding = _embedding_service.embed_query(req.question)

    if req.use_hybrid:
        docs = _retriever.hybrid_search(
            query=req.question,
            query_embedding=query_embedding,
            top_k=req.top_k,
            dataset_id=state["dataset_id"],
        )
    else:
        docs = _retriever.semantic_search(
            query_embedding=query_embedding,
            top_k=req.top_k,
            dataset_id=state["dataset_id"],
        )

    async def event_generator():
        full_answer = ""
        async for token in _generator.generate_stream(
            query=req.question,
            context_docs=docs,
            role=req.role.value,
            chat_history=state["chat_history"],
        ):
            full_answer += token
            yield {"event": "token", "data": json.dumps({"token": token})}

        # Store in database
        from database import SessionLocal, ChatMessage
        with SessionLocal() as db:
            msg = ChatMessage(
                user_id=user.id,
                query=req.question,
                answer=full_answer,
                role=req.role.value,
                sources_count=len(docs),
            )
            db.add(msg)
            db.commit()

        # Update transient state
        state["chat_history"].append({
            "query": req.question,
            "answer": full_answer,
            "role": req.role.value,
            "timestamp": now_iso(),
            "sources_count": len(docs),
        })
        yield {"event": "done", "data": json.dumps({"message": "Stream complete"})}

    return EventSourceResponse(event_generator())



# ═══════════════════════════════════════════════════════════════
# 3. SUMMARY & PROFILING
# ═══════════════════════════════════════════════════════════════

@router.get("/summary", response_model=SummaryResponse)
@cache(expire=3600)
async def get_dataset_summary(user: User = Depends(get_current_user)):
    """Dataset statistics, profiling, and data quality report."""
    state = _require_dataset(user.id)
    df = state["df_raw"]
    stats = get_summary_statistics(df)
    quality = get_data_quality_report(df)
    correlation = get_correlation_matrix(df)

    return safe_json({
        "statistics": stats,
        "profiling": quality,
        "data_quality": quality,
        "correlation": correlation,
    })


@router.get("/insights")
@cache(expire=3600)
async def get_ai_insights(role: str = Query(default="analyst"), user: User = Depends(get_current_user)):
    """Generate AI-powered insights from the dataset summary."""
    state = _require_dataset(user.id)
    stats = get_summary_statistics(state["df_raw"])
    insights = _generator.generate_insights(stats, role=role)
    return {"insights": insights, "role": role}

@router.get("/data/auto-eda")
async def generate_auto_eda(user: User = Depends(get_current_user)):
    """Generate a comprehensive Auto-EDA report using Sweetviz."""
    state = _require_dataset(user.id)
    df = state["df_raw"]
    
    try:
        import sweetviz as sv
        report = sv.analyze(df)
        
        # Save to a temporary file
        fd, path = tempfile.mkstemp(suffix=".html")
        os.close(fd)
        report.show_html(filepath=path, open_browser=False)
        
        with open(path, "r", encoding="utf-8") as f:
            html_content = f.read()
            
        os.remove(path)
        return HTMLResponse(content=html_content)
    except Exception as e:
        logger.error(f"Auto-EDA failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate Auto-EDA report.")



@router.post("/data/clean")
async def clean_data(options: Dict[str, Any], user: User = Depends(get_current_user)):
    """Perform data cleaning based on user-selected options."""
    state = _require_dataset(user.id)
    df_clean, report = clean_dataset(state["df_raw"], options)
    state["df_raw"] = df_clean
    return {"message": "Data cleaned successfully", "report": report}


@router.get("/data/eda")
async def get_eda(user: User = Depends(get_current_user)):
    """Return detailed EDA metrics and distributions."""
    state = _require_dataset(user.id)
    return get_eda_details(state["df_raw"])


@router.post("/data/engineer-features")
async def api_engineer_features(user: User = Depends(get_current_user)):
    """Automatically engineer new features for the dataset."""
    state = _require_dataset(user.id)
    df_engineered, report = engineer_features(state["df_raw"])
    state["df_raw"] = df_engineered
    
    n = len(report["new_features_created"])
    return {
        "message": f"Engineered {n} new feature{'s' if n != 1 else ''}." if n else "No additional features needed — dataset is already well-structured.",
        "new_features": report["new_features_created"],
        "descriptions": report.get("descriptions", []),
    }

@router.get("/data/export")
async def export_data(format: str = Query(default="csv"), user: User = Depends(get_current_user)):
    """Export the current (potentially cleaned) dataset to a specified format."""
    state = _require_dataset(user.id)
    df = state["df_raw"]
    
    if format == "csv":
        output = io.StringIO()
        df.to_csv(output, index=False)
        return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="insightforge_export.csv"'})
    elif format == "json":
        output = io.StringIO()
        df.to_json(output, orient="records")
        return Response(content=output.getvalue(), media_type="application/json", headers={"Content-Disposition": 'attachment; filename="insightforge_export.json"'})
    elif format == "excel":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False)
        return Response(content=output.getvalue(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": 'attachment; filename="insightforge_export.xlsx"'})
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format.")


# ═══════════════════════════════════════════════════════════════
# 4. MACHINE LEARNING
# ═══════════════════════════════════════════════════════════════


class SandboxRequest(BaseModel):
    script: str

@router.post("/ml/sandbox")
async def execute_sandbox(req: SandboxRequest, user: User = Depends(get_current_user)):
    """Execute a Python script in a sandboxed environment on the dataset."""
    state = _require_dataset(user.id)
    from services.sandbox import execute_sandbox_script
    try:
        result = execute_sandbox_script(req.script, state["df_raw"])
        return {"result": result}
    except Exception as e:
        logger.error(f"Sandbox execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ml/predict", response_model=PredictResponse)
async def run_prediction(req: PredictRequest, user: User = Depends(get_current_user)):
    """Run linear regression on the dataset."""
    state = _require_dataset(user.id)
    try:
        result = state["ml_engine"].run_regression(
            df=state["df_raw"],
            target_column=req.target_column,
            feature_columns=req.feature_columns,
            test_size=req.test_size,
        )
        state["ml_results"]["regression"] = result
        return PredictResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ml/cluster", response_model=ClusterResponse)
async def run_clustering(req: ClusterRequest, user: User = Depends(get_current_user)):
    """Run KMeans clustering."""
    state = _require_dataset(user.id)
    try:
        result = state["ml_engine"].run_clustering(
            df=state["df_raw"],
            n_clusters=req.n_clusters,
            feature_columns=req.feature_columns,
        )
        state["ml_results"]["clustering"] = result
        return ClusterResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Clustering failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ml/anomaly", response_model=AnomalyResponse)
async def run_anomaly_detection(req: AnomalyRequest, user: User = Depends(get_current_user)):
    """Run Isolation Forest anomaly detection."""
    state = _require_dataset(user.id)
    try:
        result = state["ml_engine"].run_anomaly_detection(
            df=state["df_raw"],
            contamination=req.contamination,
            feature_columns=req.feature_columns,
        )
        state["ml_results"]["anomaly"] = result
        return AnomalyResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ml/classify", response_model=ClassifyResponse)
async def run_classification(req: ClassifyRequest, user: User = Depends(get_current_user)):
    """Run Random Forest classification on the dataset.
    
    Automatically encodes categorical targets. Returns accuracy, F1, confusion matrix,
    and Random Forest feature importance scores.
    """
    state = _require_dataset(user.id)
    try:
        result = state["ml_engine"].run_classification(
            df=state["df_raw"],
            target_column=req.target_column,
            feature_columns=req.feature_columns,
            test_size=req.test_size,
            n_estimators=req.n_estimators,
        )
        state["ml_results"]["classification"] = result
        return ClassifyResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Classification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stats/test", response_model=StatTestResponse)
async def run_statistical_test(req: StatTestRequest, user: User = Depends(get_current_user)):
    """Run a statistical hypothesis test between two columns.

    - **auto**: detect test type from column dtypes
    - **t_test**: Welch\'s t-test (two numeric columns, tests equal means)  
    - **mannwhitney**: Mann-Whitney U (two numeric columns, non-parametric)
    - **chi_squared**: Chi-squared test of independence (two categorical columns)  
    - **anova**: One-way ANOVA (one numeric + one categorical group column)
    
    Returns test statistic, p-value, significance flag, effect size, and a plain-English interpretation.
    """
    state = _require_dataset(user.id)
    try:
        result = state["ml_engine"].run_statistical_tests(
            df=state["df_raw"],
            col1=req.col1,
            col2=req.col2,
            test_type=req.test_type,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Statistical test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ═══════════════════════════════════════════════════════════════
# 6. SHARED INSIGHTS (PINS)
# ═══════════════════════════════════════════════════════════════

@router.post("/pins", response_model=PinResponse)
async def create_pin(req: PinCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Pin an insight or chart for sharing."""
    pin_id = str(uuid.uuid4())
    pin = SharedPin(
        id=pin_id,
        user_id=user.id,
        title=req.title,
        content_type=req.content_type,
        content_data=json.dumps(req.content_data)
    )
    db.add(pin)
    db.commit()
    return PinResponse(
        id=pin.id,
        title=pin.title,
        content_type=pin.content_type,
        content_data=req.content_data,
        created_at=pin.created_at.isoformat()
    )

@router.get("/pins/{pin_id}", response_model=PinResponse)
async def get_pin(pin_id: str, db: Session = Depends(get_db)):
    """Get a shared pin by ID (public access allowed)."""
    pin = db.query(SharedPin).filter(SharedPin.id == pin_id).first()
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found")
    return PinResponse(
        id=pin.id,
        title=pin.title,
        content_type=pin.content_type,
        content_data=json.loads(pin.content_data),
        created_at=pin.created_at.isoformat()
    )

@router.get("/pins/gallery", response_model=List[PinResponse])
async def list_all_pins(db: Session = Depends(get_db)):
    """List all public pins across the workspace (Gallery mode)."""
    pins = db.query(SharedPin).order_by(SharedPin.created_at.desc()).limit(50).all()
    return [
        PinResponse(
            id=p.id,
            title=p.title,
            content_type=p.content_type,
            content_data=json.loads(p.content_data),
            created_at=p.created_at.isoformat()
        ) for p in pins
    ]

@router.get("/pins", response_model=List[PinResponse])
async def list_user_pins(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all pins for the current user."""
    pins = db.query(SharedPin).filter(SharedPin.user_id == user.id).order_by(SharedPin.created_at.desc()).all()
    return [
        PinResponse(
            id=p.id,
            title=p.title,
            content_type=p.content_type,
            content_data=json.loads(p.content_data),
            created_at=p.created_at.isoformat()
        ) for p in pins
    ]
@router.post("/ml/forecast", response_model=ForecastResponse)
async def run_forecasting(req: ForecastRequest, user: User = Depends(get_current_user)):
    """Run Time-Series Forecasting."""
    state = _require_dataset(user.id)
    try:
        result = state["ml_engine"].run_forecasting(
            df=state["df_raw"],
            date_column=req.date_column,
            target_column=req.target_column,
            periods=req.periods,
        )
        state["ml_results"]["forecasting"] = result
        return ForecastResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Forecasting failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# 5. REPORT & HISTORY
# ═══════════════════════════════════════════════════════════════

@router.post("/report", response_model=ReportResponse)
async def generate_report(role: str = Query(default="analyst"), user: User = Depends(get_current_user)):
    """Generate a downloadable PDF report."""
    state = _require_dataset(user.id)

    stats = get_summary_statistics(state["df_raw"])
    insights = _generator.generate_insights(stats, role=role)
    chart_insights = _generator.generate_chart_insights(stats, role=role)

    filename = state["report_generator"].generate_report(
        dataset_name=state["dataset_name"],
        summary_stats=stats,
        insights=insights,
        chart_insights=chart_insights,
        ml_results=state["ml_results"].get("regression"),
        anomaly_results=state["ml_results"].get("anomaly"),
    )

    return ReportResponse(
        report_url=f"/reports/{filename}",
        filename=filename,
        message="Report generated successfully",
    )


@router.get("/history", response_model=List[ChatHistoryItem])
async def get_chat_history(user: User = Depends(get_current_user)):
    """Return previous queries and answers for the current user."""
    from database import SessionLocal, ChatMessage
    with SessionLocal() as db:
        history = db.query(ChatMessage).filter(ChatMessage.user_id == user.id).order_by(ChatMessage.created_at.asc()).all()
        return [
            ChatHistoryItem(
                query=m.query,
                answer=m.answer,
                role=m.role,
                timestamp=m.created_at.isoformat(),
                sources_count=m.sources_count,
            )
            for m in history
        ]


@router.delete("/history")
async def clear_chat_history(user: User = Depends(get_current_user)):
    """Clear all chat history for the current user."""
    from database import SessionLocal, ChatMessage
    with SessionLocal() as db:
        db.query(ChatMessage).filter(ChatMessage.user_id == user.id).delete()
        db.commit()
    state = get_user_state(user.id)
    state["chat_history"] = []
    return {"message": "Chat history cleared"}


# ═══════════════════════════════════════════════════════════════
# 6. DATA PREVIEW & COLUMNS
# ═══════════════════════════════════════════════════════════════

@router.get("/preview")
async def get_data_preview(rows: int = Query(default=10, ge=1, le=100), user: User = Depends(get_current_user)):
    """Return first N rows of the uploaded dataset."""
    state = _require_dataset(user.id)
    return {
        "preview": get_preview(state["df_raw"], n=rows),
        "total_rows": len(state["df_raw"]),
        "columns": state["df_raw"].columns.tolist(),
    }


@router.get("/columns")
async def get_columns(user: User = Depends(get_current_user)):
    """Return column names and types."""
    state = _require_dataset(user.id)
    df = state["df_raw"]
    numeric = df.select_dtypes(include=["number"]).columns.tolist()
    categorical = df.select_dtypes(include=["object", "category"]).columns.tolist()
    return {
        "all_columns": df.columns.tolist(),
        "numeric_columns": numeric,
        "categorical_columns": categorical,
        "column_types": get_column_info(df),
    }