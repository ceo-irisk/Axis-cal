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
    
    # Check permissions if calendar_id is provided
    if event_dict.get("calendar_id"):
        calendar_id = event_dict["calendar_id"]
        
        # Check if user owns this calendar
        calendar = await db.calendars.find_one({"id": calendar_id})
        if not calendar:
            raise HTTPException(status_code=404, detail="Календарь не найден")
        
        is_owner = calendar.get("user_id") == user["id"]
        
        # If not owner, check permissions
        if not is_owner:
            permission = await db.calendar_permissions.find_one({
                "calendar_id": calendar_id,
                "user_id": user["id"]
            })
            
            if not permission:
                raise HTTPException(status_code=403, detail="Нет доступа к этому календарю")
            
            # view_busy and read permissions cannot create events
            if permission.get("permission_level") in ["view_busy", "read"]:
                raise HTTPException(
                    status_code=403, 
                    detail="Недостаточно прав. Для создания событий нужны права 'Редактирование' или 'Полный доступ'"
                )
    
    # Convert datetime objects to ISO strings (pydantic converts strings to datetime)
    if isinstance(event_dict.get("start_time"), datetime):
        event_dict["start_time"] = event_dict["start_time"].isoformat()
    if isinstance(event_dict.get("end_time"), datetime):
        event_dict["end_time"] = event_dict["end_time"].isoformat()
    if isinstance(event_dict.get("recurrence_end_date"), datetime):
        event_dict["recurrence_end_date"] = event_dict["recurrence_end_date"].isoformat()
    
    await db.events.insert_one(event_dict)
    
    # Fetch clean data without _id
    created_event = await db.events.find_one({"id": event_dict["id"]}, {"_id": 0})
    return created_event

@router.get("")
async def get_events(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    expand_recurring: bool = Query(True),
    skip: int = Query(0, ge=0),  # ✨ NEW: Pagination offset
    limit: int = Query(100, ge=1, le=1000),  # ✨ NEW: Pagination limit
    user: dict = Depends(get_current_user)
):
    """
    Get events with optional filtering and pagination
    
    Pagination:
    - skip: Number of events to skip (default: 0)
    - limit: Maximum number of events to return (default: 100, max: 1000)
    - Works with date filtering for efficient queries
    
    Expanding recurring events:
    - expand_recurring=true: Generates instances (ignores pagination for recurring)
    - expand_recurring=false: Returns only base events (pagination applied)
    """
    # Build query for date range
    query = {}
    if start_date and end_date:
        query["$or"] = [
            {"start_time": {"$gte": start_date, "$lte": end_date}},
            {"end_time": {"$gte": start_date, "$lte": end_date}}
        ]
    
    # When NOT expanding recurring - apply pagination to base events
    if not expand_recurring:
        events = await db.events.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
        filtered_events = await filter_events_by_permissions(events, user["id"], db)
        
        # Get total count for pagination info
        total_count = await db.events.count_documents(query)
        
        return {
            "events": filtered_events,
            "pagination": {
                "skip": skip,
                "limit": limit,
                "total": total_count,
                "has_more": (skip + limit) < total_count
            }
        }
    
    # When expanding recurring - load all and generate instances
    # (pagination less effective here as we need to generate instances)
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    
    # Expand recurring events if requested
    if expand_recurring and start_date and end_date:
        # Get ALL recurring events (even outside date range - they might have instances inside)
        all_recurring = await db.events.find(
            {"recurrence_type": {"$nin": ["none", None, ""]}},
            {"_id": 0}
        ).to_list(1000)
        
        # Load ALL exceptions for recurring events
        recurring_event_ids = [e["id"] for e in all_recurring]
        exceptions_list = []
        if recurring_event_ids:
            exceptions_list = await db.recurring_exceptions.find(
                {"parent_event_id": {"$in": recurring_event_ids}},
                {"_id": 0}
            ).to_list(1000)
        
        # Group exceptions by parent event ID
        exceptions_by_parent = {}
        for exc in exceptions_list:
            parent_id = exc["parent_event_id"]
            if parent_id not in exceptions_by_parent:
                exceptions_by_parent[parent_id] = []
            exceptions_by_parent[parent_id].append(exc)
        
        # Parse dates
        start_dt = datetime.fromisoformat(start_date)
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=timezone.utc)
        
        end_dt = datetime.fromisoformat(end_date)
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=timezone.utc)
        
        # Generate instances for all recurring events (with exceptions)
        result_events = list(events)
        processed_ids = set()
        
        for event in all_recurring:
            event_id = event.get("id")
            if event_id in processed_ids:
                continue
            
            # Get exceptions for this event
            event_exceptions = exceptions_by_parent.get(event_id, [])
            
            instances = generate_recurring_instances(event, start_dt, end_dt, event_exceptions)
            result_events.extend(instances)
            processed_ids.add(event_id)
        
        # Filter events by permissions
        filtered_events = await filter_events_by_permissions(result_events, user["id"], db)
        return filtered_events
    
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
                raise HTTPException(status_code=403, detail="Недостаточно прав")
        else:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    update_dict = event_data.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Convert datetime objects to ISO strings
    if isinstance(update_dict.get("start_time"), datetime):
        update_dict["start_time"] = update_dict["start_time"].isoformat()
    if isinstance(update_dict.get("end_time"), datetime):
        update_dict["end_time"] = update_dict["end_time"].isoformat()
    if isinstance(update_dict.get("recurrence_end_date"), datetime):
        update_dict["recurrence_end_date"] = update_dict["recurrence_end_date"].isoformat()
    
    await db.events.update_one({"id": event_id}, {"$set": update_dict})
    
    updated_event = await db.events.find_one({"id": event_id}, {"_id": 0})
    return updated_event

@router.delete("/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if user is the creator
    if event["created_by"] != user["id"]:
        # Check if user has full permissions to the calendar
        calendar_id = event.get("calendar_id")
        if calendar_id:
            permission = await db.calendar_permissions.find_one({
                "calendar_id": calendar_id,
                "user_id": user["id"],
                "permission_level": "full"
            })
            if not permission:
                raise HTTPException(status_code=403, detail="Недостаточно прав")
        else:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    await db.events.delete_one({"id": event_id})
    return {"message": "Event deleted"}
