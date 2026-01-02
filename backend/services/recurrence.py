from typing import List
from datetime import datetime, timedelta, timezone

def generate_recurring_instances(event: dict, start_date: datetime, end_date: datetime) -> List[dict]:
    """Generate instances of a recurring event within a date range"""
    instances = []
    recurrence_type = event.get("recurrence_type", "none")
    
    if recurrence_type == "none":
        return instances
    
    # Parse event times - handle both string and datetime objects
    start_time = event["start_time"]
    end_time = event["end_time"]
    
    if isinstance(start_time, datetime):
        event_start = start_time.replace(tzinfo=None) if start_time.tzinfo else start_time
        event_end = end_time.replace(tzinfo=None) if end_time.tzinfo else end_time
    else:
        event_start_str = str(start_time).replace("Z", "+00:00")
        event_end_str = str(end_time).replace("Z", "+00:00")
        
        if "+" in event_start_str or event_start_str.endswith("Z"):
            event_start = datetime.fromisoformat(event_start_str).replace(tzinfo=None)
            event_end = datetime.fromisoformat(event_end_str).replace(tzinfo=None)
        else:
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
        recurrence_end_str = event["recurrence_end_date"].replace("Z", "+00:00")
        if "+" in recurrence_end_str or recurrence_end_str.endswith("Z"):
            recurrence_end = datetime.fromisoformat(recurrence_end_str).replace(tzinfo=None)
        else:
            recurrence_end = datetime.fromisoformat(recurrence_end_str)
    
    current_date = event_start
    instance_count = 0
    max_instances = 365  # Safety limit
    
    while current_date <= end_date and instance_count < max_instances:
        # Skip if before start_date or original event date
        if current_date >= start_date and current_date > event_start:
            # Check recurrence end date
            if recurrence_end and current_date > recurrence_end:
                break
            
            instance = {
                **event,
                "id": f"{event['id']}-{instance_count}",
                "start_time": current_date.isoformat(),
                "end_time": (current_date + duration).isoformat(),
                "recurrence_parent_id": event["id"],
                "is_recurring_instance": True
            }
            instances.append(instance)
        
        # Calculate next occurrence
        if recurrence_type == "daily":
            current_date = current_date + timedelta(days=1)
        elif recurrence_type == "workdays":
            current_date = current_date + timedelta(days=1)
            # Skip weekends (Saturday=5, Sunday=6)
            while current_date.weekday() >= 5:
                current_date = current_date + timedelta(days=1)
        elif recurrence_type == "weekly":
            current_date = current_date + timedelta(weeks=1)
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
                current_date = current_date.replace(year=year, month=month)
            except ValueError:
                # Handle months with fewer days
                current_date = current_date.replace(year=year, month=month, day=28)
        elif recurrence_type == "yearly":
            try:
                current_date = current_date.replace(year=current_date.year + 1)
            except ValueError:
                # Handle Feb 29 in non-leap years
                current_date = current_date.replace(year=current_date.year + 1, day=28)
        elif recurrence_type == "custom_days":
            # Custom weekdays recurrence
            custom_days = event.get("recurrence_custom_days", [])
            if not custom_days:
                break
            
            # Map day names to weekday numbers (Monday=0, Sunday=6)
            day_map = {
                'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
                'friday': 4, 'saturday': 5, 'sunday': 6
            }
            target_weekdays = [day_map.get(day.lower()) for day in custom_days if day.lower() in day_map]
            
            if not target_weekdays:
                break
            
            # Find next occurrence on one of the selected weekdays
            current_date = current_date + timedelta(days=1)
            while current_date.weekday() not in target_weekdays:
                current_date = current_date + timedelta(days=1)
                # Safety check to avoid infinite loop
                if current_date > end_date + timedelta(days=7):
                    break
        else:
            break
        
        instance_count += 1
    
    return instances
