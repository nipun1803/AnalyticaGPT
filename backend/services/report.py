"""
InsightForge AI — PDF Report Generator
Creates downloadable PDF reports with charts, insights, and recommendations.
"""

import os
import io
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image as RLImage, PageBreak, HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from loguru import logger


class ReportGenerator:
    """Generates PDF reports from analysis results."""

    def __init__(self, output_dir: str = "data/reports"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.styles = getSampleStyleSheet()
        self._add_custom_styles()

    def _add_custom_styles(self):
        """Add custom paragraph styles for branding."""
        self.styles.add(ParagraphStyle(
            name="BrandTitle",
            parent=self.styles["Title"],
            fontSize=24,
            textColor=colors.HexColor("#6C5CE7"),
            spaceAfter=20,
        ))
        self.styles.add(ParagraphStyle(
            name="SectionTitle",
            parent=self.styles["Heading2"],
            fontSize=14,
            textColor=colors.HexColor("#2D3436"),
            spaceBefore=16,
            spaceAfter=8,
        ))
        self.styles.add(ParagraphStyle(
            name="BodyCustom",
            parent=self.styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#636E72"),
        ))

    def generate_report(
        self,
        dataset_name: str,
        summary_stats: Dict[str, Any],
        insights: str,
        ml_results: Optional[Dict] = None,
        anomaly_results: Optional[Dict] = None,
    ) -> str:
        """Generate a full PDF report and return the file path."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"insightforge_report_{timestamp}.pdf"
        filepath = os.path.join(self.output_dir, filename)

        doc = SimpleDocTemplate(
            filepath,
            pagesize=A4,
            leftMargin=25 * mm,
            rightMargin=25 * mm,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
        )

        elements = []

        # ── Title Page ────────────────────────────────────────
        elements.append(Spacer(1, 40))
        elements.append(Paragraph("⚡ InsightForge AI", self.styles["BrandTitle"]))
        elements.append(Paragraph("Data Analysis Report", self.styles["Heading2"]))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(
            f"Dataset: <b>{dataset_name}</b> | Generated: {timestamp}",
            self.styles["BodyCustom"],
        ))
        elements.append(HRFlowable(width="100%", color=colors.HexColor("#DFE6E9")))
        elements.append(Spacer(1, 20))

        # ── Dataset Overview ──────────────────────────────────
        elements.append(Paragraph("📊 Dataset Overview", self.styles["SectionTitle"]))
        shape = summary_stats.get("shape", {})
        elements.append(Paragraph(
            f"Rows: <b>{shape.get('rows', 'N/A')}</b> | "
            f"Columns: <b>{shape.get('columns', 'N/A')}</b>",
            self.styles["BodyCustom"],
        ))
        elements.append(Spacer(1, 10))

        # Numeric summary table
        num_summary = summary_stats.get("numeric_summary", {})
        if num_summary:
            elements.append(Paragraph("Numeric Column Statistics", self.styles["Heading4"]))
            headers = ["Column", "Mean", "Std", "Min", "Max"]
            table_data = [headers]
            for col, stats in list(num_summary.items())[:10]:
                table_data.append([
                    col[:20],
                    f"{stats.get('mean', 0):.2f}",
                    f"{stats.get('std', 0):.2f}",
                    f"{stats.get('min', 0):.2f}",
                    f"{stats.get('max', 0):.2f}",
                ])
            table = Table(table_data, hAlign="LEFT")
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6C5CE7")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DFE6E9")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F6FA")]),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 15))

        # ── Charts ────────────────────────────────────────────
        if num_summary:
            chart_path = self._generate_distribution_chart(num_summary)
            if chart_path:
                elements.append(Paragraph("📈 Distribution Overview", self.styles["SectionTitle"]))
                elements.append(RLImage(chart_path, width=450, height=250))
                elements.append(Spacer(1, 15))

        # ── AI Insights ───────────────────────────────────────
        elements.append(PageBreak())
        elements.append(Paragraph("🧠 AI-Generated Insights", self.styles["SectionTitle"]))
        # Split insights into paragraphs
        for para in insights.split("\n"):
            para = para.strip()
            if para:
                elements.append(Paragraph(para, self.styles["BodyCustom"]))
                elements.append(Spacer(1, 4))
        elements.append(Spacer(1, 15))

        # ── ML Results ────────────────────────────────────────
        if ml_results:
            elements.append(Paragraph("🤖 ML Analysis Results", self.styles["SectionTitle"]))
            metrics = ml_results.get("metrics", {})
            for key, val in metrics.items():
                elements.append(Paragraph(
                    f"• <b>{key}</b>: {val}", self.styles["BodyCustom"]
                ))
            elements.append(Spacer(1, 10))

        # ── Anomalies ─────────────────────────────────────────
        if anomaly_results:
            elements.append(Paragraph("⚠️ Anomaly Detection", self.styles["SectionTitle"]))
            elements.append(Paragraph(
                f"Detected <b>{anomaly_results.get('n_anomalies', 0)}</b> anomalies "
                f"({anomaly_results.get('anomaly_ratio', 0) * 100:.1f}% of data)",
                self.styles["BodyCustom"],
            ))

        # ── Footer ────────────────────────────────────────────
        elements.append(Spacer(1, 40))
        elements.append(HRFlowable(width="100%", color=colors.HexColor("#DFE6E9")))
        elements.append(Paragraph(
            "Generated by InsightForge AI — RAG-Based Data Analysis Engine",
            ParagraphStyle("Footer", parent=self.styles["Normal"], fontSize=8,
                           textColor=colors.gray, alignment=TA_CENTER),
        ))

        doc.build(elements)
        logger.info(f"PDF report generated: {filepath}")
        return filename

    def _generate_distribution_chart(self, num_summary: Dict) -> Optional[str]:
        """Create a bar chart of column means for the report."""
        try:
            cols = list(num_summary.keys())[:8]
            means = [num_summary[c].get("mean", 0) for c in cols]

            fig, ax = plt.subplots(figsize=(8, 4))
            bars = ax.bar(range(len(cols)), means, color="#6C5CE7", alpha=0.85, edgecolor="white")
            ax.set_xticks(range(len(cols)))
            ax.set_xticklabels([c[:12] for c in cols], rotation=30, ha="right", fontsize=8)
            ax.set_ylabel("Mean Value", fontsize=9)
            ax.set_title("Column Mean Values", fontsize=11, fontweight="bold")
            ax.spines["top"].set_visible(False)
            ax.spines["right"].set_visible(False)
            plt.tight_layout()

            chart_path = os.path.join(self.output_dir, "_temp_chart.png")
            fig.savefig(chart_path, dpi=150, bbox_inches="tight")
            plt.close(fig)
            return chart_path
        except Exception as e:
            logger.warning(f"Chart generation failed: {e}")
            return None
