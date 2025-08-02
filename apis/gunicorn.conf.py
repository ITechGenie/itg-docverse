# Gunicorn configuration for production
import os

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
backlog = 2048

# Worker processes
workers = int(os.getenv('WORKERS', '4'))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Process naming
proc_name = "itg-docverse-api"

# Worker timeout
timeout = 30
keepalive = 5

# SSL (if needed)
# keyfile = "path/to/keyfile"
# certfile = "path/to/certfile"
