from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from models.user import UserResponse
from services.auth import create_access_token, verify_password
from dependencies import get_current_user
import os

router = APIRouter(prefix="/auth", tags=["auth"])

db = None

def init_db(database):
    global db
    db = database

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
async def login(credentials: LoginRequest):
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
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/change-password")
async def change_password(request: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    """Change password for current user"""
    from services.auth import hash_password
    
    # Verify old password
    current_user = await db.users.find_one({"id": user["id"]})
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(request.old_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    
    # Hash and update new password
    new_password_hash = hash_password(request.new_password)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password": new_password_hash}}
    )
    
    return {"message": "Пароль успешно изменён"}

