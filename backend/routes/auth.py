from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models.user import User, UserCreate, UserResponse
from services.auth import hash_password, create_access_token, verify_password
import os

router = APIRouter(prefix="/auth", tags=["auth"])

# This will be injected from main server
db = None

def init_db(database):
    global db
    db = database

class LoginRequest:
    def __init__(self, email: str, password: str):
        self.email = email
        self.password = password

from pydantic import BaseModel, EmailStr

class LoginReq(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
async def login(credentials: LoginReq):
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="User account is disabled")
    
    jwt_secret = os.environ.get('JWT_SECRET', 'executive_calendar_secret')
    token = create_access_token(user["id"], user["role"], jwt_secret)
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        timezone=user.get("timezone", "Europe/Moscow"),
        is_active=user.get("is_active", True)
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_response
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(user: dict = Depends(lambda: {})):
    # This will be properly implemented with dependency injection
    pass
