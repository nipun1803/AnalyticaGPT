import os
import sys
import pandas as pd
from loguru import logger

# Add backend to path
sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from services.report import ReportGenerator
from utils.parser import get_summary_statistics, get_correlation_matrix

def test_report_generation():
    csv_path = "sample_employee_data.csv"
    if not os.path.exists(csv_path):
        # try parent
        csv_path = os.path.join(os.path.dirname(__file__), "..", "sample_employee_data.csv")
    
    logger.info(f"Loading test data from {csv_path}")
    df = pd.read_csv(csv_path)
    
    stats = get_summary_statistics(df)
    correlation = get_correlation_matrix(df)
    
    # Mock AI insights
    insights = (
        "## AI Summary & Key Insights\n"
        "- The dataset contains employee information such as Department, Salary, Performance Score, and Age.\n"
        "- Salary shows a right-skewed distribution with a mean of 75,000 USD. [Confidence: 95%]\n"
        "- There is a strong positive correlation between tenure and salary. [Confidence: 89%]\n\n"
        "## Trends & Patterns\n"
        "- Performance scores show a normal distribution, with most employees rated between 3 and 4.\n\n"
        "## Business Recommendations\n"
        "- Investigate high turnover in sales department. [Confidence: 85%]\n"
        "- Implement standard salary reviews based on performance rather than tenure."
    )
    
    # Mock chart insights as a dict to replicate the exact bug context
    chart_insights = {
        "distribution": {"insight": "Salary and performance show key peaks indicating standard operational segments."},
        "skewness": {"insight": "Outliers exist in the higher salary range, resulting in a positive skew of 1.25."},
        "categorical": {"insight": "Engineering and Sales represent the largest departments by headcount."}
    }
    
    ml_results = {
        "task": "regression",
        "target": "Salary",
        "metrics": {
            "r2_score": 0.7854,
            "mean_absolute_error": 4500.23,
            "root_mean_squared_error": 6200.12
        },
        "explanation": "Linear regression model predicts salary based on Age, Performance, and Tenure."
    }
    
    anomaly_results = {
        "n_anomalies": 12,
        "anomaly_ratio": 0.024,
        "explanation": "Anomalies detected primarily represent senior employees with exceptionally high salaries relative to tenure."
    }
    
    logger.info("Initializing ReportGenerator...")
    gen = ReportGenerator(output_dir="data/test_reports")
    
    logger.info("Generating report...")
    filename = gen.generate_report(
        dataset_name="sample_employee_data.csv",
        summary_stats=stats,
        insights=insights,
        chart_insights=chart_insights,
        ml_results=ml_results,
        anomaly_results=anomaly_results,
        correlation=correlation
    )
    
    pdf_path = os.path.join("data/test_reports", filename)
    assert os.path.exists(pdf_path), "PDF report was not created!"
    logger.info(f"Report successfully generated at: {pdf_path}")

if __name__ == "__main__":
    test_report_generation()
