FROM python:3.10-slim

WORKDIR /app

# Copy requirements first to leverage Docker layer caching
COPY requirements.txt .

# Install dependencies inside container
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY . .

# Expose default port
EXPOSE 7860

# Launch FastAPI with uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
