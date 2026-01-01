from typing import List

async def filter_events_by_permissions(events: List[dict], user_id: str, db) -> List[dict]:
    """Filter events based on calendar permissions and replace private events with 'Занято'"""
    # Get user's own calendars
    user_calendars = await db.calendars.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    user_calendar_ids = {c["id"] for c in user_calendars}
    
    # Get calendars where user has permissions
    permissions = await db.calendar_permissions.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    permitted_calendar_ids = {p["calendar_id"]: p["permission_level"] for p in permissions}
    
    filtered_events = []
    
    for event in events:
        calendar_id = event.get("calendar_id")
        event_owner = event.get("created_by")
        
        # User's own events - always show
        if event_owner == user_id:
            filtered_events.append(event)
            continue
        
        # No calendar specified - show (legacy events)
        if not calendar_id:
            filtered_events.append(event)
            continue
        
        # Check if user has permission to this calendar
        if calendar_id in permitted_calendar_ids:
            filtered_events.append(event)
            continue
        
        # Get the calendar info
        event_calendar = await db.calendars.find_one({"id": calendar_id})
        if not event_calendar:
            # Calendar not found - skip event
            continue
        
        # If calendar is private (is_public=False) and not user's - show as "Занято"
        if not event_calendar.get("is_public", True) and event_calendar.get("user_id") != user_id:
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
            # Public calendar - show event
            filtered_events.append(event)
    
    return filtered_events
