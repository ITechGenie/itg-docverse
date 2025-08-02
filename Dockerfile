# Stage 1: Build the React app
FROM node:22 AS frontend-builder

WORKDIR /app
COPY app/package.json app/package-lock.json ./ 
RUN npm ci
COPY app/ .
RUN npm run build

# Stage 2: Build the FastAPI app
FROM python:3.13-slim AS backend

WORKDIR /api

# Install system dependencies if needed (e.g., for uvicorn, psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy API code and requirements
COPY apis/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY apis/ .

# Copy built frontend into FastAPI static directory
COPY --from=frontend-builder /app/dist ./static

# Expose port (adjust if needed)
EXPOSE 8000

# Start FastAPI app (adjust command as per your API entrypoint)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]