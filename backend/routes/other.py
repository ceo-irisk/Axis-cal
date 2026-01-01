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
    rule_dict.pop('_id', None)  # Remove MongoDB ObjectId for JSON serialization
    return rule_dict

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

# Recurring Events
@recurring_router.get("")
async def get_recurring_events(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    from services.recurrence import generate_recurring_instances
    from services.permissions import filter_events_by_permissions
    
    # Get all events with recurrence
    recurring_events = await db.events.find(
        {"recurrence_type": {"$nin": ["none", None, ""]}},
        {"_id": 0}
    ).to_list(1000)
    
    # Get regular events in the date range
    query = {}
    if start_date and end_date:
        query["$or"] = [
            {"start_time": {"$gte": start_date, "$lte": end_date}},
            {"end_time": {"$gte": start_date, "$lte": end_date}}
        ]
    
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    
    # Parse dates
    if start_date:
        start_dt = datetime.fromisoformat(start_date)
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=timezone.utc)
    else:
        start_dt = datetime.now(timezone.utc) - timedelta(days=30)
    
    if end_date:
        end_dt = datetime.fromisoformat(end_date)
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=timezone.utc)
    else:
        end_dt = datetime.now(timezone.utc) + timedelta(days=30)
    
    # Start with all regular events
    result_events = list(events)
    processed_parent_ids = set()
    
    # Add recurring instances
    all_recurring = [e for e in events if e.get("recurrence_type") and e.get("recurrence_type") not in ["none", None, ""]]
    all_recurring.extend(recurring_events)
    
    for event in all_recurring:
        event_id = event.get("id")
        if event_id in processed_parent_ids:
            continue
        
        instances = generate_recurring_instances(event, start_dt, end_dt)
        result_events.extend(instances)
        processed_parent_ids.add(event_id)
    
    # Filter by permissions
    filtered_events = await filter_events_by_permissions(result_events, user["id"], db)
    
    return filtered_events

# User Events (for viewing other user's events)
@user_events_router.get("/{user_id}/events")
async def get_user_events(
    user_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    from services.permissions import filter_events_by_permissions
    
    # Check if current user is subscribed to target user
    subscription = await db.user_subscriptions.find_one({
        "user_id": user["id"],
        "target_user_id": user_id
    })
    
    if not subscription and user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Not subscribed to this user")
    
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
    
    user_events = [
        e for e in filtered_events
        if e.get("calendar_id") in target_calendar_ids or e.get("created_by") == user_id
    ]
    
    return user_events
