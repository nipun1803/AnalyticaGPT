"""
InsightForge AI — CSV Parser & Data Utilities
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple
from loguru import logger


def parse_csv(filepath: str) -> pd.DataFrame:
    """Read a CSV file with automatic encoding/separator detection."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {filepath}")

    # Try common encodings
    for encoding in ["utf-8", "latin-1", "cp1252"]:
        try:
            df = pd.read_csv(filepath, encoding=encoding)
            logger.info(f"Parsed {filepath} with encoding={encoding}: {df.shape}")
            return df
        except (UnicodeDecodeError, pd.errors.ParserError):
            continue

    raise ValueError(f"Could not parse CSV file: {filepath}")


def get_column_info(df: pd.DataFrame) -> Dict[str, str]:
    """Return a mapping of column name → dtype string."""
    return {col: str(dtype) for col, dtype in df.dtypes.items()}


def get_missing_values(df: pd.DataFrame) -> Dict[str, int]:
    """Return a mapping of column name → count of missing values."""
    return df.isnull().sum().to_dict()


def get_preview(df: pd.DataFrame, n: int = 10) -> list:
    """Return first n rows as list of dicts (JSON-safe)."""
    preview_df = df.head(n).copy()
    # Convert problematic types
    for col in preview_df.columns:
        if preview_df[col].dtype == "datetime64[ns]":
            preview_df[col] = preview_df[col].astype(str)
        elif preview_df[col].dtype == "object":
            preview_df[col] = preview_df[col].fillna("")
    import numpy as np
    preview_df = preview_df.replace({np.nan: None})
    return preview_df.to_dict(orient="records")


def get_summary_statistics(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate comprehensive summary statistics."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

    stats: Dict[str, Any] = {
        "shape": {"rows": df.shape[0], "columns": df.shape[1]},
        "numeric_summary": {},
        "categorical_summary": {},
    }

    if numeric_cols:
        desc = df[numeric_cols].describe().to_dict()
        # Add skewness & kurtosis
        for col in numeric_cols:
            desc[col]["skewness"] = float(df[col].skew())
            desc[col]["kurtosis"] = float(df[col].kurtosis())
        stats["numeric_summary"] = desc

    if categorical_cols:
        for col in categorical_cols:
            vc = df[col].value_counts().head(10)
            stats["categorical_summary"][col] = {
                "unique": int(df[col].nunique()),
                "top_values": vc.to_dict(),
                "null_count": int(df[col].isnull().sum()),
            }

    return stats


def get_data_quality_report(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate a data-quality / profiling report."""
    total = len(df)
    report = {
        "total_rows": total,
        "total_columns": len(df.columns),
        "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1e6, 2),
        "duplicate_rows": int(df.duplicated().sum()),
        "complete_rows": int(df.dropna().shape[0]),
        "completeness_pct": round(df.dropna().shape[0] / total * 100, 2) if total else 0,
        "columns": {},
    }

    for col in df.columns:
        col_info: Dict[str, Any] = {
            "dtype": str(df[col].dtype),
            "null_count": int(df[col].isnull().sum()),
            "null_pct": round(df[col].isnull().mean() * 100, 2),
            "unique_count": int(df[col].nunique()),
            "unique_pct": round(df[col].nunique() / total * 100, 2) if total else 0,
        }
        if pd.api.types.is_numeric_dtype(df[col]):
            col_info["min"] = float(df[col].min()) if not df[col].isnull().all() else None
            col_info["max"] = float(df[col].max()) if not df[col].isnull().all() else None
            col_info["mean"] = float(df[col].mean()) if not df[col].isnull().all() else None
            col_info["zero_count"] = int((df[col] == 0).sum())
            col_info["negative_count"] = int((df[col] < 0).sum())
        report["columns"][col] = col_info

    return report


def get_correlation_matrix(df: pd.DataFrame) -> Dict[str, Any]:
    """Return correlation matrix for numeric columns."""
    numeric_df = df.select_dtypes(include=[np.number])
    if numeric_df.empty:
        return {}
    corr = numeric_df.corr()
    return {
        "columns": corr.columns.tolist(),
        "values": corr.values.tolist(),
    }


def clean_dataset(df: pd.DataFrame, options: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Perform data cleaning based on provided options."""
    df_clean = df.copy()
    actions = []

    if options.get("drop_duplicates"):
        before = len(df_clean)
        df_clean = df_clean.drop_duplicates()
        after = len(df_clean)
        if before > after:
            actions.append(f"Dropped {before - after} duplicate rows")

    if options.get("drop_null_rows"):
        before = len(df_clean)
        df_clean = df_clean.dropna()
        after = len(df_clean)
        if before > after:
            actions.append(f"Dropped {before - after} rows containing null values")

    if options.get("fill_numeric_nulls"):
        strategy = options.get("numeric_strategy", "mean")
        numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df_clean[col].isnull().any():
                val = getattr(df_clean[col], strategy)()
                df_clean[col] = df_clean[col].fillna(val)
                actions.append(f"Filled nulls in {col} using {strategy}")

    if options.get("handle_outliers"):
        numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            q1 = df_clean[col].quantile(0.25)
            q3 = df_clean[col].quantile(0.75)
            iqr = q3 - q1
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            outliers = ((df_clean[col] < lower) | (df_clean[col] > upper)).sum()
            if outliers > 0:
                df_clean[col] = df_clean[col].clip(lower, upper)
                actions.append(f"Clipped {outliers} outliers in {col}")

    return df_clean, {"actions": actions, "rows_removed": len(df) - len(df_clean)}


def get_eda_details(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate detailed EDA insights (distributions, cardinality, etc)."""
    eda = {"distributions": {}, "cardinality": {}}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            # Bin numeric data for distribution
            counts, bins = np.histogram(df[col].dropna(), bins=10)
            eda["distributions"][col] = {
                "bins": bins.tolist(),
                "counts": counts.tolist(),
                "type": "numeric"
            }
        else:
            # Value counts for categorical
            vc = df[col].value_counts().head(10)
            eda["distributions"][col] = {
                "labels": vc.index.tolist(),
                "values": vc.values.tolist(),
                "type": "categorical"
            }
            eda["cardinality"][col] = int(df[col].nunique())
    return eda


def engineer_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Automatically suggest and create new features from existing columns."""
    df_eng = df.copy()
    new_features = []

    # 1. Extract Date Parts
    for col in df_eng.columns:
        # Check if column name suggests a date or is of datetime type
        if pd.api.types.is_datetime64_any_dtype(df_eng[col]) or "date" in col.lower() or "time" in col.lower():
            try:
                dt_col = pd.to_datetime(df_eng[col], errors='coerce')
                if dt_col.notna().any():
                    df_eng[f"{col}_year"] = dt_col.dt.year
                    df_eng[f"{col}_month"] = dt_col.dt.month
                    df_eng[f"{col}_day"] = dt_col.dt.day
                    df_eng[f"{col}_dayofweek"] = dt_col.dt.dayofweek
                    new_features.extend([f"{col}_year", f"{col}_month", f"{col}_day", f"{col}_dayofweek"])
            except Exception:
                pass

    # 2. Simple Interaction Features (Product of numeric columns)
    numeric_cols = df_eng.select_dtypes(include=[np.number]).columns.tolist()
    if len(numeric_cols) >= 2:
        # Create an interaction between the first two numeric features as an example
        col1, col2 = numeric_cols[0], numeric_cols[1]
        new_col = f"{col1}_x_{col2}"
        df_eng[new_col] = df_eng[col1] * df_eng[col2]
        new_features.append(new_col)

        # Create ratio feature if col2 does not contain zero
        if (df_eng[col2] != 0).all():
            ratio_col = f"{col1}_ratio_{col2}"
            df_eng[ratio_col] = df_eng[col1] / df_eng[col2]
            new_features.append(ratio_col)

    return df_eng, {"new_features_created": new_features}
