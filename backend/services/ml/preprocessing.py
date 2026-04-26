"""
InsightForge AI — Data Preprocessing Service
Handles missing-value imputation, encoding, and normalisation.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler
from typing import Dict, Tuple, List, Optional
from loguru import logger


class DataPreprocessor:
    """Stateful preprocessor — stores encoders & scalers for inverse transforms."""

    def __init__(self):
        self.label_encoders: Dict[str, LabelEncoder] = {}
        self.scaler: Optional[StandardScaler] = None
        self.numeric_cols: List[str] = []
        self.categorical_cols: List[str] = []
        self.original_df: Optional[pd.DataFrame] = None

    def fit_transform(
        self,
        df: pd.DataFrame,
        impute_strategy: str = "mean",
        normalize: bool = True,
        encode_categoricals: bool = True,
    ) -> pd.DataFrame:
        """Full preprocessing pipeline: impute → encode → normalise."""
        self.original_df = df.copy()
        processed = df.copy()

        self.numeric_cols = processed.select_dtypes(include=[np.number]).columns.tolist()
        self.categorical_cols = processed.select_dtypes(
            include=["object", "category"]
        ).columns.tolist()

        # ── 1. Impute missing values ──────────────────────────
        processed = self._impute(processed, impute_strategy)

        # ── 2. Encode categoricals ────────────────────────────
        if encode_categoricals and self.categorical_cols:
            processed = self._encode(processed)

        # ── 3. Normalise numerics ─────────────────────────────
        if normalize and self.numeric_cols:
            processed = self._normalize(processed)

        logger.info(
            f"Preprocessing complete: {len(self.numeric_cols)} numeric, "
            f"{len(self.categorical_cols)} categorical columns"
        )
        return processed

    def _impute(self, df: pd.DataFrame, strategy: str) -> pd.DataFrame:
        """Impute missing values based on the chosen strategy."""
        if strategy == "drop":
            before = len(df)
            df = df.dropna()
            logger.info(f"Dropped {before - len(df)} rows with missing values")
            return df

        for col in self.numeric_cols:
            if df[col].isnull().any():
                if strategy == "mean":
                    fill_val = df[col].mean()
                elif strategy == "median":
                    fill_val = df[col].median()
                else:  # mode
                    fill_val = df[col].mode().iloc[0] if not df[col].mode().empty else 0
                df[col] = df[col].fillna(fill_val)

        for col in self.categorical_cols:
            if df[col].isnull().any():
                fill_val = df[col].mode().iloc[0] if not df[col].mode().empty else "UNKNOWN"
                df[col] = df[col].fillna(fill_val)

        return df

    def _encode(self, df: pd.DataFrame) -> pd.DataFrame:
        """Label-encode all categorical columns."""
        for col in self.categorical_cols:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            self.label_encoders[col] = le
            logger.debug(f"Encoded column '{col}' → {len(le.classes_)} classes")
        return df

    def _normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standard-scale numeric columns."""
        self.scaler = StandardScaler()
        df[self.numeric_cols] = self.scaler.fit_transform(df[self.numeric_cols])
        return df

    def get_feature_names(self) -> List[str]:
        """Return all feature column names after preprocessing."""
        return self.numeric_cols + self.categorical_cols
