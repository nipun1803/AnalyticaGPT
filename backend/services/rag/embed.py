"""
InsightForge AI — Embedding Service
Converts dataset content into vector embeddings using sentence-transformers.
Includes intelligent chunking and caching.
"""

import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Tuple
from loguru import logger

from config import settings
from utils.helpers import save_cache, load_cache, file_hash


class EmbeddingService:
    """Generates and caches embeddings for structured data chunks."""

    def __init__(self):
        self._model = None

    @property
    def model(self) -> SentenceTransformer:
        """Lazy-load the embedding model."""
        if self._model is None:
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
        return self._model

    def create_chunks(self, df: pd.DataFrame, dataset_name: str = "dataset") -> List[Dict[str, Any]]:
        """
        Convert a DataFrame into structured text chunks for embedding.

        Strategy (intelligent, not just row-wise):
          1. Global summary chunk
          2. Per-column statistical summary chunks
          3. Row-wise data chunks (batched for efficiency)
          4. Correlation & pattern chunks
        """
        chunks: List[Dict[str, Any]] = []

        # ── 1. Global dataset summary ─────────────────────────
        n_rows, n_cols = df.shape
        col_list = ", ".join(df.columns.tolist())
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

        summary_text = (
            f"Dataset '{dataset_name}' has {n_rows} rows and {n_cols} columns. "
            f"Columns: {col_list}. "
            f"Numeric columns ({len(numeric_cols)}): {', '.join(numeric_cols)}. "
            f"Categorical columns ({len(cat_cols)}): {', '.join(cat_cols)}. "
            f"Missing values: {df.isnull().sum().sum()} total across all columns. "
            f"Duplicate rows: {df.duplicated().sum()}."
        )
        chunks.append({
            "text": summary_text,
            "metadata": {"type": "summary", "scope": "global"},
        })

        # ── 2. Per-column statistical summaries ───────────────
        for col in numeric_cols:
            col_data = df[col].dropna()
            if col_data.empty:
                continue
            text = (
                f"Column '{col}' (numeric): "
                f"min={col_data.min():.4f}, max={col_data.max():.4f}, "
                f"mean={col_data.mean():.4f}, median={col_data.median():.4f}, "
                f"std={col_data.std():.4f}, "
                f"missing={df[col].isnull().sum()}, "
                f"skewness={col_data.skew():.4f}, "
                f"kurtosis={col_data.kurtosis():.4f}."
            )
            chunks.append({
                "text": text,
                "metadata": {"type": "column_stats", "column": col, "dtype": "numeric"},
            })

        for col in cat_cols:
            vc = df[col].value_counts().head(10)
            top_vals = ", ".join([f"{k} ({v})" for k, v in vc.items()])
            text = (
                f"Column '{col}' (categorical): "
                f"{df[col].nunique()} unique values. "
                f"Top values: {top_vals}. "
                f"Missing: {df[col].isnull().sum()}."
            )
            chunks.append({
                "text": text,
                "metadata": {"type": "column_stats", "column": col, "dtype": "categorical"},
            })

        # ── 3. Correlation insights ───────────────────────────
        if len(numeric_cols) >= 2:
            corr_matrix = df[numeric_cols].corr()
            strong_corrs = []
            for i in range(len(numeric_cols)):
                for j in range(i + 1, len(numeric_cols)):
                    val = corr_matrix.iloc[i, j]
                    if abs(val) > 0.5:
                        direction = "positive" if val > 0 else "negative"
                        strong_corrs.append(
                            f"{numeric_cols[i]} and {numeric_cols[j]}: "
                            f"{direction} correlation ({val:.3f})"
                        )
            if strong_corrs:
                corr_text = (
                    f"Notable correlations in the dataset: "
                    f"{'; '.join(strong_corrs[:15])}."
                )
                chunks.append({
                    "text": corr_text,
                    "metadata": {"type": "correlation", "scope": "global"},
                })

        # ── 4. Row-wise data chunks (batched) ─────────────────
        batch_size = 5  # Group rows for richer context
        for start in range(0, min(n_rows, 500), batch_size):  # Cap at 500 rows
            end = min(start + batch_size, n_rows)
            batch = df.iloc[start:end]
            rows_text = []
            for idx, row in batch.iterrows():
                row_str = ", ".join(
                    [f"{col}={row[col]}" for col in df.columns if pd.notna(row[col])]
                )
                rows_text.append(f"Row {idx}: {row_str}")
            text = f"Data records (rows {start}-{end-1}): " + " | ".join(rows_text)
            chunks.append({
                "text": text,
                "metadata": {
                    "type": "data_rows",
                    "start_row": start,
                    "end_row": end - 1,
                },
            })

        logger.info(f"Created {len(chunks)} chunks from dataset ({n_rows} rows)")
        return chunks

    def embed_texts(self, texts: List[str], cache_key: str | None = None) -> np.ndarray:
        """Generate embeddings for a list of texts, with optional caching."""
        if cache_key:
            cached = load_cache(f"embeddings_{cache_key}")
            if cached is not None:
                logger.info(f"Loaded cached embeddings for key={cache_key}")
                return cached

        logger.info(f"Generating embeddings for {len(texts)} texts...")
        embeddings = self.model.encode(texts, show_progress_bar=True, batch_size=32)

        if cache_key:
            save_cache(f"embeddings_{cache_key}", embeddings)

        return embeddings

    def embed_query(self, query: str) -> np.ndarray:
        """Embed a single query string."""
        return self.model.encode([query])[0]
