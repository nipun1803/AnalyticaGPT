"""
InsightForge AI — CSV Parser & Data Utilities
Intelligent data analysis: studies the dataset before acting.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple, List
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


# ── Column Classification Helpers ──────────────────────────────

def _is_id_column(df: pd.DataFrame, col: str) -> bool:
    """Detect if a column is likely an ID/index (not analytically useful)."""
    if df[col].dtype == "object":
        return False
    n = len(df)
    if n == 0:
        return False
    nunique = df[col].nunique()
    # All unique integers → likely an ID
    if nunique == n and pd.api.types.is_integer_dtype(df[col]):
        return True
    # Column name hints
    name_lower = col.lower().strip()
    id_hints = ["_id", "id", "index", "serial", "srno", "sr_no", "slno", "sl_no", "row_num", "record_id"]
    if any(name_lower == h or name_lower.endswith(h) for h in id_hints):
        return True
    return False


def _is_constant_column(df: pd.DataFrame, col: str) -> bool:
    """Column has ≤ 1 unique non-null value."""
    return df[col].nunique(dropna=True) <= 1


def _classify_columns(df: pd.DataFrame) -> Dict[str, List[str]]:
    """Classify columns into meaningful categories for smart analysis."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    datetime_cols = df.select_dtypes(include=["datetime64"]).columns.tolist()

    id_cols = [c for c in numeric_cols if _is_id_column(df, c)]
    constant_cols = [c for c in df.columns if _is_constant_column(df, c)]

    # Analytically useful columns = not IDs, not constants
    useful_numeric = [c for c in numeric_cols if c not in id_cols and c not in constant_cols]
    useful_categorical = [c for c in categorical_cols if c not in constant_cols]

    # High-cardinality categorical (likely free text, not useful for charts)
    high_card_cat = [c for c in useful_categorical if df[c].nunique() > 50]
    chart_categorical = [c for c in useful_categorical if c not in high_card_cat]

    return {
        "numeric": useful_numeric,
        "categorical": useful_categorical,
        "chart_categorical": chart_categorical,
        "high_cardinality": high_card_cat,
        "datetime": datetime_cols,
        "id_columns": id_cols,
        "constant_columns": constant_cols,
        "all": df.columns.tolist(),
    }


def get_column_info(df: pd.DataFrame) -> Dict[str, List[str]]:
    """
    Categorizes columns into numeric, categorical, and datetime.
    Includes 'Smart Detection' for IDs, Zip Codes, and Years.
    """
    numeric = []
    categorical = []
    datetime_cols = []
    
    for col in df.columns:
        # 1. Check for Datetime
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            datetime_cols.append(col)
            continue
            
        # 2. Smart Detection: Is this a "Fake" Number? (IDs, ZipCodes, Years)
        is_num = pd.api.types.is_numeric_dtype(df[col])
        if is_num:
            col_lower = col.lower()
            unique_count = df[col].nunique()
            # If name suggests it's an ID or Zip, or it has very few unique values
            if any(key in col_lower for key in ["id", "zip", "post", "code", "year", "phone", "key"]):
                categorical.append(col)
                continue
            if unique_count < 20 and len(df) > 100: 
                 categorical.append(col)
                 continue
            numeric.append(col)
        else:
            categorical.append(col)
            
    return {
        "numeric": numeric,
        "categorical": categorical,
        "datetime": datetime_cols,
    }


def get_missing_values(df: pd.DataFrame) -> Dict[str, int]:
    """Return a mapping of column name → count of missing values."""
    return df.isnull().sum().to_dict()


def get_preview(df: pd.DataFrame, n: int = 10) -> list:
    """Return first n rows as list of dicts (JSON-safe)."""
    preview_df = df.head(n).copy()
    for col in preview_df.columns:
        if preview_df[col].dtype == "datetime64[ns]":
            preview_df[col] = preview_df[col].astype(str)
        elif preview_df[col].dtype == "object":
            preview_df[col] = preview_df[col].fillna("")
    preview_df = preview_df.replace({np.nan: None, np.inf: None, -np.inf: None})
    return preview_df.to_dict(orient="records")


def get_summary_statistics(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate comprehensive summary statistics."""
    col_info = _classify_columns(df)
    numeric_cols = col_info["numeric"]
    categorical_cols = col_info["categorical"]

    stats: Dict[str, Any] = {
        "shape": {"rows": df.shape[0], "columns": df.shape[1]},
        "numeric_summary": {},
        "categorical_summary": {},
        "column_classification": {
            "id_columns": col_info["id_columns"],
            "constant_columns": col_info["constant_columns"],
            "datetime_columns": col_info["datetime"],
        },
    }

    if numeric_cols:
        desc = df[numeric_cols].describe().to_dict()
        for col in numeric_cols:
            s = df[col].dropna()
            if len(s) > 0:
                desc[col]["skewness"] = round(float(s.skew()), 4)
                desc[col]["kurtosis"] = round(float(s.kurtosis()), 4)
            else:
                desc[col]["skewness"] = 0.0
                desc[col]["kurtosis"] = 0.0
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
    """Return correlation matrix for meaningful numeric columns (skip IDs)."""
    col_info = _classify_columns(df)
    useful = col_info["numeric"]
    if not useful:
        return {}
    numeric_df = df[useful]
    corr = numeric_df.corr()
    # Replace NaN with 0 for JSON safety
    corr = corr.fillna(0)
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
                if strategy == "zero":
                    val = 0
                else:
                    val = getattr(df_clean[col], strategy)()
                df_clean[col] = df_clean[col].fillna(val)
                actions.append(f"Filled {int(df[col].isnull().sum())} nulls in '{col}' with {strategy} ({val:.2f})")

    if options.get("handle_outliers"):
        col_info = _classify_columns(df_clean)
        for col in col_info["numeric"]:
            q1 = df_clean[col].quantile(0.25)
            q3 = df_clean[col].quantile(0.75)
            iqr = q3 - q1
            if iqr == 0:
                continue
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            outliers = ((df_clean[col] < lower) | (df_clean[col] > upper)).sum()
            if outliers > 0:
                df_clean[col] = df_clean[col].clip(lower, upper)
                actions.append(f"Clipped {outliers} outliers in '{col}' (range: {lower:.2f}–{upper:.2f})")

    if not actions:
        actions.append("Dataset is already clean — no changes needed")

    return df_clean, {"actions": actions, "rows_removed": len(df) - len(df_clean)}


def get_eda_details(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate intelligent EDA — only show meaningful distributions."""
    col_info = _classify_columns(df)
    eda = {"distributions": {}, "cardinality": {}, "insights": []}

    # Only chart meaningful numeric columns
    for col in col_info["numeric"]:
        series = df[col].dropna()
        if len(series) < 2:
            continue
        counts, bins = np.histogram(series, bins=min(15, max(5, int(np.sqrt(len(series))))))
        eda["distributions"][col] = {
            "bins": [round(float(b), 4) for b in bins],
            "counts": [int(c) for c in counts],
            "type": "numeric",
            "stats": {
                "mean": round(float(series.mean()), 4),
                "median": round(float(series.median()), 4),
                "std": round(float(series.std()), 4),
                "skewness": round(float(series.skew()), 4),
            },
        }

    # Only chart low-cardinality categorical columns (≤30 unique)
    for col in col_info["chart_categorical"]:
        vc = df[col].value_counts().head(15)
        if len(vc) == 0:
            continue
        eda["distributions"][col] = {
            "labels": [str(l) for l in vc.index.tolist()],
            "values": [int(v) for v in vc.values.tolist()],
            "type": "categorical",
        }
        eda["cardinality"][col] = int(df[col].nunique())

    # Add insights about skipped columns
    if col_info["id_columns"]:
        eda["insights"].append(f"Skipped ID columns: {', '.join(col_info['id_columns'])}")
    if col_info["constant_columns"]:
        eda["insights"].append(f"Skipped constant columns: {', '.join(col_info['constant_columns'])}")
    if col_info["high_cardinality"]:
        eda["insights"].append(
            f"Skipped high-cardinality text columns (>50 unique): {', '.join(col_info['high_cardinality'])}"
        )

    return eda


def engineer_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Intelligently engineer features by studying the dataset first."""
    df_eng = df.copy()
    new_features = []
    descriptions = []
    col_info = _classify_columns(df_eng)

    # 1. Extract Date Parts from datetime-like columns
    for col in col_info["datetime"]:
        try:
            dt_col = pd.to_datetime(df_eng[col], errors="coerce")
            valid_ratio = dt_col.notna().sum() / len(df_eng)
            if valid_ratio < 0.5:
                continue

            df_eng[f"{col}_year"] = dt_col.dt.year
            df_eng[f"{col}_month"] = dt_col.dt.month
            df_eng[f"{col}_dayofweek"] = dt_col.dt.dayofweek
            new_features.extend([f"{col}_year", f"{col}_month", f"{col}_dayofweek"])
            descriptions.append(f"Extracted year, month, day-of-week from '{col}'")
        except Exception:
            pass

    # 2. Create meaningful ratios between correlated numeric pairs
    numeric = col_info["numeric"]
    if len(numeric) >= 2:
        # Calculate correlation and set diagonal to 0
        corr_matrix = df_eng[numeric].corr().abs()
        mask = np.eye(len(corr_matrix), dtype=bool)
        corr_matrix = corr_matrix.mask(mask, 0)

        # Get top 3 correlated pairs for ratio features
        pairs_created = 0
        for _ in range(min(3, len(numeric) * (len(numeric) - 1) // 2)):
            if corr_matrix.max().max() < 0.3:
                break
            max_idx = corr_matrix.stack().idxmax()
            c1, c2 = max_idx
            corr_matrix.loc[c1, c2] = 0
            corr_matrix.loc[c2, c1] = 0

            # Only create ratio if denominator has no zeros
            if (df_eng[c2] != 0).all() and (df_eng[c1] != 0).all():
                ratio_name = f"{c1}_per_{c2}"
                df_eng[ratio_name] = (df_eng[c1] / df_eng[c2]).round(4)
                new_features.append(ratio_name)
                descriptions.append(f"Created ratio '{c1}/{c2}' (correlation: {df[c1].corr(df[c2]):.2f})")
                pairs_created += 1

    # 3. Bin highly skewed numeric columns into quantile groups
    for col in numeric:
        series = df_eng[col].dropna()
        if len(series) < 20:
            continue
        skew = abs(series.skew())
        if skew > 2.0:
            bin_name = f"{col}_bin"
            try:
                df_eng[bin_name] = pd.qcut(df_eng[col], q=4, labels=["Low", "Medium", "High", "Very High"],
                                           duplicates="drop")
                new_features.append(bin_name)
                descriptions.append(f"Binned skewed column '{col}' (skew={skew:.1f}) into 4 quantile groups")
            except Exception:
                pass

    # 4. Flag missing values as a feature (if any column has >5% missing)
    for col in df.columns:
        miss_pct = df[col].isnull().mean()
        if 0.05 < miss_pct < 0.95:
            flag_name = f"{col}_is_missing"
            df_eng[flag_name] = df[col].isnull().astype(int)
            new_features.append(flag_name)
            descriptions.append(f"Created missing indicator for '{col}' ({miss_pct*100:.0f}% missing)")

    if not new_features:
        descriptions.append("Dataset already has well-structured features — no additional engineering needed")

    return df_eng, {"new_features_created": new_features, "descriptions": descriptions}
