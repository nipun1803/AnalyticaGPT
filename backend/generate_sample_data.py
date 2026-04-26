"""
Generate a sample CSV dataset for testing InsightForge AI.
Run: python generate_sample_data.py
"""

import pandas as pd
import numpy as np

np.random.seed(42)
n = 500

data = {
    "employee_id": range(1, n + 1),
    "department": np.random.choice(["Engineering", "Sales", "Marketing", "HR", "Finance"], n),
    "experience_years": np.random.randint(1, 25, n),
    "salary": np.random.normal(75000, 20000, n).round(2),
    "performance_score": np.random.uniform(1.0, 5.0, n).round(2),
    "satisfaction_rating": np.random.uniform(1.0, 10.0, n).round(1),
    "projects_completed": np.random.randint(0, 30, n),
    "overtime_hours": np.abs(np.random.normal(5, 8, n)).round(1),
    "training_hours": np.random.randint(0, 100, n),
    "attrition_risk": np.random.choice(["Low", "Medium", "High"], n, p=[0.5, 0.35, 0.15]),
}

df = pd.DataFrame(data)

# Add some missing values
mask = np.random.random(n) < 0.03
df.loc[mask, "salary"] = np.nan
mask = np.random.random(n) < 0.05
df.loc[mask, "satisfaction_rating"] = np.nan

# Add some anomalies
df.loc[0, "salary"] = 500000
df.loc[1, "overtime_hours"] = 200
df.loc[2, "projects_completed"] = 100

df.to_csv("sample_employee_data.csv", index=False)
print(f"Generated sample_employee_data.csv with {len(df)} rows and {len(df.columns)} columns")
print(df.head())
