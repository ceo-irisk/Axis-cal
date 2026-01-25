from typing import List

async def filter_events_by_permissions(events: List[dict], user_id: str, db) -> List[dict]:
    """Filter events based ONLY on calendar permissions (subscriptions removed)"""
    
    # Get calendars where user has explicit permissions
    permissions = await db.calendar_permissions.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    permitted_calendar_ids = {p["calendar_id"]: p["permission_level"] for p in permissions}
    
    # Get user's own calendars (to check for public calendars)
    user_calendars = await db.calendars.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    user_calendar_ids = {c["id"] for c in user_calendars}
    
    # Batch load all calendars for events (optimize N+1 queries)
    calendar_ids = {e["calendar_id"] for e in events if e.get("calendar_id")}
    calendars_list = await db.calendars.find(
        {"id": {"$in": list(calendar_ids)}},
        {"_id": 0}
    ).to_list(1000)
    calendar_map = {c["id"]: c for c in calendars_list}
    
    filtered_events = []
    
    for event in events:
        event_owner = event.get("created_by")
        calendar_id = event.get("calendar_id")
        
        # 1. User's own events - always show
        if event_owner == user_id:
            filtered_events.append(event)
            continue
        
        # 2. No calendar - hide from others (security)
        if not calendar_id:
            continue
        
        # 3. Event in user's own calendar - always show (even if created by others)
        if calendar_id in user_calendar_ids:
            filtered_events.append(event)
            continue
        
        # 4. Has explicit permission to calendar
        if calendar_id in permitted_calendar_ids:
            permission_level = permitted_calendar_ids[calendar_id]
            
            # view_busy permission - show as "Занято"
            if permission_level == 'view_busy':
                busy_event = {
                    "id": event["id"],
                    "title": "Занято",
                    "start_time": event["start_time"],
                    "end_time": event["end_time"],
                    "event_type": "meeting",
                    "status": "confirmed",
                    "is_busy": True,
                    "is_all_day": event.get("is_all_day", False),
                    "calendar_id": calendar_id,
                    "description": "",
                    "location": "",
                    "attendees": [],
                    "is_blocked": False,
                    "is_completed": False,
                    "is_urgent": False,
                    "is_video_call": False,
                }
                filtered_events.append(busy_event)
            else:
                # view, edit, full - show full event
                filtered_events.append(event)
            continue
        
        # 5. No permissions - hide completely
    
    return filtered_events
