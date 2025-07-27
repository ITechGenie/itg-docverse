from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import uuid

class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate a unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Extract user ID from the authentication token (if available)
        user_id = None
        if "Authorization" in request.headers:
            token = request.headers["Authorization"].split(" ")[1]
            # Decode the token to extract user_id (assuming JWT)
            # Replace this with your actual token decoding logic
            try:
                import jwt
                decoded_token = jwt.decode(token, options={"verify_signature": False})
                user_id = decoded_token.get("user_id")
            except Exception:
                pass

        request.state.user_id = user_id

        # Set the context variables for logging
        from ..utils.logger import set_request_context
        set_request_context(request_id, user_id)

        # Proceed with the request
        response = await call_next(request)
        return response