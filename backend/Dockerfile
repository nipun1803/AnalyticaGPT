FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
# Force CPU-only torch to save space and RAM
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port
EXPOSE 8000

# Reduced workers to 2 for low-memory instances (t2.micro/t3.micro)
CMD ["gunicorn", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:8000", "--timeout", "120"]
