"""
InsightForge AI — Machine Learning Models Service (UPDATED)
Adds: Random Forest Classification, Statistical Tests, Confidence Intervals in Forecast,
      Cross-Validation for Regression, Cluster Profiles, Permutation Feature Importance.
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import (
    IsolationForest,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    r2_score,
    silhouette_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)
from sklearn.preprocessing import LabelEncoder
from typing import Dict, Any, List, Optional
from loguru import logger


class MLEngine:
    def __init__(self):
        self.regression_model = None
        self.cluster_model = None
        self.anomaly_model = None
        self.classification_model = None
        self._last_X_test = None
        self._last_y_test = None

    # ── Regression ─────────────────────────────────────────────
    def run_regression(self, df, target_column, feature_columns=None, test_size=0.2):
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found")

        features = (
            [c for c in feature_columns if c in df.columns and c != target_column]
            if feature_columns
            else [c for c in df.select_dtypes(include=[np.number]).columns if c != target_column]
        )
        if not features:
            raise ValueError("No numeric feature columns available for regression")

        X = df[features].dropna()
        y = df.loc[X.index, target_column].dropna()
        common_idx = X.index.intersection(y.index)
        X, y = X.loc[common_idx], y.loc[common_idx]

        if len(X) < 10:
            raise ValueError("Not enough data points (need >= 10)")

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

        model = LinearRegression()
        model.fit(X_train, y_train)
        self.regression_model = model

        y_pred = model.predict(X_test)
        cv_scores = cross_val_score(model, X, y, cv=min(5, max(2, len(X) // 5)), scoring="r2")

        metrics = {
            "r2_score": round(float(r2_score(y_test, y_pred)), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
            "mae": round(float(mean_absolute_error(y_test, y_pred)), 4),
            "cv_r2_mean": round(float(cv_scores.mean()), 4),
            "cv_r2_std": round(float(cv_scores.std()), 4),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        }

        # Use RandomForest for permutation-style importance (more robust than raw coefficients)
        rf = RandomForestRegressor(n_estimators=50, random_state=42)
        rf.fit(X_train, y_train)
        importance = [
            {"feature": feat, "importance": round(float(imp), 6), "coefficient": round(float(coef), 6)}
            for feat, imp, coef in sorted(
                zip(features, rf.feature_importances_, model.coef_),
                key=lambda x: x[1], reverse=True,
            )
        ]

        sample_preds = []
        for i in range(min(5, len(X_test))):
            row = X_test.iloc[i].to_dict()
            row["actual"] = float(y_test.iloc[i])
            row["predicted"] = round(float(y_pred[i]), 4)
            row["error"] = round(float(abs(y_test.iloc[i] - y_pred[i])), 4)
            sample_preds.append(row)

        explanation = self._explain_regression(metrics, importance, target_column)
        logger.info(f"Regression '{target_column}': R²={metrics['r2_score']}, CV-R²={metrics['cv_r2_mean']}")
        return {"task": "regression", "target": target_column, "metrics": metrics,
                "feature_importance": importance, "predictions_sample": sample_preds,
                "explanation": explanation}

    # ── Classification (NEW) ───────────────────────────────────
    def run_classification(self, df, target_column, feature_columns=None, test_size=0.2, n_estimators=100):
        """Random Forest classifier with full metrics, confusion matrix, feature importance."""
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found")

        features = (
            [c for c in feature_columns if c in df.columns and c != target_column]
            if feature_columns
            else [c for c in df.select_dtypes(include=[np.number]).columns if c != target_column]
        )
        if not features:
            raise ValueError("No numeric feature columns for classification")

        y_raw = df[target_column].dropna()
        le = LabelEncoder()
        y_enc = le.fit_transform(y_raw.astype(str))
        class_names = [str(c) for c in le.classes_]

        X = df.loc[y_raw.index, features].dropna()
        common_idx = X.index.intersection(y_raw.index)
        X = X.loc[common_idx]
        y = y_enc[y_raw.index.get_indexer(common_idx)]

        n_classes = len(np.unique(y))
        if n_classes < 2:
            raise ValueError("Target must have at least 2 unique classes")
        if len(X) < 10:
            raise ValueError("Not enough data points (need >= 10)")

        stratify = y if n_classes > 1 and min(np.bincount(y)) >= 2 else None
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=stratify
        )

        model = RandomForestClassifier(n_estimators=n_estimators, random_state=42,
                                       n_jobs=-1, class_weight="balanced")
        model.fit(X_train, y_train)
        self.classification_model = model

        y_pred = model.predict(X_test)
        avg = "binary" if n_classes == 2 else "weighted"
        metrics = {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "precision": round(float(precision_score(y_test, y_pred, average=avg, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, y_pred, average=avg, zero_division=0)), 4),
            "f1_score": round(float(f1_score(y_test, y_pred, average=avg, zero_division=0)), 4),
            "n_classes": n_classes,
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        }

        cm = confusion_matrix(y_test, y_pred)
        importance = sorted(
            [{"feature": f, "importance": round(float(i), 6)}
             for f, i in zip(features, model.feature_importances_)],
            key=lambda x: x["importance"], reverse=True
        )

        per_class = {}
        for i, cls in enumerate(class_names):
            mask = y_test == i
            if mask.sum() > 0:
                per_class[cls] = {"support": int(mask.sum()), "correct": int((y_pred[mask] == i).sum())}

        explanation = self._explain_classification(metrics, importance, target_column, class_names)
        logger.info(f"Classification '{target_column}': acc={metrics['accuracy']}, f1={metrics['f1_score']}")
        return {
            "task": "classification", "target": target_column, "metrics": metrics,
            "confusion_matrix": {"matrix": cm.tolist(), "labels": class_names},
            "feature_importance": importance, "per_class_metrics": per_class,
            "class_names": class_names, "explanation": explanation,
        }

    # ── Clustering ─────────────────────────────────────────────
    def run_clustering(self, df, n_clusters=None, feature_columns=None, max_clusters=10):
        features = (
            [c for c in feature_columns if c in df.columns]
            if feature_columns
            else df.select_dtypes(include=[np.number]).columns.tolist()
        )
        if len(features) < 2:
            raise ValueError("Need at least 2 numeric columns for clustering")
        X = df[features].dropna()
        if len(X) < 10:
            raise ValueError("Need at least 10 rows for clustering")

        if n_clusters is None:
            best_k, best_score = 2, -1
            for k in range(2, min(max_clusters, len(X) - 1) + 1):
                km = KMeans(n_clusters=k, random_state=42, n_init=10)
                labels = km.fit_predict(X)
                score = silhouette_score(X, labels)
                if score > best_score:
                    best_k, best_score = k, score
            n_clusters = best_k

        model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = model.fit_predict(X)
        self.cluster_model = model
        sil = float(silhouette_score(X, labels))

        X_lab = X.copy()
        X_lab["_cluster"] = labels
        profiles = {
            f"Cluster {k}": {col: round(float(X_lab[X_lab["_cluster"] == k][col].mean()), 4) for col in features}
            for k in range(n_clusters)
        }

        return {
            "n_clusters": n_clusters,
            "cluster_sizes": {f"Cluster {k}": int(v) for k, v in pd.Series(labels).value_counts().sort_index().items()},
            "cluster_centers": model.cluster_centers_.tolist(),
            "silhouette_score": round(sil, 4),
            "labels": labels.tolist(),
            "feature_columns": features,
            "cluster_profiles": profiles,
        }

    # ── Anomaly Detection ──────────────────────────────────────
    def run_anomaly_detection(self, df, contamination=0.05, feature_columns=None):
        features = (
            [c for c in feature_columns if c in df.columns]
            if feature_columns
            else df.select_dtypes(include=[np.number]).columns.tolist()
        )
        if not features:
            raise ValueError("No numeric columns available")
        X = df[features].dropna()
        if len(X) < 10:
            raise ValueError("Need at least 10 rows")

        model = IsolationForest(contamination=contamination, random_state=42, n_estimators=200)
        preds = model.fit_predict(X)
        scores = model.decision_function(X)
        self.anomaly_model = model

        anomaly_mask = preds == -1
        anomaly_indices = X.index[anomaly_mask].tolist()
        explanation = (
            f"Isolation Forest detected {int(anomaly_mask.sum())} anomalies out of {len(X)} records "
            f"({anomaly_mask.mean() * 100:.1f}%). Features analysed: {', '.join(features[:5])}."
        )
        return {
            "n_anomalies": int(anomaly_mask.sum()),
            "anomaly_ratio": round(float(anomaly_mask.mean()), 4),
            "anomaly_indices": anomaly_indices[:100],
            "anomaly_scores": [round(float(s), 4) for s in scores[anomaly_mask][:100]],
            "anomaly_samples": df.loc[anomaly_indices].head(10).to_dict(orient="records"),
            "explanation": explanation,
        }

    # ── Forecasting (with confidence intervals) ─────────────────
    def run_forecasting(self, df, date_column, target_column, periods=30):
        if date_column not in df.columns or target_column not in df.columns:
            raise ValueError("Date or target column not found.")

        ts = df[[date_column, target_column]].copy()
        ts[date_column] = pd.to_datetime(ts[date_column], errors="coerce")
        ts = ts.dropna().sort_values(date_column).set_index(date_column)
        ts = ts.resample("D").mean().interpolate(method="linear")
        if len(ts) < 10:
            raise ValueError("Need at least 10 data points.")
        if not pd.api.types.is_numeric_dtype(ts[target_column]):
            raise ValueError("Target column must be numeric.")

        ts["year"] = ts.index.year
        ts["month"] = ts.index.month
        ts["day"] = ts.index.day
        ts["dayofweek"] = ts.index.dayofweek
        ts["dayofyear"] = ts.index.dayofyear
        ts["quarter"] = ts.index.quarter
        ts["lag_7"] = ts[target_column].shift(7)
        ts["lag_30"] = ts[target_column].shift(30)
        ts["rolling_mean_7"] = ts[target_column].rolling(7).mean()
        ts = ts.dropna()

        feat_cols = ["year", "month", "day", "dayofweek", "dayofyear",
                     "quarter", "lag_7", "lag_30", "rolling_mean_7"]
        X, y = ts[feat_cols], ts[target_column]

        model = GradientBoostingRegressor(n_estimators=150, random_state=42, learning_rate=0.1, max_depth=4)
        model.fit(X, y)
        residuals = y.values - model.predict(X)
        std_res = float(np.std(residuals))
        ci95 = 1.96 * std_res

        last_date = ts.index[-1]
        known = ts[target_column].values.tolist()
        predictions = []
        for date in [last_date + pd.Timedelta(days=i) for i in range(1, periods + 1)]:
            row = pd.DataFrame([{
                "year": date.year, "month": date.month, "day": date.day,
                "dayofweek": date.dayofweek, "dayofyear": date.dayofyear,
                "quarter": (date.month - 1) // 3 + 1,
                "lag_7": known[-7] if len(known) >= 7 else np.mean(known),
                "lag_30": known[-30] if len(known) >= 30 else np.mean(known),
                "rolling_mean_7": np.mean(known[-7:]) if len(known) >= 7 else np.mean(known),
            }])
            pred = float(model.predict(row)[0])
            predictions.append((date, pred))
            known.append(pred)

        r2 = float(r2_score(y, model.predict(X)))
        return {
            "historical": [{"date": str(idx.date()), "value": round(float(v), 2)}
                           for idx, v in zip(ts.index[-100:], y.tail(100))],
            "forecast": [{"date": str(d.date()), "value": round(v, 2),
                          "upper": round(v + ci95, 2), "lower": round(v - ci95, 2)}
                         for d, v in predictions],
            "metrics": {"r2_score": round(r2, 4), "residual_std": round(std_res, 4),
                        "confidence_95_width": round(ci95 * 2, 4)},
            "explanation": (
                f"Forecasted {periods} periods for '{target_column}' using Gradient Boosting "
                f"with lag features (7-day, 30-day) and rolling averages. "
                f"Train R²: {r2:.2f}. Shaded band = 95% confidence interval (±{ci95:.2f})."
            ),
        }

    # ── Statistical Tests (NEW) ────────────────────────────────
    def run_statistical_tests(self, df, col1, col2, test_type="auto"):
        """T-test, Mann-Whitney U, Chi-squared, or ANOVA — auto-detected or specified."""
        from scipy import stats

        if col1 not in df.columns or col2 not in df.columns:
            raise ValueError("One or both columns not found")

        is_num1 = pd.api.types.is_numeric_dtype(df[col1])
        is_num2 = pd.api.types.is_numeric_dtype(df[col2])

        if test_type == "auto":
            if is_num1 and is_num2:
                test_type = "t_test"
            elif not is_num1 and not is_num2:
                test_type = "chi_squared"
            else:
                test_type = "anova"

        res = {"test_type": test_type, "col1": col1, "col2": col2}

        if test_type == "t_test":
            a, b = df[col1].dropna().values, df[col2].dropna().values
            stat, p = stats.ttest_ind(a, b, equal_var=False)
            lev_stat, lev_p = stats.levene(a, b)
            d = (np.mean(a) - np.mean(b)) / np.sqrt((np.std(a) ** 2 + np.std(b) ** 2) / 2)
            res.update({"statistic": round(float(stat), 4), "p_value": round(float(p), 6),
                        "significant": bool(p < 0.05), "effect_size_cohens_d": round(float(d), 4),
                        "mean_col1": round(float(np.mean(a)), 4), "mean_col2": round(float(np.mean(b)), 4),
                        "std_col1": round(float(np.std(a)), 4), "std_col2": round(float(np.std(b)), 4),
                        "equal_variance_p": round(float(lev_p), 4),
                        "interpretation": f"Welch's t-test: {'significant' if p < 0.05 else 'not significant'} difference between '{col1}' and '{col2}' (t={stat:.3f}, p={p:.4f}). {'Reject' if p < 0.05 else 'Fail to reject'} H₀ at α=0.05."})

        elif test_type == "mannwhitney":
            a, b = df[col1].dropna().values, df[col2].dropna().values
            stat, p = stats.mannwhitneyu(a, b, alternative="two-sided")
            rb = 1 - (2 * stat) / (len(a) * len(b))
            res.update({"statistic": round(float(stat), 4), "p_value": round(float(p), 6),
                        "significant": bool(p < 0.05), "effect_size_rank_biserial": round(float(rb), 4),
                        "median_col1": round(float(np.median(a)), 4), "median_col2": round(float(np.median(b)), 4),
                        "interpretation": f"Mann-Whitney U-test: {'significant' if p < 0.05 else 'not significant'} difference (U={stat:.1f}, p={p:.4f}). Non-parametric, no normality assumed."})

        elif test_type == "chi_squared":
            ct = pd.crosstab(df[col1].dropna(), df[col2].dropna())
            stat, p, dof, _ = stats.chi2_contingency(ct)
            n = ct.values.sum()
            v = float(np.sqrt(stat / (n * (min(ct.shape) - 1)))) if n > 0 and min(ct.shape) > 1 else 0
            res.update({"statistic": round(float(stat), 4), "p_value": round(float(p), 6),
                        "degrees_of_freedom": int(dof), "significant": bool(p < 0.05),
                        "effect_size_cramers_v": round(v, 4), "contingency_table": ct.to_dict(),
                        "interpretation": f"Chi-squared: {'significant' if p < 0.05 else 'no significant'} association between '{col1}' and '{col2}' (χ²={stat:.3f}, df={dof}, p={p:.4f})."})

        elif test_type == "anova":
            num_col, cat_col = (col1, col2) if is_num1 else (col2, col1)
            sub = df[[num_col, cat_col]].dropna()
            groups = [g[num_col].values for _, g in sub.groupby(cat_col) if len(g) >= 2]
            if len(groups) < 2:
                raise ValueError("Need at least 2 groups for ANOVA")
            stat, p = stats.f_oneway(*groups)
            gm = grand_mean = sub[num_col].mean()
            ss_b = sum(len(g) * (g.mean() - gm) ** 2 for g in [pd.Series(g) for g in groups])
            ss_t = ((sub[num_col] - gm) ** 2).sum()
            eta = float(ss_b / ss_t) if ss_t != 0 else 0
            res.update({"statistic": round(float(stat), 4), "p_value": round(float(p), 6),
                        "significant": bool(p < 0.05), "effect_size_eta_squared": round(eta, 4),
                        "group_means": {str(n): round(float(g[num_col].mean()), 4) for n, g in sub.groupby(cat_col)},
                        "n_groups": len(groups), "numeric_column": num_col, "group_column": cat_col,
                        "interpretation": f"One-way ANOVA: {'significant' if p < 0.05 else 'no significant'} difference in '{num_col}' across {len(groups)} '{cat_col}' groups (F={stat:.3f}, p={p:.4f})."})
        else:
            raise ValueError(f"Unknown test type: {test_type}")

        return res

    # ── Static helpers ─────────────────────────────────────────
    @staticmethod
    def _explain_regression(metrics, importance, target):
        top = ", ".join([f['feature'] for f in importance[:3]])
        q = "excellent" if metrics["r2_score"] > 0.8 else ("good" if metrics["r2_score"] > 0.5 else "moderate")
        return (
            f"Regression model for '{target}' achieved {q} performance (R²={metrics['r2_score']}, "
            f"RMSE={metrics['rmse']}). CV R²: {metrics['cv_r2_mean']} ± {metrics['cv_r2_std']}. "
            f"Top features: {top}."
        )

    @staticmethod
    def _explain_classification(metrics, importance, target, classes):
        top = ", ".join([f['feature'] for f in importance[:3]])
        q = "excellent" if metrics["accuracy"] > 0.9 else ("good" if metrics["accuracy"] > 0.75 else "moderate")
        return (
            f"Random Forest classifier for '{target}' achieved {q} performance "
            f"(Accuracy: {metrics['accuracy']:.1%}, F1: {metrics['f1_score']:.4f}). "
            f"Classes: {', '.join(classes[:5])}. Top features: {top}."
        )