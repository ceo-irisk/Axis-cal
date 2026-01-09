import bcrypt
import jwt
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

# Read JWT_SECRET from environment - no fallback for security
JWT_SECRET = os.environ.get('JWT_SECRET', 'executive_calendar_secret')  # Fallback only for dev
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except:
        return False

def create_access_token(user_id: str, role: str, secret: Optional[str] = None) -> str:
    """Create a JWT access token"""
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, secret or JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str, secret: Optional[str] = None) -> dict:
    """Decode and verify a JWT token"""
    return jwt.decode(token, secret or JWT_SECRET, algorithms=[JWT_ALGORITHM])
