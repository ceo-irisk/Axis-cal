from fastapi import APIRouter, HTTPException, Depends, Body, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from models.other import DayRule, EventFieldConfig
from dependencies import get_current_user, require_admin
import uuid
import logging

router = APIRouter(prefix="/rules", tags=["rules"])
analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])
event_fields_router = APIRouter(prefix="/event-fields", tags=["event-fields"])
recurring_router = APIRouter(prefix="/recurring-events", tags=["recurring-events"])
user_events_router = APIRouter(prefix="/users", tags=["user-events"])

logger = logging.getLogger(__name__)

db = None

def init_db(database):
    global db
    db = database

# Rules
@router.get("")
async def get_rules(user: dict = Depends(get_current_user)):
    rules = await db.day_rules.find({"is_active": True}, {"_id": 0}).to_list(100)
    return rules

@router.post("")
async def create_rule(rule_data: Dict[str, Any] = Body(...), admin: dict = Depends(require_admin)):
    rule_dict = {
        "id": str(uuid.uuid4()),
        "name": rule_data.get("name", ""),
        "description": rule_data.get("description", ""),
        "rule_type": rule_data.get("rule_type", ""),
        "value": rule_data.get("value", 0),
        "is_active": True
    }
    
    await db.day_rules.insert_one(rule_dict)
    rule_dict.pop('_id', None)
    
    # Fetch clean data without _id
    created_rule = await db.day_rules.find_one({"id": rule_dict["id"]}, {"_id": 0})
    return created_rule

@router.put("/{rule_id}")
async def update_rule(rule_id: str, rule_data: Dict[str, Any] = Body(...), admin: dict = Depends(require_admin)):
    rule = await db.day_rules.find_one({"id": rule_id})
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    await db.day_rules.update_one({"id": rule_id}, {"$set": rule_data})
    updated = await db.day_rules.find_one({"id": rule_id}, {"_id": 0})
    return updated

@router.delete("/{rule_id}")
async def delete_rule(rule_id: str, admin: dict = Depends(require_admin)):
    result = await db.day_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Rule deleted"}

@router.get("/check/{date}")
async def check_rules_for_date(date: str, user: dict = Depends(get_current_user)):
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    end_of_day = start_of_day + timedelta(days=1)
    
    events = await db.events.find({
        "created_by": user["id"],
        "start_time": {"$gte": start_of_day.isoformat(), "$lt": end_of_day.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    rules = await db.day_rules.find({"is_active": True}, {"_id": 0}).to_list(100)
    
    violations = []
    
    for rule in rules:
        rule_type = rule.get("rule_type")
        value = rule.get("value")
        
        if rule_type == "max_meetings":
            if len(events) > value:
                violations.append({
                    "rule": rule["name"],
                    "message": f"Превышено максимальное количество встреч ({len(events)}/{value})"
                })
        
        elif rule_type == "max_hours":
            total_hours = 0
            for event in events:
                start = datetime.fromisoformat(event["start_time"])
                end = datetime.fromisoformat(event["end_time"])
                duration = (end - start).total_seconds() / 3600
                total_hours += duration
            
            if total_hours > value:
                violations.append({
                    "rule": rule["name"],
                    "message": f"Превышено максимальное количество рабочих часов ({total_hours:.1f}/{value})"
                })
        
        elif rule_type == "min_break":
            sorted_events = sorted(events, key=lambda e: e["start_time"])
            for i in range(len(sorted_events) - 1):
                current_end = datetime.fromisoformat(sorted_events[i]["end_time"])
                next_start = datetime.fromisoformat(sorted_events[i + 1]["start_time"])
                break_minutes = (next_start - current_end).total_seconds() / 60
                
                if break_minutes < value:
                    violations.append({
                        "rule": rule["name"],
                        "message": f"Недостаточный перерыв между встречами ({break_minutes:.0f}/{value} мин)"
                    })
    
    return {
        "date": date,
        "total_events": len(events),
        "violations": violations,
        "is_compliant": len(violations) == 0
    }

# Analytics
@analytics_router.get("/overloaded-days")
async def get_overloaded_days(
    start_date: str = Query(...),
    end_date: str = Query(...),
    user: dict = Depends(get_current_user)
):
    events = await db.events.find({
        "created_by": user["id"],
        "start_time": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(10000)
    
    # Get max_meetings rule
    max_meetings_rule = await db.day_rules.find_one({"rule_type": "max_meetings", "is_active": True})
    max_meetings = max_meetings_rule["value"] if max_meetings_rule else 8
    
    # Group by date
    events_by_date = {}
    for event in events:
        event_date = event["start_time"][:10]
        if event_date not in events_by_date:
            events_by_date[event_date] = []
        events_by_date[event_date].append(event)
    
    overloaded_days = []
    for date, day_events in events_by_date.items():
        if len(day_events) > max_meetings:
            overloaded_days.append({
                "date": date,
                "event_count": len(day_events),
                "max_allowed": max_meetings
            })
    
    return overloaded_days

# Event Fields
@event_fields_router.get("")
async def get_event_fields(user: dict = Depends(get_current_user)):
    config = await db.event_field_config.find_one({}, {"_id": 0})
    if not config:
        return {"fields": []}
    return config

@event_fields_router.put("")
async def update_event_fields(fields_data: Dict[str, Any] = Body(...), admin: dict = Depends(require_admin)):
    config = await db.event_field_config.find_one({})
    
    if config:
        await db.event_field_config.update_one(
            {"id": config["id"]},
            {"$set": {"fields": fields_data.get("fields", []), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        config_dict = {
            "id": str(uuid.uuid4()),
            "fields": fields_data.get("fields", []),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.event_field_config.insert_one(config_dict)
    
    updated = await db.event_field_config.find_one({}, {"_id": 0})
    return updated

# Recurring Events - DEPRECATED, use GET /events?expand_recurring=true instead
# Keeping for backward compatibility
@recurring_router.get("")
async def get_recurring_events_deprecated(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    """Deprecated: Use GET /events?expand_recurring=true instead"""
    from routes.events import get_events as events_get
    return await events_get(start_date, end_date, None, True, user)

# User Events (for viewing other user's events)
@user_events_router.get("/{user_id}/events")
async def get_user_events(
    user_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    from services.permissions import filter_events_by_permissions
    
    # Check if current user has permissions to view target user's calendars
    # (Removed subscription check - now only calendar_permissions matter)
    if user["id"] != user_id:
        # Check if user has any permissions to target user's calendars
        target_calendars = await db.calendars.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        target_calendar_ids = [c["id"] for c in target_calendars]
        
        if target_calendar_ids:
            has_permission = await db.calendar_permissions.find_one({
                "calendar_id": {"$in": target_calendar_ids},
                "user_id": user["id"]
            })
            
            if not has_permission:
                raise HTTPException(status_code=403, detail="No permission to view this user's calendar")
    
    # Get events
    query = {}
    if start_date and end_date:
        query["$or"] = [
            {"start_time": {"$gte": start_date, "$lte": end_date}},
            {"end_time": {"$gte": start_date, "$lte": end_date}}
        ]
    
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    
    # Filter by permissions
    filtered_events = await filter_events_by_permissions(events, user["id"], db)
    
    # Filter to only show events from target user's calendars
    target_calendars = await db.calendars.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    target_calendar_ids = {c["id"] for c in target_calendars}
    


# ✨ NEW: Event counts for sidebar calendar (optimized for performance)
@analytics_router.get("/event-counts")
async def get_event_counts(
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date: str = Query(..., description="End date YYYY-MM-DD"),
    user: dict = Depends(get_current_user)
):
    """
    Get event counts per day for sidebar mini calendar
    Optimized for fast loading - returns only counts, not full events
    
    Returns:
    {
      "2026-01-15": 5,
      "2026-01-16": 3,
      "2026-01-17": 0,
      ...
    }
    """
    from collections import defaultdict
    from services.recurrence import generate_recurring_instances
    from services.permissions import filter_events_by_permissions
    
    # Parse dates
    start_dt = datetime.fromisoformat(start_date + "T00:00:00")
    end_dt = datetime.fromisoformat(end_date + "T23:59:59")
    
    # Get all events in range (lightweight query - only needed fields)
    query = {
        "$or": [
            {"start_time": {"$gte": start_dt.isoformat(), "$lte": end_dt.isoformat()}},
            {"end_time": {"$gte": start_dt.isoformat(), "$lte": end_dt.isoformat()}}
        ]
    }
    
    events = await db.events.find(
        query,
        {"_id": 0, "id": 1, "start_time": 1, "end_time": 1, "created_by": 1, "calendar_id": 1, "recurrence_type": 1}
    ).to_list(10000)
    
    # Filter by permissions (lightweight)
    filtered_events = await filter_events_by_permissions(events, user["id"], db)
    
    # Count events per day
    counts = defaultdict(int)
    
    for event in filtered_events:
        # Get event date
        start_time_str = event.get("start_time", "")
        if start_time_str:
            try:
                event_dt = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
                event_date = event_dt.strftime("%Y-%m-%d")
                counts[event_date] += 1
            except:
                continue
    
    # Handle recurring events (generate instances and count)
    all_recurring = await db.events.find(
        {"recurrence_type": {"$nin": ["none", None, ""]}},
        {"_id": 0}
    ).to_list(1000)
    
    if all_recurring:
        # Load exceptions
        recurring_event_ids = [e["id"] for e in all_recurring]
        exceptions_list = await db.recurring_exceptions.find(
            {"parent_event_id": {"$in": recurring_event_ids}},
            {"_id": 0}
        ).to_list(1000)
        
        # Group exceptions by parent
        exceptions_by_parent = {}
        for exc in exceptions_list:
            parent_id = exc["parent_event_id"]
            if parent_id not in exceptions_by_parent:
                exceptions_by_parent[parent_id] = []
            exceptions_by_parent[parent_id].append(exc)
        
        # Generate instances for recurring events
        for rec_event in all_recurring:
            event_exceptions = exceptions_by_parent.get(rec_event["id"], [])
            instances = generate_recurring_instances(rec_event, start_dt, end_dt, event_exceptions)
            
            # Filter instances by permissions
            filtered_instances = await filter_events_by_permissions(instances, user["id"], db)
            
            for instance in filtered_instances:
                start_time_str = instance.get("start_time", "")
                if start_time_str:
                    try:
                        event_dt = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
                        event_date = event_dt.strftime("%Y-%m-%d")
                        counts[event_date] += 1
                    except:
                        continue
    
    # Fill in missing dates with 0
    current_date = start_dt
    while current_date <= end_dt:
        date_str = current_date.strftime("%Y-%m-%d")
        if date_str not in counts:
            counts[date_str] = 0
        current_date += timedelta(days=1)
    
    return dict(counts)
