from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from datetime import datetime, timezone
from models.calendar import CalendarConfig, CalendarPermission, UserSubscription
from dependencies import get_current_user
from services.permissions import filter_events_by_permissions
import uuid
import logging

router = APIRouter(prefix="/calendars", tags=["calendars"])
logger = logging.getLogger(__name__)

db = None

def init_db(database):
    global db
    db = database

@router.get("")
async def get_calendars(user: dict = Depends(get_current_user)):
    # Get user's own calendars
    calendars = await db.calendars.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    
    # Add current user as owner for own calendars
    for cal in calendars:
        cal["owner"] = {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
        cal["is_own"] = True
    
    # Get calendars where user has permissions
    permissions = await db.calendar_permissions.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    permitted_calendar_ids = [p["calendar_id"] for p in permissions]
    permission_map = {p["calendar_id"]: p["permission_level"] for p in permissions}
    
    # Get shared calendars
    if permitted_calendar_ids:
        shared_calendars = await db.calendars.find(
            {"id": {"$in": permitted_calendar_ids}},
            {"_id": 0}
        ).to_list(100)
        
        # Get owner info for shared calendars
        owner_ids = [c["user_id"] for c in shared_calendars]
        users = await db.users.find(
            {"id": {"$in": owner_ids}},
            {"_id": 0, "password": 0}
        ).to_list(100)
        user_map = {u["id"]: u for u in users}
        
        # Attach owner info and permission level to shared calendars
        for cal in shared_calendars:
            cal["owner"] = user_map.get(cal["user_id"])
            cal["is_own"] = False
            cal["permission_level"] = permission_map.get(cal["id"], "read")
        
        calendars.extend(shared_calendars)
    
    return calendars

@router.post("", response_model=dict)
async def create_calendar(calendar_data: dict = Body(...), user: dict = Depends(get_current_user)):
    calendar_dict = calendar_data.copy()
    calendar_dict["id"] = str(uuid.uuid4())
    calendar_dict["user_id"] = user["id"]
    calendar_dict["is_default"] = False
    calendar_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.calendars.insert_one(calendar_dict)
    calendar_dict.pop('_id', None)
    
    # Fetch clean data without _id
    created_calendar = await db.calendars.find_one({"id": calendar_dict["id"]}, {"_id": 0})
    return created_calendar

@router.delete("/{calendar_id}")
async def delete_calendar(calendar_id: str, user: dict = Depends(get_current_user)):
    calendar = await db.calendars.find_one({"id": calendar_id})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    if calendar["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot delete calendars owned by other users")
    
    await db.calendars.delete_one({"id": calendar_id})
    return {"message": "Calendar deleted"}

# Calendar Permissions
@router.get("/{calendar_id}/permissions")
async def get_calendar_permissions(calendar_id: str, user: dict = Depends(get_current_user)):
    calendar = await db.calendars.find_one({"id": calendar_id})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    if calendar["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only calendar owner can view permissions")
    
    permissions = await db.calendar_permissions.find({"calendar_id": calendar_id}, {"_id": 0}).to_list(100)
    
    # Attach user info
    if permissions:
        user_ids = [p["user_id"] for p in permissions]
        users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "password": 0}).to_list(100)
        user_map = {u["id"]: u for u in users}
        for perm in permissions:
            perm["user"] = user_map.get(perm["user_id"])
    
    return permissions

@router.post("/{calendar_id}/permissions")
async def create_calendar_permission(
    calendar_id: str,
    permission_data: dict = Body(...),
    user: dict = Depends(get_current_user)
):
    calendar = await db.calendars.find_one({"id": calendar_id})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    if calendar["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only calendar owner can grant permissions")
    
    # Check if permission already exists
    existing = await db.calendar_permissions.find_one({
        "calendar_id": calendar_id,
        "user_id": permission_data["user_id"]
    })
    
    if existing:
        # Update existing permission
        await db.calendar_permissions.update_one(
            {"id": existing["id"]},
            {"$set": {"permission_level": permission_data["permission_level"]}}
        )
        return {**existing, "permission_level": permission_data["permission_level"]}
    
    permission_dict = {
        "id": str(uuid.uuid4()),
        "calendar_id": calendar_id,
        "user_id": permission_data["user_id"],
        "permission_level": permission_data["permission_level"],
        "granted_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.calendar_permissions.insert_one(permission_dict)
    permission_dict.pop('_id', None)
    
    # Fetch clean data without _id
    created_permission = await db.calendar_permissions.find_one({"id": permission_dict["id"]}, {"_id": 0})
    return created_permission

@router.delete("/{calendar_id}/permissions/{permission_user_id}")
async def delete_calendar_permission(
    calendar_id: str,
    permission_user_id: str,
    user: dict = Depends(get_current_user)
):
    calendar = await db.calendars.find_one({"id": calendar_id})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    if calendar["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only calendar owner can revoke permissions")
    
    result = await db.calendar_permissions.delete_one({
        "calendar_id": calendar_id,
        "user_id": permission_user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    return {"message": "Permission revoked"}
