from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from models.template import Template, TemplateBase
from dependencies import get_current_user, require_manager_or_admin
import uuid
import logging

router = APIRouter(prefix="/templates", tags=["templates"])
logger = logging.getLogger(__name__)

db = None

def init_db(database):
    global db
    db = database

@router.post("")
async def create_template(template_data: TemplateBase, user: dict = Depends(require_manager_or_admin)):
    template_dict = template_data.model_dump()
    template_dict["id"] = str(uuid.uuid4())
    template_dict["created_by"] = user["id"]
    template_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.templates.insert_one(template_dict)
    
    # Fetch clean data without _id
    created_template = await db.templates.find_one({"id": template_dict["id"]}, {"_id": 0})
    return created_template

@router.get("")
async def get_templates(user: dict = Depends(get_current_user)):
    templates = await db.templates.find({}, {"_id": 0}).to_list(100)
    return templates

@router.put("/{template_id}")
async def update_template(template_id: str, template_data: TemplateBase, user: dict = Depends(require_manager_or_admin)):
    template = await db.templates.find_one({"id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_dict = template_data.model_dump()
    await db.templates.update_one({"id": template_id}, {"$set": update_dict})
    
    updated = await db.templates.find_one({"id": template_id}, {"_id": 0})
    return updated

@router.delete("/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(require_manager_or_admin)):
    result = await db.templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

@router.post("/{template_id}/apply")
async def apply_template(template_id: str, target_date: str, user: dict = Depends(get_current_user)):
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Parse target date as naive datetime (user's local date)
    try:
        target_dt = datetime.strptime(target_date, "%Y-%m-%d")
    except:
        try:
            target_dt = datetime.fromisoformat(target_date.split('T')[0])
        except:
            raise HTTPException(status_code=400, detail="Invalid date format")
    
    # Get user's default "Открытый" calendar
    default_calendar = await db.calendars.find_one({
        "user_id": user["id"],
        "name": "Открытый",
        "is_default": True
    })
    default_calendar_id = default_calendar["id"] if default_calendar else None
    
    # Check if there are already template events for this day
    start_of_day_str = target_dt.strftime("%Y-%m-%d") + "T00:00:00"
    end_of_day_str = target_dt.strftime("%Y-%m-%d") + "T23:59:59"
    
    existing_template_events = await db.events.find({
        "created_by": user["id"],
        "status": "template",
        "start_time": {
            "$gte": start_of_day_str,
            "$lt": end_of_day_str
        }
    }, {"_id": 0}).to_list(100)
    
    # Delete existing template events for this day
    if existing_template_events:
        event_ids = [e["id"] for e in existing_template_events]
        await db.events.delete_many({"id": {"$in": event_ids}})
        logger.info(f"Deleted {len(event_ids)} existing template events for {target_date}")
    
    # Create events from template
    created_events = []
    for event_template in template.get("events", []):
        # Parse relative time
        start_time_str = event_template.get("start_time", "09:00")
        end_time_str = event_template.get("end_time", "10:00")
        
        start_hour, start_minute = map(int, start_time_str.split(":"))
        end_hour, end_minute = map(int, end_time_str.split(":"))
        
        # Use target_dt date but with specified time
        event_start = target_dt.replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)
        event_end = target_dt.replace(hour=end_hour, minute=end_minute, second=0, microsecond=0)
        
        event_dict = {
            "id": str(uuid.uuid4()),
            "title": event_template.get("title", "Untitled"),
            "description": event_template.get("description", ""),
            "start_time": event_start.isoformat(),
            "end_time": event_end.isoformat(),
            "event_type": event_template.get("event_type", "meeting"),
            "status": "template",
            "created_by": user["id"],
            "calendar_id": default_calendar_id,
            "attendees": [],
            "location": event_template.get("location", ""),
            "is_all_day": False,
            "is_urgent": False,
            "is_blocked": False,
            "is_completed": False,
            "is_video_call": False,
            "recurrence_type": "none",
            "timezone": user.get("timezone", "Europe/Moscow"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        created_events.append(event_dict)
    
    if created_events:
        await db.events.insert_many(created_events)
    
    return {"message": f"Template applied with {len(created_events)} events", "events": created_events}

@router.delete("/applied/{date}")
async def remove_template_from_day(date: str, user: dict = Depends(get_current_user)):
    try:
        target_dt = datetime.fromisoformat(date)
    except:
        try:
            target_dt = datetime.strptime(date, "%Y-%m-%d")
        except:
            raise HTTPException(status_code=400, detail="Invalid date format")
    
    if target_dt.tzinfo is None:
        target_dt = target_dt.replace(tzinfo=timezone.utc)
    
    start_of_day = target_dt.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    result = await db.events.delete_many({
        "created_by": user["id"],
        "status": "template",
        "start_time": {
            "$gte": start_of_day.isoformat(),
            "$lt": end_of_day.isoformat()
        }
    })
    
    return {"message": f"Removed {result.deleted_count} template events"}

@router.get("/applied")
async def get_applied_templates(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {
        "created_by": user["id"],
        "status": "template"
    }
    
    if start_date and end_date:
        query["start_time"] = {"$gte": start_date, "$lte": end_date}
    
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    
    # Group by date and return array of {date, events} objects
    applied_dates_dict = {}
    for event in events:
        event_date = event["start_time"][:10]  # Extract YYYY-MM-DD
        if event_date not in applied_dates_dict:
            applied_dates_dict[event_date] = []
        applied_dates_dict[event_date].append(event)
    
    # Convert to array format expected by frontend
    result = [
        {"date": date, "events": events_list}
        for date, events_list in applied_dates_dict.items()
    ]
    
    return result
