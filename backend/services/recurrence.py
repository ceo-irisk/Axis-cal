from typing import List, Optional
from datetime import datetime, timedelta, timezone

def generate_recurring_instances(
    event: dict, 
    start_date: datetime, 
    end_date: datetime,
    exceptions: Optional[List[dict]] = None
) -> List[dict]:
    """
    Generate instances of a recurring event within a date range
    
    Args:
        event: Parent recurring event
        start_date: Start of date range
        end_date: End of date range
        exceptions: List of exceptions for this event (cancel/reschedule/modify)
    
    Returns:
        List of event instances (excluding cancelled, including rescheduled/modified)
    """
    instances = []
    recurrence_type = event.get("recurrence_type", "none")
    
    if recurrence_type == "none":
        return instances
    
    # Build exception maps for quick lookup
    exceptions = exceptions or []
    cancelled_dates = set()
    rescheduled_dates = {}
    modified_dates = {}
    
    for exc in exceptions:
        exc_date = exc.get("exception_date")
        action = exc.get("action")
        
        if action == "cancel":
            cancelled_dates.add(exc_date)
        elif action == "reschedule":
            rescheduled_dates[exc_date] = {
                "new_start_time": exc.get("new_start_time"),
                "new_end_time": exc.get("new_end_time"),
                "exception_id": exc.get("id")
            }
        elif action == "modify":
            modified_dates[exc_date] = {
                "modified_fields": exc.get("modified_fields", {}),
                "exception_id": exc.get("id")
            }
    
    # Parse event times - handle both string and datetime objects
    start_time = event["start_time"]
    end_time = event["end_time"]
    event_timezone = event.get("timezone")
    
    if isinstance(start_time, datetime):
        event_start = start_time.replace(tzinfo=None) if start_time.tzinfo else start_time
        event_end = end_time.replace(tzinfo=None) if end_time.tzinfo else end_time
    else:
        event_start_str = str(start_time)
        event_end_str = str(end_time)
        
        # Parse datetime
        if "+" in event_start_str or event_start_str.endswith("Z"):
            # Has timezone - parse it
            event_start_utc = datetime.fromisoformat(event_start_str.replace("Z", "+00:00"))
            event_end_utc = datetime.fromisoformat(event_end_str.replace("Z", "+00:00"))
            
            # CRITICAL: Convert from UTC to local time if event has timezone
            # Event stored as UTC but should repeat at LOCAL time
            # For now, just strip timezone to get the UTC time as naive
            # The actual time conversion happens on frontend display
            event_start = event_start_utc.replace(tzinfo=None)
            event_end = event_end_utc.replace(tzinfo=None)
        else:
            # No timezone - already local time
            event_start = datetime.fromisoformat(event_start_str)
            event_end = datetime.fromisoformat(event_end_str)
    
    duration = event_end - event_start
    
    # Convert start_date and end_date to naive for comparison
    if start_date.tzinfo is not None:
        start_date = start_date.replace(tzinfo=None)
    if end_date.tzinfo is not None:
        end_date = end_date.replace(tzinfo=None)
    
    recurrence_end = None
    if event.get("recurrence_end_date"):
        rec_end = event["recurrence_end_date"]
        if isinstance(rec_end, datetime):
            recurrence_end = rec_end.replace(tzinfo=None) if rec_end.tzinfo else rec_end
        else:
            rec_end_str = str(rec_end).replace("Z", "+00:00")
            if "+" in rec_end_str:
                recurrence_end = datetime.fromisoformat(rec_end_str).replace(tzinfo=None)
            else:
                recurrence_end = datetime.fromisoformat(rec_end_str)
    
    current_date = event_start
    instance_count = 0
    max_instances = 365  # Safety limit
    
    while current_date <= end_date and instance_count < max_instances:
        # Skip if before start_date or original event date
        if current_date >= start_date and current_date > event_start:
            # Check recurrence end date
            if recurrence_end and current_date > recurrence_end:
                break
            
            # Get date string for exception checking
            instance_date_str = current_date.strftime("%Y-%m-%d")
            
            # Skip cancelled instances
            if instance_date_str in cancelled_dates:
                instance_count += 1
                # Move to next occurrence
                current_date = get_next_occurrence(current_date, recurrence_type, event)
                continue
            
            # Handle rescheduled instances
            if instance_date_str in rescheduled_dates:
                reschedule_info = rescheduled_dates[instance_date_str]
                new_start = reschedule_info["new_start_time"]
                new_end = reschedule_info["new_end_time"]
                
                # Parse if strings
                if isinstance(new_start, str):
                    new_start = datetime.fromisoformat(new_start.replace("Z", "+00:00")).replace(tzinfo=None)
                if isinstance(new_end, str):
                    new_end = datetime.fromisoformat(new_end.replace("Z", "+00:00")).replace(tzinfo=None)
                
                instance = {
                    **event,
                    "id": f"{event['id']}-{instance_count}",
                    "start_time": new_start.isoformat() if isinstance(new_start, datetime) else new_start,
                    "end_time": new_end.isoformat() if isinstance(new_end, datetime) else new_end,
                    "recurrence_parent_id": event["id"],
                    "is_recurring_instance": True,
                    "is_rescheduled": True,
                    "exception_id": reschedule_info["exception_id"]
                }
                instances.append(instance)
            # Handle modified instances
            elif instance_date_str in modified_dates:
                modify_info = modified_dates[instance_date_str]
                modified_fields = modify_info["modified_fields"]
                
                instance = {
                    **event,
                    **modified_fields,  # Apply modifications
                    "id": f"{event['id']}-{instance_count}",
                    "start_time": current_date.isoformat(),
                    "end_time": (current_date + duration).isoformat(),
                    "recurrence_parent_id": event["id"],
                    "is_recurring_instance": True,
                    "is_modified": True,
                    "exception_id": modify_info["exception_id"]
                }
                instances.append(instance)
            # Normal instance (no exception)
            else:
                instance = {
                    **event,
                    "id": f"{event['id']}-{instance_count}",
                    "start_time": current_date.isoformat(),
                    "end_time": (current_date + duration).isoformat(),
                    "recurrence_parent_id": event["id"],
                    "is_recurring_instance": True
                }
                instances.append(instance)
        
        # Move to next occurrence
        current_date = get_next_occurrence(current_date, recurrence_type, event)
        instance_count += 1
    
    return instances

def get_next_occurrence(current_date: datetime, recurrence_type: str, event: dict) -> datetime:
    """Calculate next occurrence date based on recurrence type"""
    
    if recurrence_type == "daily":
        return current_date + timedelta(days=1)
    
    elif recurrence_type == "workdays":
        next_date = current_date + timedelta(days=1)
        # Skip weekends (Saturday=5, Sunday=6)
        while next_date.weekday() >= 5:
            next_date = next_date + timedelta(days=1)
        return next_date
    
    elif recurrence_type == "weekly":
        return current_date + timedelta(weeks=1)
    
    elif recurrence_type == "monthly":
        # Add approximately one month
        month = current_date.month
        year = current_date.year
        if month == 12:
            month = 1
            year += 1
        else:
            month += 1
        try:
            return current_date.replace(year=year, month=month)
        except ValueError:
            # Handle months with fewer days
            return current_date.replace(year=year, month=month, day=28)
    
    elif recurrence_type == "yearly":
        try:
            return current_date.replace(year=current_date.year + 1)
        except ValueError:
            # Handle Feb 29 in non-leap years
            return current_date.replace(year=current_date.year + 1, day=28)
    
    elif recurrence_type == "custom_days":
        # Custom weekdays recurrence
        custom_days = event.get("recurrence_custom_days", [])
        if not custom_days:
            return current_date + timedelta(days=1)
        
        # Map day names to weekday numbers (Monday=0, Sunday=6)
        day_map = {
            'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6
        }
        target_weekdays = [day_map.get(day.lower()) for day in custom_days if day.lower() in day_map]
        
        if not target_weekdays:
            return current_date + timedelta(days=1)
        
        # Find next occurrence on one of the selected weekdays
        next_date = current_date + timedelta(days=1)
        max_attempts = 7  # Safety check
        attempts = 0
        while next_date.weekday() not in target_weekdays and attempts < max_attempts:
            next_date = next_date + timedelta(days=1)
            attempts += 1
        return next_date
    
    else:
        return current_date + timedelta(days=1)
