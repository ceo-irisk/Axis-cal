from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from models.event import Event, EventCreate, EventStatus, RecurrenceType
from dependencies import get_current_user
from services.permissions import filter_events_by_permissions
from services.recurrence import generate_recurring_instances
import uuid
import logging

router = APIRouter(prefix="/events", tags=["events"])
logger = logging.getLogger(__name__)

db = None

def init_db(database):
    global db
    db = database

@router.post("", response_model=dict)
async def create_event(event_data: EventCreate, user: dict = Depends(get_current_user)):
    event_dict = event_data.model_dump()
    event_dict["id"] = str(uuid.uuid4())
    event_dict["created_by"] = user["id"]
    event_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    event_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Ensure start_time and end_time are aware datetime in UTC
    if isinstance(event_dict["start_time"], datetime):
        if event_dict["start_time"].tzinfo is None:
            event_dict["start_time"] = event_dict["start_time"].replace(tzinfo=timezone.utc)
        event_dict["start_time"] = event_dict["start_time"].isoformat()
    
    if isinstance(event_dict["end_time"], datetime):
        if event_dict["end_time"].tzinfo is None:
            event_dict["end_time"] = event_dict["end_time"].replace(tzinfo=timezone.utc)
        event_dict["end_time"] = event_dict["end_time"].isoformat()
    
    await db.events.insert_one(event_dict)
    event_dict.pop('_id', None)  # Remove MongoDB ObjectId for JSON serialization
    return event_dict

@router.get("")
async def get_events(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    query = {}
    
    # If viewing another user's events, use that user_id, otherwise use current user
    target_user_id = user_id if user_id else user["id"]
    
    # Build query for date range
    if start_date and end_date:
        query["$or"] = [
            {"start_time": {"$gte": start_date, "$lte": end_date}},
            {"end_time": {"$gte": start_date, "$lte": end_date}}
        ]
    
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    
    # Filter events by permissions
    filtered_events = await filter_events_by_permissions(events, user["id"], db)
    
    return filtered_events

@router.get("/{event_id}")
async def get_event(event_id: str, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.put("/{event_id}")
async def update_event(event_id: str, event_data: EventCreate, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check permissions
    if event["created_by"] != user["id"]:
        calendar_id = event.get("calendar_id")
        if calendar_id:
            permission = await db.calendar_permissions.find_one({
                "calendar_id": calendar_id,
                "user_id": user["id"],
                "permission_level": {"$in": ["edit", "full"]}
            })
            if not permission:
                raise HTTPException(status_code=403, detail="No permission to edit this event")
    
    update_dict = event_data.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Ensure datetime fields are properly formatted
    if isinstance(update_dict["start_time"], datetime):
        if update_dict["start_time"].tzinfo is None:
            update_dict["start_time"] = update_dict["start_time"].replace(tzinfo=timezone.utc)
        update_dict["start_time"] = update_dict["start_time"].isoformat()
    
    if isinstance(update_dict["end_time"], datetime):
        if update_dict["end_time"].tzinfo is None:
            update_dict["end_time"] = update_dict["end_time"].replace(tzinfo=timezone.utc)
        update_dict["end_time"] = update_dict["end_time"].isoformat()
    
    # Update recurring instances if this is a parent recurring event
    if event.get("recurrence_type") and event.get("recurrence_type") not in ["none", None, ""]:
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.events.update_one({"id": event_id}, {"$set": update_dict})
    
    updated_event = await db.events.find_one({"id": event_id}, {"_id": 0})
    return updated_event

@router.delete("/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot delete events created by other users")
    
    await db.events.delete_one({"id": event_id})
    return {"message": "Event deleted"}
