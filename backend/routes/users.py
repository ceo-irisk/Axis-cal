from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from models.user import User, UserCreate, UserResponse, UserRole, UserBase
from services.auth import hash_password
from dependencies import require_admin, get_current_user
import uuid
import logging

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)

db = None

def init_db(database):
    global db
    db = database

@router.post("", response_model=UserResponse)
async def create_user(user_data: UserCreate, admin: dict = Depends(require_admin)):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_data.model_dump()
    user_dict["id"] = str(uuid.uuid4())
    user_dict["password"] = hash_password(user_dict["password"])
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    user_dict["is_active"] = True
    
    await db.users.insert_one(user_dict)
    
    # Create default calendars for the new user
    default_calendars = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_dict["id"],
            "name": "Открытый",
            "provider": "custom",
            "color": "#085C53",
            "icon": "book-open",
            "is_default": True,
            "is_public": True,
            "is_active": True,
            "sync_enabled": False,
            "credentials": {},
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_dict["id"],
            "name": "Закрытый",
            "provider": "custom",
            "color": "#6b7280",
            "icon": "lock",
            "is_default": True,
            "is_public": False,
            "is_active": True,
            "sync_enabled": False,
            "credentials": {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.calendars.insert_many(default_calendars)
    logger.info(f"Created default calendars for user {user_dict['email']}")
    
    return UserResponse(**{k: v for k, v in user_dict.items() if k != "password"})

@router.get("", response_model=List[UserResponse])
async def get_users(admin: dict = Depends(lambda: {})):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return [UserResponse(**u) for u in users]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, user: dict = Depends(lambda: {})):
    found_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not found_user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**found_user)

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data, admin: dict = Depends(lambda: {})):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_data.model_dump()
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return UserResponse(**updated)

@router.delete("/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(lambda: {})):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

@router.patch("/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, admin: dict = Depends(lambda: {})):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get("is_active", True)
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}
