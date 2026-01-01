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
    
    # Get subscribed users
    subscriptions = await db.user_subscriptions.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    subscribed_user_ids = [sub["target_user_id"] for sub in subscriptions]
    
    # Get calendars from subscribed users
    if subscribed_user_ids:
        subscribed_calendars = await db.calendars.find(
            {"user_id": {"$in": subscribed_user_ids}},
            {"_id": 0}
        ).to_list(100)
        
        # Get user info for subscribed calendars
        users = await db.users.find(
            {"id": {"$in": subscribed_user_ids}},
            {"_id": 0, "password": 0}
        ).to_list(100)
        user_map = {u["id"]: u for u in users}
        
        # Attach user info to subscribed calendars
        for cal in subscribed_calendars:
            cal["owner"] = user_map.get(cal["user_id"])
        
        calendars.extend(subscribed_calendars)
    
    return calendars

@router.post("", response_model=dict)
async def create_calendar(calendar_data: dict = Body(...), user: dict = Depends(get_current_user)):
    calendar_dict = calendar_data.copy()
    calendar_dict["id"] = str(uuid.uuid4())
    calendar_dict["user_id"] = user["id"]
    calendar_dict["is_default"] = False
    calendar_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.calendars.insert_one(calendar_dict)
    
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

# User Subscriptions
subscriptions_router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

@subscriptions_router.get("")
async def get_subscriptions(user: dict = Depends(get_current_user)):
    subscriptions = await db.user_subscriptions.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    
    if subscriptions:
        target_user_ids = [sub["target_user_id"] for sub in subscriptions]
        users = await db.users.find(
            {"id": {"$in": target_user_ids}},
            {"_id": 0, "password": 0}
        ).to_list(100)
        user_map = {u["id"]: u for u in users}
        
        for sub in subscriptions:
            sub["target_user"] = user_map.get(sub["target_user_id"])
    
    return subscriptions

@subscriptions_router.post("")
async def create_subscription(subscription_data: dict = Body(...), user: dict = Depends(get_current_user)):
    target_user_id = subscription_data.get("target_user_id")
    
    if target_user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot subscribe to yourself")
    
    # Check if target user exists
    target_user = await db.users.find_one({"id": target_user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if subscription already exists
    existing = await db.user_subscriptions.find_one({
        "user_id": user["id"],
        "target_user_id": target_user_id
    })
    
    if existing:
        return existing
    
    subscription_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "target_user_id": target_user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_subscriptions.insert_one(subscription_dict)
    
    # Fetch clean data without _id
    created_subscription = await db.user_subscriptions.find_one({"id": subscription_dict["id"]}, {"_id": 0})
    return created_subscription

@subscriptions_router.delete("/{target_user_id}")
async def delete_subscription(target_user_id: str, user: dict = Depends(get_current_user)):
    result = await db.user_subscriptions.delete_one({
        "user_id": user["id"],
        "target_user_id": target_user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    return {"message": "Unsubscribed"}
