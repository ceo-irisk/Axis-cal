from typing import List

async def filter_events_by_permissions(events: List[dict], user_id: str, db) -> List[dict]:
    """Filter events based on subscriptions and calendar permissions"""
    
    # Get user's subscriptions (who user is subscribed to)
    subscriptions = await db.user_subscriptions.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    subscribed_user_ids = {s["target_user_id"] for s in subscriptions}
    
    # Get calendars where user has explicit permissions
    permissions = await db.calendar_permissions.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    permitted_calendar_ids = {p["calendar_id"]: p["permission_level"] for p in permissions}
    
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
        
        # 3. Has explicit permission to calendar
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
                # read, edit, full - show full event
                filtered_events.append(event)
            continue
        
        # 4. Check calendar and subscription
        event_calendar = calendar_map.get(calendar_id)
        if not event_calendar:
            continue
        
        calendar_owner = event_calendar.get("user_id")
        is_public = event_calendar.get("is_public", True)
        
        # 5. Subscribed to calendar owner?
        if calendar_owner in subscribed_user_ids:
            if is_public:
                # Public calendar of subscribed user - show full event
                filtered_events.append(event)
            else:
                # Private calendar of subscribed user - show as "Занято"
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
        # else: not subscribed and no permissions - hide completely
    
    return filtered_events
