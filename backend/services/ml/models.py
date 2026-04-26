"""
InsightForge AI — Machine Learning Models Service
Provides regression, clustering, and anomaly detection with explainability.
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import IsolationForest, GradientBoostingRegressor
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    r2_score,
    silhouette_score,
)
from sklearn.inspection import permutation_importance
from typing import Dict, Any, List, Optional, Tuple
from loguru import logger


class MLEngine:
    """Unified ML engine for regression, clustering, and anomaly detection."""

    def __init__(self):
        self.regression_model = None
        self.cluster_model = None
        self.anomaly_model = None
        self._last_X_test = None
        self._last_y_test = None

    # ── Regression ─────────────────────────────────────────────
    def run_regression(
        self,
        df: pd.DataFrame,
        target_column: str,
        feature_columns: Optional[List[str]] = None,
        test_size: float = 0.2,
    ) -> Dict[str, Any]:
        """Train a linear regression model and return metrics + feature importance."""
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset")

        # Select features
        if feature_columns:
            features = [c for c in feature_columns if c in df.columns and c != target_column]
        else:
            features = [
                c
                for c in df.select_dtypes(include=[np.number]).columns
                if c != target_column
            ]

        if not features:
            raise ValueError("No numeric feature columns available for regression")

        X = df[features].dropna()
        y = df.loc[X.index, target_column].dropna()
        common_idx = X.index.intersection(y.index)
        X, y = X.loc[common_idx], y.loc[common_idx]

        if len(X) < 10:
            raise ValueError("Not enough data points for regression (need ≥ 10)")

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )

        # Fit model
        model = LinearRegression()
        model.fit(X_train, y_train)
        self.regression_model = model
        self._last_X_test = X_test
        self._last_y_test = y_test

        y_pred = model.predict(X_test)

        # Metrics
        metrics = {
            "r2_score": round(float(r2_score(y_test, y_pred)), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
            "mae": round(float(mean_absolute_error(y_test, y_pred)), 4),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        }

        # Feature importance via coefficients
        importance = [
            {"feature": feat, "importance": round(float(abs(coef)), 6)}
            for feat, coef in sorted(
                zip(features, model.coef_), key=lambda x: abs(x[1]), reverse=True
            )
        ]

        # Sample predictions
        sample_preds = []
        for i in range(min(5, len(X_test))):
            row = X_test.iloc[i].to_dict()
            row["actual"] = float(y_test.iloc[i])
            row["predicted"] = round(float(y_pred[i]), 4)
            sample_preds.append(row)

        explanation = self._generate_regression_explanation(metrics, importance, target_column)

        logger.info(f"Regression on '{target_column}': R²={metrics['r2_score']}")
        return {
            "task": "regression",
            "target": target_column,
            "metrics": metrics,
            "feature_importance": importance,
            "predictions_sample": sample_preds,
            "explanation": explanation,
        }

    # ── Clustering ─────────────────────────────────────────────
    def run_clustering(
        self,
        df: pd.DataFrame,
        n_clusters: Optional[int] = None,
        feature_columns: Optional[List[str]] = None,
        max_clusters: int = 10,
    ) -> Dict[str, Any]:
        """KMeans clustering with optional auto-selection via silhouette score."""
        if feature_columns:
            features = [c for c in feature_columns if c in df.columns]
        else:
            features = df.select_dtypes(include=[np.number]).columns.tolist()

        if len(features) < 2:
            raise ValueError("Need at least 2 numeric columns for clustering")

        X = df[features].dropna()
        if len(X) < 10:
            raise ValueError("Need at least 10 rows for clustering")

        # Auto-select k using silhouette
        if n_clusters is None:
            best_k, best_score = 2, -1
            max_k = min(max_clusters, len(X) - 1)
            for k in range(2, max_k + 1):
                km = KMeans(n_clusters=k, random_state=42, n_init=10)
                labels = km.fit_predict(X)
                score = silhouette_score(X, labels)
                if score > best_score:
                    best_k, best_score = k, score
            n_clusters = best_k
            logger.info(f"Auto-selected k={n_clusters} (silhouette={best_score:.4f})")

        model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = model.fit_predict(X)
        self.cluster_model = model

        sil_score = float(silhouette_score(X, labels))
        cluster_sizes = pd.Series(labels).value_counts().sort_index()

        return {
            "n_clusters": n_clusters,
            "cluster_sizes": {f"Cluster {k}": int(v) for k, v in cluster_sizes.items()},
            "cluster_centers": model.cluster_centers_.tolist(),
            "silhouette_score": round(sil_score, 4),
            "labels": labels.tolist(),
            "feature_columns": features,
        }

    # ── Anomaly Detection ──────────────────────────────────────
    def run_anomaly_detection(
        self,
        df: pd.DataFrame,
        contamination: float = 0.05,
        feature_columns: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Isolation Forest anomaly detection."""
        if feature_columns:
            features = [c for c in feature_columns if c in df.columns]
        else:
            features = df.select_dtypes(include=[np.number]).columns.tolist()

        if not features:
            raise ValueError("No numeric columns available for anomaly detection")

        X = df[features].dropna()
        if len(X) < 10:
            raise ValueError("Need at least 10 rows for anomaly detection")

        model = IsolationForest(
            contamination=contamination, random_state=42, n_estimators=200
        )
        predictions = model.fit_predict(X)
        scores = model.decision_function(X)
        self.anomaly_model = model

        anomaly_mask = predictions == -1
        anomaly_indices = X.index[anomaly_mask].tolist()

        # Sample anomalies
        anomaly_df = df.loc[anomaly_indices].head(10)
        anomaly_samples = anomaly_df.to_dict(orient="records")

        explanation = self._generate_anomaly_explanation(
            len(anomaly_indices), len(X), features
        )

        return {
            "n_anomalies": int(anomaly_mask.sum()),
            "anomaly_ratio": round(float(anomaly_mask.mean()), 4),
            "anomaly_indices": anomaly_indices[:100],  # Cap for response size
            "anomaly_scores": [round(float(s), 4) for s in scores[anomaly_mask][:100]],
            "anomaly_samples": anomaly_samples,
            "explanation": explanation,
        }

    # ── Forecasting ────────────────────────────────────────────
    def run_forecasting(
        self,
        df: pd.DataFrame,
        date_column: str,
        target_column: str,
        periods: int = 30,
    ) -> Dict[str, Any]:
        """Time-series forecasting using Gradient Boosting on time features."""
        if date_column not in df.columns or target_column not in df.columns:
            raise ValueError("Date or target column not found.")

        # Prepare data
        ts_df = df[[date_column, target_column]].copy()
        ts_df[date_column] = pd.to_datetime(ts_df[date_column], errors='coerce')
        ts_df = ts_df.dropna().sort_values(date_column).set_index(date_column)

        # Aggregate by day if multiple entries exist per day
        ts_df = ts_df.resample('D').mean().interpolate(method='linear')

        if len(ts_df) < 10:
            raise ValueError("Need at least 10 data points for forecasting.")

        # Create time features
        ts_df['year'] = ts_df.index.year
        ts_df['month'] = ts_df.index.month
        ts_df['day'] = ts_df.index.day
        ts_df['dayofweek'] = ts_df.index.dayofweek
        ts_df['dayofyear'] = ts_df.index.dayofyear
        
        # We need a numeric target
        if not pd.api.types.is_numeric_dtype(ts_df[target_column]):
            raise ValueError("Target column must be numeric for forecasting.")

        X = ts_df[['year', 'month', 'day', 'dayofweek', 'dayofyear']]
        y = ts_df[target_column]

        # Train a simple robust model
        model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)

        # Generate future dates
        last_date = ts_df.index[-1]
        future_dates = [last_date + pd.Timedelta(days=i) for i in range(1, periods + 1)]
        future_df = pd.DataFrame(index=future_dates)
        future_df['year'] = future_df.index.year
        future_df['month'] = future_df.index.month
        future_df['day'] = future_df.index.day
        future_df['dayofweek'] = future_df.index.dayofweek
        future_df['dayofyear'] = future_df.index.dayofyear

        # Predict
        predictions = model.predict(future_df)

        historical = [
            {"date": str(idx.date()), "value": round(float(val), 2)}
            for idx, val in zip(ts_df.index[-100:], y.tail(100))
        ]
        
        forecast = [
            {"date": str(idx.date()), "value": round(float(val), 2)}
            for idx, val in zip(future_dates, predictions)
        ]

        # Calculate a simple metric (train R2)
        r2 = r2_score(y, model.predict(X))

        return {
            "historical": historical,
            "forecast": forecast,
            "metrics": {"r2_score": round(float(r2), 4)},
            "explanation": f"Forecasted {periods} future periods for '{target_column}' based on historical patterns using a gradient boosting time-series model (Train R²: {r2:.2f})."
        }

    # ── Explanations ───────────────────────────────────────────
    @staticmethod
    def _generate_regression_explanation(
        metrics: Dict, importance: List[Dict], target: str
    ) -> str:
        top_features = ", ".join([f['feature'] for f in importance[:3]])
        quality = "excellent" if metrics["r2_score"] > 0.8 else (
            "good" if metrics["r2_score"] > 0.5 else "moderate"
        )
        return (
            f"The regression model predicting '{target}' achieved {quality} performance "
            f"with R²={metrics['r2_score']} and RMSE={metrics['rmse']}. "
            f"The most influential features are: {top_features}. "
            f"The model was trained on {metrics['train_samples']} samples and "
            f"tested on {metrics['test_samples']} samples."
        )

    @staticmethod
    def _generate_anomaly_explanation(
        n_anomalies: int, total: int, features: List[str]
    ) -> str:
        return (
            f"Isolation Forest detected {n_anomalies} anomalies out of {total} records "
            f"({n_anomalies / total * 100:.1f}%). Analysis was performed on features: "
            f"{', '.join(features[:5])}{'...' if len(features) > 5 else ''}. "
            f"Anomalies represent data points that deviate significantly from normal patterns."
        )
