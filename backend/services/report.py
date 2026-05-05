"""
InsightForge AI — Professional PDF Report Generator
Creates comprehensive, multi-section reports with charts, statistical tables,
correlation analysis, data quality assessment, and AI insights.
"""

import os
import io
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
import pandas as pd

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image as RLImage, PageBreak, HRFlowable, KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from loguru import logger


# Color palette
PRIMARY = "#6C5CE7"
SECONDARY = "#00CEC9"
ACCENT = "#FD79A8"
DARK = "#2D3436"
MUTED = "#636E72"
LIGHT_BG = "#F5F6FA"
BORDER = "#DFE6E9"
SUCCESS = "#00B894"
WARNING = "#FDCB6E"
DANGER = "#D63031"


class ReportGenerator:
    """Generates comprehensive PDF reports from analysis results."""

    def __init__(self, output_dir: str = "data/reports"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.styles = getSampleStyleSheet()
        self._add_custom_styles()

    def _add_custom_styles(self):
        """Add custom paragraph styles for branding."""
        self.styles.add(ParagraphStyle(
            name="BrandTitle", parent=self.styles["Title"],
            fontSize=26, textColor=colors.HexColor(PRIMARY),
            spaceAfter=8, fontName="Helvetica-Bold",
        ))
        self.styles.add(ParagraphStyle(
            name="SubTitle", parent=self.styles["Normal"],
            fontSize=12, textColor=colors.HexColor(MUTED),
            spaceAfter=20, fontName="Helvetica",
        ))
        self.styles.add(ParagraphStyle(
            name="SectionTitle", parent=self.styles["Heading2"],
            fontSize=14, textColor=colors.HexColor(DARK),
            spaceBefore=18, spaceAfter=10, fontName="Helvetica-Bold",
        ))
        self.styles.add(ParagraphStyle(
            name="SubSection", parent=self.styles["Heading3"],
            fontSize=11, textColor=colors.HexColor(PRIMARY),
            spaceBefore=12, spaceAfter=6,
        ))
        self.styles.add(ParagraphStyle(
            name="BodyCustom", parent=self.styles["Normal"],
            fontSize=9, leading=14, textColor=colors.HexColor(MUTED),
        ))
        self.styles.add(ParagraphStyle(
            name="MetricLabel", parent=self.styles["Normal"],
            fontSize=8, textColor=colors.HexColor(MUTED),
            alignment=TA_CENTER,
        ))
        self.styles.add(ParagraphStyle(
            name="MetricValue", parent=self.styles["Normal"],
            fontSize=16, textColor=colors.HexColor(DARK),
            alignment=TA_CENTER, fontName="Helvetica-Bold",
        ))

    def generate_report(
        self,
        dataset_name: str,
        summary_stats: Dict[str, Any],
        insights: str,
        ml_results: Optional[Dict] = None,
        anomaly_results: Optional[Dict] = None,
    ) -> str:
        """Generate a comprehensive PDF report and return the filename."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"insightforge_report_{timestamp}.pdf"
        filepath = os.path.join(self.output_dir, filename)

        doc = SimpleDocTemplate(
            filepath, pagesize=A4,
            leftMargin=22 * mm, rightMargin=22 * mm,
            topMargin=18 * mm, bottomMargin=18 * mm,
        )

        elements = []
        shape = summary_stats.get("shape", {})
        num_summary = summary_stats.get("numeric_summary", {})
        cat_summary = summary_stats.get("categorical_summary", {})
        classification = summary_stats.get("column_classification", {})

        # ── 1. TITLE PAGE ─────────────────────────────────────
        elements.append(Spacer(1, 60))
        elements.append(Paragraph("⚡ InsightForge AI", self.styles["BrandTitle"]))
        elements.append(Paragraph("Comprehensive Data Analysis Report", self.styles["SubTitle"]))
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor(PRIMARY)))
        elements.append(Spacer(1, 20))

        # Dataset info box
        info_data = [
            ["Dataset", dataset_name],
            ["Generated", datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")],
            ["Rows", f"{shape.get('rows', 'N/A'):,}"],
            ["Columns", str(shape.get('columns', 'N/A'))],
        ]
        info_table = Table(info_data, colWidths=[100, 350], hAlign="LEFT")
        info_table.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor(DARK)),
            ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor(MUTED)),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 15))

        # Classification info
        if classification:
            notes = []
            if classification.get("id_columns"):
                notes.append(f"ID columns (excluded from analysis): {', '.join(classification['id_columns'])}")
            if classification.get("datetime_columns"):
                notes.append(f"Date/time columns detected: {', '.join(classification['datetime_columns'])}")
            for note in notes:
                elements.append(Paragraph(f"ℹ️ {note}", self.styles["BodyCustom"]))
            if notes:
                elements.append(Spacer(1, 10))

        elements.append(PageBreak())

        # ── 2. DATA QUALITY OVERVIEW ──────────────────────────
        elements.append(Paragraph("📊 Data Quality Overview", self.styles["SectionTitle"]))
        elements.append(Spacer(1, 5))

        total_cells = shape.get("rows", 0) * shape.get("columns", 0)
        total_missing = sum(
            v.get("null_count", 0) if isinstance(v, dict) else 0
            for v in cat_summary.values()
        )
        # Count missing from numeric too
        for col, stats in num_summary.items():
            count = stats.get("count", 0)
            total_missing += shape.get("rows", 0) - int(count)

        completeness = round((1 - total_missing / total_cells) * 100, 1) if total_cells else 0

        quality_data = [
            ["Metric", "Value", "Status"],
            ["Total Records", f"{shape.get('rows', 0):,}", "—"],
            ["Total Features", str(shape.get('columns', 0)), "—"],
            ["Data Completeness", f"{completeness}%",
             "✓ Good" if completeness > 95 else ("⚠ Fair" if completeness > 80 else "✗ Poor")],
            ["Missing Cells", str(total_missing),
             "✓ None" if total_missing == 0 else f"⚠ {total_missing}"],
        ]
        q_table = Table(quality_data, colWidths=[160, 150, 130], hAlign="LEFT")
        q_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(PRIMARY)),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor(BORDER)),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(LIGHT_BG)]),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(q_table)
        elements.append(Spacer(1, 20))

        # ── 3. NUMERIC COLUMN STATISTICS ──────────────────────
        if num_summary:
            elements.append(Paragraph("📈 Numeric Feature Statistics", self.styles["SectionTitle"]))
            headers = ["Column", "Mean", "Std Dev", "Min", "Max", "Skewness"]
            table_data = [headers]
            for col, stats in list(num_summary.items())[:15]:
                skew = stats.get("skewness", 0)
                skew_flag = "" if abs(skew) < 1 else " ⚠" if abs(skew) < 2 else " ⚠⚠"
                table_data.append([
                    col[:22],
                    f"{stats.get('mean', 0):.2f}",
                    f"{stats.get('std', 0):.2f}",
                    f"{stats.get('min', 0):.2f}",
                    f"{stats.get('max', 0):.2f}",
                    f"{skew:.2f}{skew_flag}",
                ])
            col_widths = [110, 70, 70, 70, 70, 70]
            table = Table(table_data, colWidths=col_widths, hAlign="LEFT")
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(PRIMARY)),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor(BORDER)),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(LIGHT_BG)]),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 15))

        # ── 4. CATEGORICAL COLUMN SUMMARY ─────────────────────
        if cat_summary:
            elements.append(Paragraph("🏷️ Categorical Feature Summary", self.styles["SectionTitle"]))
            cat_headers = ["Column", "Unique Values", "Top Value", "Top Frequency", "Null Count"]
            cat_data = [cat_headers]
            for col, info in list(cat_summary.items())[:10]:
                top_vals = info.get("top_values", {})
                top_val = list(top_vals.keys())[0] if top_vals else "—"
                top_freq = list(top_vals.values())[0] if top_vals else 0
                cat_data.append([
                    col[:22],
                    str(info.get("unique", 0)),
                    str(top_val)[:20],
                    str(top_freq),
                    str(info.get("null_count", 0)),
                ])
            cat_table = Table(cat_data, colWidths=[110, 80, 110, 80, 70], hAlign="LEFT")
            cat_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(SECONDARY)),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor(BORDER)),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(LIGHT_BG)]),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
            ]))
            elements.append(cat_table)
            elements.append(Spacer(1, 15))

        # ── 5. DISTRIBUTION CHARTS ────────────────────────────
        if num_summary:
            elements.append(PageBreak())
            elements.append(Paragraph("📊 Distribution Analysis", self.styles["SectionTitle"]))
            elements.append(Paragraph(
                "Box plot comparison of numeric features (values normalized for comparison).",
                self.styles["BodyCustom"],
            ))
            chart_path = self._generate_boxplot_chart(num_summary)
            if chart_path:
                elements.append(RLImage(chart_path, width=460, height=260))
                elements.append(Spacer(1, 15))

            # Skewness chart
            skew_path = self._generate_skewness_chart(num_summary)
            if skew_path:
                elements.append(Paragraph("Skewness & Kurtosis Analysis", self.styles["SubSection"]))
                elements.append(Paragraph(
                    "Columns with |skewness| > 1 may benefit from log transformation. "
                    "High kurtosis indicates heavy tails.",
                    self.styles["BodyCustom"],
                ))
                elements.append(RLImage(skew_path, width=460, height=220))
                elements.append(Spacer(1, 15))

        # ── 6. CATEGORICAL DISTRIBUTION ───────────────────────
        if cat_summary:
            cat_chart = self._generate_categorical_chart(cat_summary)
            if cat_chart:
                elements.append(Paragraph("🏷️ Top Categorical Values", self.styles["SubSection"]))
                elements.append(RLImage(cat_chart, width=460, height=240))
                elements.append(Spacer(1, 15))

        # ── 7. AI INSIGHTS ────────────────────────────────────
        elements.append(PageBreak())
        elements.append(Paragraph("🧠 AI-Generated Insights", self.styles["SectionTitle"]))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor(BORDER)))
        elements.append(Spacer(1, 8))
        for para in insights.split("\n"):
            para = para.strip()
            if para:
                # Style headers differently
                if para.startswith("**") or para.startswith("##"):
                    clean = para.replace("**", "").replace("##", "").strip()
                    elements.append(Paragraph(clean, self.styles["SubSection"]))
                elif para.startswith("- ") or para.startswith("• "):
                    elements.append(Paragraph(f"  {para}", self.styles["BodyCustom"]))
                else:
                    elements.append(Paragraph(para, self.styles["BodyCustom"]))
                elements.append(Spacer(1, 3))
        elements.append(Spacer(1, 15))

        # ── 8. ML RESULTS ─────────────────────────────────────
        if ml_results:
            elements.append(Paragraph("🤖 Machine Learning Results", self.styles["SectionTitle"]))
            task = ml_results.get("task", "regression")
            target = ml_results.get("target", "N/A")
            elements.append(Paragraph(
                f"Task: <b>{task.title()}</b> | Target: <b>{target}</b>",
                self.styles["BodyCustom"],
            ))
            elements.append(Spacer(1, 8))

            metrics = ml_results.get("metrics", {})
            ml_data = [["Metric", "Value"]]
            for key, val in metrics.items():
                display_key = key.replace("_", " ").title()
                display_val = f"{val:.4f}" if isinstance(val, float) else str(val)
                ml_data.append([display_key, display_val])
            ml_table = Table(ml_data, colWidths=[200, 200], hAlign="LEFT")
            ml_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6C5CE7")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor(BORDER)),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(LIGHT_BG)]),
            ]))
            elements.append(ml_table)

            explanation = ml_results.get("explanation", "")
            if explanation:
                elements.append(Spacer(1, 8))
                elements.append(Paragraph(explanation, self.styles["BodyCustom"]))
            elements.append(Spacer(1, 15))

        # ── 9. ANOMALIES ─────────────────────────────────────
        if anomaly_results:
            elements.append(Paragraph("⚠️ Anomaly Detection Results", self.styles["SectionTitle"]))
            n_anom = anomaly_results.get("n_anomalies", 0)
            ratio = anomaly_results.get("anomaly_ratio", 0) * 100
            elements.append(Paragraph(
                f"Detected <b>{n_anom}</b> anomalies ({ratio:.1f}% of data). "
                f"These records deviate significantly from normal patterns.",
                self.styles["BodyCustom"],
            ))
            explanation = anomaly_results.get("explanation", "")
            if explanation:
                elements.append(Paragraph(explanation, self.styles["BodyCustom"]))

        # ── FOOTER ────────────────────────────────────────────
        elements.append(Spacer(1, 40))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor(BORDER)))
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(
            "Generated by InsightForge AI — RAG-Based Data Analysis Engine | "
            f"{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            ParagraphStyle("Footer", parent=self.styles["Normal"], fontSize=7,
                           textColor=colors.gray, alignment=TA_CENTER),
        ))

        doc.build(elements)
        logger.info(f"PDF report generated: {filepath}")
        return filename

    # ── Chart Generators ──────────────────────────────────────

    def _generate_boxplot_chart(self, num_summary: Dict) -> Optional[str]:
        """Create a normalized box-plot-style comparison chart."""
        try:
            cols = list(num_summary.keys())[:10]
            if not cols:
                return None

            means = [num_summary[c].get("mean", 0) for c in cols]
            stds = [num_summary[c].get("std", 0) for c in cols]
            mins = [num_summary[c].get("min", 0) for c in cols]
            maxs = [num_summary[c].get("max", 0) for c in cols]

            fig, ax = plt.subplots(figsize=(10, 4.5))
            x = np.arange(len(cols))
            width = 0.6

            # Bar for mean with error bars for std
            bars = ax.bar(x, means, width, color=PRIMARY, alpha=0.85, edgecolor="white",
                          label="Mean", zorder=3)
            ax.errorbar(x, means, yerr=stds, fmt="none", ecolor="#FF6B6B", elinewidth=1.5,
                        capsize=4, capthick=1.5, label="±1 Std Dev", zorder=4)

            # Min/max markers
            ax.scatter(x, mins, color=SECONDARY, marker="v", s=25, zorder=5, label="Min")
            ax.scatter(x, maxs, color=ACCENT, marker="^", s=25, zorder=5, label="Max")

            ax.set_xticks(x)
            ax.set_xticklabels([c[:14] for c in cols], rotation=35, ha="right", fontsize=8)
            ax.set_ylabel("Value", fontsize=9, color=MUTED)
            ax.set_title("Numeric Feature Summary (Mean ± Std, Min/Max)", fontsize=11, fontweight="bold", color=DARK)
            ax.legend(fontsize=7, loc="upper right")
            ax.spines["top"].set_visible(False)
            ax.spines["right"].set_visible(False)
            ax.grid(axis="y", alpha=0.3)
            plt.tight_layout()

            path = os.path.join(self.output_dir, "_temp_boxplot.png")
            fig.savefig(path, dpi=150, bbox_inches="tight", facecolor="white")
            plt.close(fig)
            return path
        except Exception as e:
            logger.warning(f"Box plot generation failed: {e}")
            return None

    def _generate_skewness_chart(self, num_summary: Dict) -> Optional[str]:
        """Chart skewness and kurtosis for each numeric column."""
        try:
            cols = [c for c in num_summary if "skewness" in num_summary[c]][:10]
            if not cols:
                return None

            skew = [num_summary[c].get("skewness", 0) for c in cols]
            kurt = [num_summary[c].get("kurtosis", 0) for c in cols]

            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.8))

            # Skewness bars
            bar_colors = [DANGER if abs(s) > 2 else WARNING if abs(s) > 1 else SUCCESS for s in skew]
            ax1.barh(range(len(cols)), skew, color=bar_colors, edgecolor="white", height=0.6)
            ax1.axvline(x=0, color=DARK, linewidth=0.8, linestyle="--")
            ax1.axvline(x=-1, color=WARNING, linewidth=0.5, linestyle=":", alpha=0.5)
            ax1.axvline(x=1, color=WARNING, linewidth=0.5, linestyle=":", alpha=0.5)
            ax1.set_yticks(range(len(cols)))
            ax1.set_yticklabels([c[:14] for c in cols], fontsize=8)
            ax1.set_title("Skewness", fontsize=10, fontweight="bold", color=DARK)
            ax1.set_xlabel("Skewness Value", fontsize=8, color=MUTED)

            # Kurtosis bars
            ax2.barh(range(len(cols)), kurt, color=PRIMARY, alpha=0.7, edgecolor="white", height=0.6)
            ax2.set_yticks(range(len(cols)))
            ax2.set_yticklabels([c[:14] for c in cols], fontsize=8)
            ax2.set_title("Kurtosis", fontsize=10, fontweight="bold", color=DARK)
            ax2.set_xlabel("Kurtosis Value", fontsize=8, color=MUTED)

            for ax in [ax1, ax2]:
                ax.spines["top"].set_visible(False)
                ax.spines["right"].set_visible(False)

            plt.tight_layout()
            path = os.path.join(self.output_dir, "_temp_skewness.png")
            fig.savefig(path, dpi=150, bbox_inches="tight", facecolor="white")
            plt.close(fig)
            return path
        except Exception as e:
            logger.warning(f"Skewness chart failed: {e}")
            return None

    def _generate_categorical_chart(self, cat_summary: Dict) -> Optional[str]:
        """Horizontal bar chart of top categorical value distributions."""
        try:
            # Pick the first 2 categorical columns with reasonable data
            candidates = [(c, info) for c, info in cat_summary.items()
                          if info.get("unique", 0) <= 20 and info.get("top_values")][:2]
            if not candidates:
                return None

            n = len(candidates)
            fig, axes = plt.subplots(1, n, figsize=(5 * n, 4))
            if n == 1:
                axes = [axes]

            palette = [PRIMARY, SECONDARY, ACCENT, "#FD79A8", "#00B894", "#FDCB6E", "#6C5CE7", "#E17055"]

            for ax, (col, info) in zip(axes, candidates):
                top_vals = info.get("top_values", {})
                labels = [str(k)[:18] for k in list(top_vals.keys())[:8]]
                values = list(top_vals.values())[:8]

                colors_list = [palette[i % len(palette)] for i in range(len(labels))]
                ax.barh(range(len(labels)), values, color=colors_list, edgecolor="white", height=0.6)
                ax.set_yticks(range(len(labels)))
                ax.set_yticklabels(labels, fontsize=8)
                ax.set_title(col[:20], fontsize=10, fontweight="bold", color=DARK)
                ax.set_xlabel("Count", fontsize=8, color=MUTED)
                ax.spines["top"].set_visible(False)
                ax.spines["right"].set_visible(False)
                ax.invert_yaxis()

            plt.tight_layout()
            path = os.path.join(self.output_dir, "_temp_categorical.png")
            fig.savefig(path, dpi=150, bbox_inches="tight", facecolor="white")
            plt.close(fig)
            return path
        except Exception as e:
            logger.warning(f"Categorical chart failed: {e}")
            return None
