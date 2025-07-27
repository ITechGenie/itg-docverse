"""
JWT Authentication Service
Handles JWT token generation, validation, and user authentication
"""

import jwt
import redis
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import HTTPException, status

from ..config.settings import get_settings

settings = get_settings()

class AuthService:
    """Authentication service for JWT tokens"""
    
    def __init__(self):
        self.secret_key = getattr(settings, 'jwt_secret_key', 'itg-docverse-default-secret-key-change-in-production')
        self.algorithm = "HS256"
        self.token_expiry_hours = 4
        self.issuer = "itg-docverse"
        self.audience = "itg-docverse-users"
        
        # Initialize cache based on settings
        if getattr(settings, 'cache_type', 'memory').lower() == 'redis':
            try:
                self.cache = redis.Redis(
                    host=getattr(settings, 'redis_host', 'localhost'),
                    port=getattr(settings, 'redis_port', 6379),
                    decode_responses=True
                )
                self.cache_type = 'redis'
            except Exception:
                # Fallback to memory cache if Redis fails
                self.cache = {}
                self.cache_type = 'memory'
        else:
            self.cache = {}
            self.cache_type = 'memory'
    
    def generate_token(self, user_id: str, additional_claims: Optional[Dict] = None) -> str:
        """Generate JWT token for user"""
        now = datetime.now(timezone.utc)
        payload = {
            'user_id': user_id,
            'iat': now,
            'exp': now + timedelta(hours=self.token_expiry_hours),
            'iss': 'itg-docverse',
            'aud': 'itg-docverse-users'
        }
        
        if additional_claims:
            payload.update(additional_claims)
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        
        # Store token in cache for validation
        self._store_token(user_id, token, payload)
        
        return token
    
    async def validate_token(self, token: str) -> dict:
        """Validate and decode JWT token"""
        try:
            # Decode and validate token
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                issuer=self.issuer,
                audience=self.audience
            )
            
            # Verify required fields
            required_fields = ['user_id', 'exp', 'iat']
            for field in required_fields:
                if field not in payload:
                    raise HTTPException(status_code=401, detail=f"Missing required field: {field}")
            
            # Check if token is expired
            current_time = datetime.utcnow().timestamp()
            if payload['exp'] < current_time:
                raise HTTPException(status_code=401, detail="Token has expired")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")
    
    def revoke_token(self, user_id: str, token: str) -> bool:
        """Revoke a specific token"""
        try:
            if self.cache_type == 'redis':
                self.cache.hdel(f"user_tokens:{user_id}", token)
            else:
                user_tokens = self.cache.get(f"user_tokens:{user_id}", {})
                user_tokens.pop(token, None)
                self.cache[f"user_tokens:{user_id}"] = user_tokens
            return True
        except Exception:
            return False
    
    def revoke_all_tokens(self, user_id: str) -> bool:
        """Revoke all tokens for a user"""
        try:
            if self.cache_type == 'redis':
                self.cache.delete(f"user_tokens:{user_id}")
            else:
                self.cache.pop(f"user_tokens:{user_id}", None)
            return True
        except Exception:
            return False
    
    def _store_token(self, user_id: str, token: str, payload: Dict) -> None:
        """Store token in cache"""
        try:
            token_data = {
                'created_at': datetime.now(timezone.utc).isoformat(),
                'expires_at': payload['exp'].isoformat() if isinstance(payload['exp'], datetime) else payload['exp'],
                'payload': payload
            }
            
            if self.cache_type == 'redis':
                # Store with expiration
                self.cache.hset(f"user_tokens:{user_id}", token, json.dumps(token_data, default=str))
                self.cache.expire(f"user_tokens:{user_id}", self.token_expiry_hours * 3600)
            else:
                # Memory cache
                if f"user_tokens:{user_id}" not in self.cache:
                    self.cache[f"user_tokens:{user_id}"] = {}
                self.cache[f"user_tokens:{user_id}"][token] = token_data
                
        except Exception as e:
            # If cache fails, continue anyway (token is still valid via JWT)
            pass
    
    def _is_token_valid_in_cache(self, user_id: str, token: str) -> bool:
        """Check if token exists and is valid in cache"""
        try:
            if self.cache_type == 'redis':
                token_data = self.cache.hget(f"user_tokens:{user_id}", token)
                return token_data is not None
            else:
                user_tokens = self.cache.get(f"user_tokens:{user_id}", {})
                return token in user_tokens
        except Exception:
            # If cache check fails, allow JWT validation to proceed
            return True

# Global auth service instance
auth_service = AuthService()
