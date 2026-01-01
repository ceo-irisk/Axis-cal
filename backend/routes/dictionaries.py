from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from models.other import EventTypeConfig, EventStatusConfig, EventTypeReorderRequest
from dependencies import get_current_user, require_admin
import uuid
import logging

router = APIRouter(prefix="/dictionaries", tags=["dictionaries"])
logger = logging.getLogger(__name__)

db = None

def init_db(database):
    global db
    db = database

# Event Types
@router.get("/event-types")
async def get_event_types(user: dict = Depends(get_current_user)):
    event_types = await db.event_types.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return event_types

@router.post("/event-types")
async def create_event_type(type_data: Dict[str, Any] = Body(...), admin: dict = Depends(require_admin)):
    # Get max order
    existing = await db.event_types.find({}, {"_id": 0}).sort("order", -1).to_list(1)
    max_order = existing[0]["order"] if existing else 0
    
    type_dict = {
        "id": str(uuid.uuid4()),
        "name": type_data.get("name", ""),
        "label": type_data.get("label", ""),
        "color": type_data.get("color", "#6366f1"),
        "order": max_order + 1,
        "is_active": True
    }
    
    await db.event_types.insert_one(type_dict)
    return type_dict

@router.put("/event-types/reorder")
async def reorder_event_types(reorder_data: EventTypeReorderRequest, admin: dict = Depends(require_admin)):
    for idx, type_id in enumerate(reorder_data.type_ids):
        await db.event_types.update_one({"id": type_id}, {"$set": {"order": idx}})
    return {"message": "Event types reordered"}

@router.put("/event-types/{type_id}")
async def update_event_type(
    type_id: str,
    type_data: Dict[str, Any] = Body(...),
    admin: dict = Depends(require_admin)
):
    event_type = await db.event_types.find_one({"id": type_id})
    if not event_type:
        raise HTTPException(status_code=404, detail="Event type not found")
    
    await db.event_types.update_one({"id": type_id}, {"$set": type_data})
    updated = await db.event_types.find_one({"id": type_id}, {"_id": 0})
    return updated

@router.delete("/event-types/{type_id}")
async def delete_event_type(type_id: str, admin: dict = Depends(require_admin)):
    # Soft delete by marking as inactive
    result = await db.event_types.update_one({"id": type_id}, {"$set": {"is_active": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Event type not found")
    return {"message": "Event type deleted"}

# Event Statuses
@router.get("/event-statuses")
async def get_event_statuses(user: dict = Depends(get_current_user)):
    statuses = await db.event_statuses.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    if not statuses:
        # Return default statuses if none exist
        return [
            {"id": "default-confirmed", "name": "confirmed", "label": "Подтверждено", "color": "#10b981", "order": 0, "is_active": True},
            {"id": "default-tentative", "name": "tentative", "label": "Предварительно", "color": "#f59e0b", "order": 1, "is_active": True},
            {"id": "default-cancelled", "name": "cancelled", "label": "Отменено", "color": "#ef4444", "order": 2, "is_active": True}
        ]
    return statuses

@router.post("/event-statuses")
async def create_event_status(status_data: Dict[str, Any] = Body(...), admin: dict = Depends(require_admin)):
    # Get max order
    existing = await db.event_statuses.find({}, {"_id": 0}).sort("order", -1).to_list(1)
    max_order = existing[0]["order"] if existing else 0
    
    status_dict = {
        "id": str(uuid.uuid4()),
        "name": status_data.get("name", ""),
        "label": status_data.get("label", ""),
        "color": status_data.get("color", "#6366f1"),
        "order": max_order + 1,
        "is_active": True
    }
    
    await db.event_statuses.insert_one(status_dict)
    return status_dict

@router.put("/event-statuses/{status_id}")
async def update_event_status(
    status_id: str,
    status_data: Dict[str, Any] = Body(...),
    admin: dict = Depends(require_admin)
):
    status = await db.event_statuses.find_one({"id": status_id})
    if not status:
        raise HTTPException(status_code=404, detail="Event status not found")
    
    await db.event_statuses.update_one({"id": status_id}, {"$set": status_data})
    updated = await db.event_statuses.find_one({"id": status_id}, {"_id": 0})
    return updated

@router.delete("/event-statuses/{status_id}")
async def delete_event_status(status_id: str, admin: dict = Depends(require_admin)):
    # Soft delete
    result = await db.event_statuses.update_one({"id": status_id}, {"$set": {"is_active": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Event status not found")
    return {"message": "Event status deleted"}

# Timezones
@router.get("/timezones")
async def get_timezones(user: dict = Depends(get_current_user)):
    timezones = await db.custom_timezones.find({}, {"_id": 0}).to_list(100)
    return timezones

@router.post("/timezones")
async def create_timezone(timezone_data: Dict[str, Any] = Body(...), admin: dict = Depends(require_admin)):
    timezone_dict = {
        "id": str(uuid.uuid4()),
        "name": timezone_data.get("name", ""),
        "offset": timezone_data.get("offset", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.custom_timezones.insert_one(timezone_dict)
    return timezone_dict

@router.delete("/timezones/{timezone_id}")
async def delete_timezone(timezone_id: str, admin: dict = Depends(require_admin)):
    result = await db.custom_timezones.delete_one({"id": timezone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Timezone not found")
    return {"message": "Timezone deleted"}
