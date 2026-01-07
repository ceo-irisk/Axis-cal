from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List
from datetime import datetime, timezone
from models.recurring_exception import RecurringException, RecurringExceptionCreate, ExceptionAction
from dependencies import get_current_user
import uuid
import logging

router = APIRouter(prefix="/recurring-exceptions", tags=["recurring-exceptions"])
logger = logging.getLogger(__name__)

db = None

def init_db(database):
    global db
    db = database

@router.post("")
async def create_exception(
    exception_data: RecurringExceptionCreate,
    user: dict = Depends(get_current_user)
):
    """
    Create an exception for a recurring event
    
    Actions:
    - cancel: Skip this instance
    - reschedule: Move to different time
    - modify: Change title/description/etc
    """
    # Verify parent event exists and user has permission
    parent_event = await db.events.find_one({"id": exception_data.parent_event_id})
    if not parent_event:
        raise HTTPException(status_code=404, detail="Parent event not found")
    
    # Check if user owns the event or has edit permissions
    if parent_event["created_by"] != user["id"]:
        calendar_id = parent_event.get("calendar_id")
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
    
    # Validate action-specific fields
    if exception_data.action == ExceptionAction.RESCHEDULE:
        if not exception_data.new_start_time or not exception_data.new_end_time:
            raise HTTPException(
                status_code=400,
                detail="new_start_time and new_end_time required for reschedule action"
            )
    
    if exception_data.action == ExceptionAction.MODIFY:
        if not exception_data.modified_fields:
            raise HTTPException(
                status_code=400,
                detail="modified_fields required for modify action"
            )
    
    # Check if exception already exists for this date
    existing = await db.recurring_exceptions.find_one({
        "parent_event_id": exception_data.parent_event_id,
        "exception_date": exception_data.exception_date
    })
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Exception already exists for this date. Update or delete it first."
        )
    
    # Create exception
    exception_dict = exception_data.model_dump()
    exception_dict["id"] = str(uuid.uuid4())
    exception_dict["created_by"] = user["id"]
    exception_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    exception_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Convert datetime objects to ISO strings
    if isinstance(exception_dict.get("new_start_time"), datetime):
        exception_dict["new_start_time"] = exception_dict["new_start_time"].isoformat()
    if isinstance(exception_dict.get("new_end_time"), datetime):
        exception_dict["new_end_time"] = exception_dict["new_end_time"].isoformat()
    
    await db.recurring_exceptions.insert_one(exception_dict)
    
    # Fetch clean data
    created_exception = await db.recurring_exceptions.find_one(
        {"id": exception_dict["id"]},
        {"_id": 0}
    )
    
    logger.info(f"Created exception for event {exception_data.parent_event_id} on {exception_data.exception_date}")
    return created_exception

@router.get("")
async def get_exceptions(
    parent_event_id: str = None,
    user: dict = Depends(get_current_user)
):
    """Get all exceptions, optionally filtered by parent event"""
    query = {}
    if parent_event_id:
        query["parent_event_id"] = parent_event_id
    
    exceptions = await db.recurring_exceptions.find(query, {"_id": 0}).to_list(1000)
    
    # Filter by permission (only show exceptions for events user can see)
    if not parent_event_id:
        # Get all parent event IDs
        parent_ids = list(set([e["parent_event_id"] for e in exceptions]))
        
        # Check permissions for each parent
        allowed_parent_ids = set()
        for pid in parent_ids:
            parent = await db.events.find_one({"id": pid})
            if parent:
                if parent["created_by"] == user["id"]:
                    allowed_parent_ids.add(pid)
                else:
                    # Check calendar permissions
                    calendar_id = parent.get("calendar_id")
                    if calendar_id:
                        permission = await db.calendar_permissions.find_one({
                            "calendar_id": calendar_id,
                            "user_id": user["id"]
                        })
                        if permission:
                            allowed_parent_ids.add(pid)
        
        # Filter exceptions
        exceptions = [e for e in exceptions if e["parent_event_id"] in allowed_parent_ids]
    
    return exceptions

@router.get("/{exception_id}")
async def get_exception(exception_id: str, user: dict = Depends(get_current_user)):
    """Get single exception by ID"""
    exception = await db.recurring_exceptions.find_one({"id": exception_id}, {"_id": 0})
    if not exception:
        raise HTTPException(status_code=404, detail="Exception not found")
    
    # Check permissions
    parent_event = await db.events.find_one({"id": exception["parent_event_id"]})
    if parent_event and parent_event["created_by"] != user["id"]:
        calendar_id = parent_event.get("calendar_id")
        if calendar_id:
            permission = await db.calendar_permissions.find_one({
                "calendar_id": calendar_id,
                "user_id": user["id"]
            })
            if not permission:
                raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    return exception

@router.put("/{exception_id}")
async def update_exception(
    exception_id: str,
    exception_data: RecurringExceptionCreate,
    user: dict = Depends(get_current_user)
):
    """Update an exception"""
    exception = await db.recurring_exceptions.find_one({"id": exception_id})
    if not exception:
        raise HTTPException(status_code=404, detail="Exception not found")
    
    # Check permissions
    parent_event = await db.events.find_one({"id": exception["parent_event_id"]})
    if parent_event and parent_event["created_by"] != user["id"]:
        calendar_id = parent_event.get("calendar_id")
        if calendar_id:
            permission = await db.calendar_permissions.find_one({
                "calendar_id": calendar_id,
                "user_id": user["id"],
                "permission_level": {"$in": ["edit", "full"]}
            })
            if not permission:
                raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    # Update
    update_dict = exception_data.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Convert datetime objects
    if isinstance(update_dict.get("new_start_time"), datetime):
        update_dict["new_start_time"] = update_dict["new_start_time"].isoformat()
    if isinstance(update_dict.get("new_end_time"), datetime):
        update_dict["new_end_time"] = update_dict["new_end_time"].isoformat()
    
    await db.recurring_exceptions.update_one({"id": exception_id}, {"$set": update_dict})
    
    updated = await db.recurring_exceptions.find_one({"id": exception_id}, {"_id": 0})
    return updated

@router.delete("/{exception_id}")
async def delete_exception(exception_id: str, user: dict = Depends(get_current_user)):
    """Delete an exception (restore normal instance)"""
    exception = await db.recurring_exceptions.find_one({"id": exception_id})
    if not exception:
        raise HTTPException(status_code=404, detail="Exception not found")
    
    # Check permissions
    parent_event = await db.events.find_one({"id": exception["parent_event_id"]})
    if parent_event and parent_event["created_by"] != user["id"]:
        calendar_id = parent_event.get("calendar_id")
        if calendar_id:
            permission = await db.calendar_permissions.find_one({
                "calendar_id": calendar_id,
                "user_id": user["id"],
                "permission_level": {"$in": ["edit", "full"]}
            })
            if not permission:
                raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    await db.recurring_exceptions.delete_one({"id": exception_id})
    return {"message": "Exception deleted"}
