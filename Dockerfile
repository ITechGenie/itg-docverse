# Stage 1: Build the React app
FROM node:22 AS frontend-builder

WORKDIR /app
COPY app/package.json app/package-lock.json ./ 
RUN npm ci
COPY app/ .
RUN npm run build

# Stage 2: Build the FastAPI app
FROM python:3.12-slim AS backend

WORKDIR /apis

# Install system dependencies for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    pkg-config \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust for building packages like pydantic-core if needed
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Upgrade pip to latest version
RUN pip install --upgrade pip

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