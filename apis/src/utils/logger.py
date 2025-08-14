import logging
import json
import inspect
from datetime import datetime
from typing import Optional
from contextvars import ContextVar
from starlette.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from ..middleware.request_context import RequestContextMiddleware

# Context variables to store request-level data
_request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
_user_id_var: ContextVar[Optional[str]] = ContextVar('user_id', default=None)

# Add the RequestContextMiddleware to the middleware stack
middleware = [
    Middleware(RequestContextMiddleware)
]

class CustomFormatter(logging.Formatter):
    """Custom formatter that includes request context and caller information"""
    
    def __init__(self, json_format: bool = False):
        super().__init__()
        self.json_format = json_format

    def format(self, record):
        # Get request context
        request_id = _request_id_var.get()
        user_id = _user_id_var.get()
        
        # Use the record's information for caller details
        class_name = record.name
        method_name = record.funcName
        
        # Try to get more specific class information from the stack
        try:
            frame = inspect.currentframe()
            # Skip logging framework frames to find the actual caller
            for i in range(10):  # Look up to 10 frames back
                frame = frame.f_back
                if frame is None:
                    break
                
                # Skip frames from logging module
                if 'logging' in frame.f_code.co_filename:
                    continue
                    
                # Found a non-logging frame
                method_name = frame.f_code.co_name
                
                # Try to get class name
                if 'self' in frame.f_locals:
                    class_name = frame.f_locals['self'].__class__.__name__
                    break
                elif 'cls' in frame.f_locals:
                    class_name = frame.f_locals['cls'].__name__
                    break
                else:
                    # Use module name as fallback
                    import os
                    module_name = os.path.basename(frame.f_code.co_filename).replace('.py', '')
                    if module_name != '__init__':
                        class_name = module_name
                        break
                        
        except Exception as e:
            # Fallback to record information
            class_name = record.name
            method_name = record.funcName

        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "request_id": request_id,
            "user_id": user_id,
            "logger": record.name,
            "class_name": class_name,
            "method_name": method_name,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno
        }

        if self.json_format:
            return json.dumps(log_entry)
        else:
            return f"[{log_entry['timestamp']}] [{log_entry['level']}] [RequestID: {log_entry['request_id']}] [UserID: {log_entry['user_id']}] [{log_entry['class_name']}.{log_entry['method_name']}:{log_entry['line']}] {log_entry['message']}"

def get_logger(name: str, level: str = "INFO", json_format: bool = False) -> logging.Logger:
    """Get a configured logger instance"""
    logger = logging.getLogger(name)
    
    # Avoid adding duplicate handlers
    if not logger.handlers:
        logger.setLevel(getattr(logging, level.upper(), logging.INFO))
        
        # Create console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(getattr(logging, level.upper(), logging.INFO))
        
        # Add custom formatter
        formatter = CustomFormatter(json_format=json_format)
        console_handler.setFormatter(formatter)
        
        logger.addHandler(console_handler)
        
        # Prevent propagation to avoid duplicate logs
        logger.propagate = False
    
    return logger

# Helper functions to set context variables (to be used in middleware)
def set_request_context(request_id: str, user_id: Optional[str] = None):
    """Set the request context variables"""
    _request_id_var.set(request_id)
    _user_id_var.set(user_id)
