from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from datetime import datetime, timezone
from models.other import ICSSubscription
from dependencies import get_current_user
import uuid
import httpx
from ics import Calendar as ICSCalendar
import logging

router = APIRouter(prefix="/ics-subscriptions", tags=["ics-subscriptions"])
logger = logging.getLogger(__name__)

db = None

def init_db(database):
    global db
    db = database

@router.get("")
async def get_ics_subscriptions(user: dict = Depends(get_current_user)):
    subscriptions = await db.ics_subscriptions.find({"user_id": user["id"], "is_active": True}, {"_id": 0}).to_list(100)
    return subscriptions

@router.post("")
async def create_ics_subscription(subscription_data: dict = Body(...), user: dict = Depends(get_current_user)):
    url = subscription_data.get("url")
    name = subscription_data.get("name")
    color = subscription_data.get("color", "#6366f1")
    
    # Validate URL by trying to fetch it
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            ics_content = response.text
            # Try to parse to validate
            cal = ICSCalendar(ics_content)
    except Exception as e:
        logger.error(f"Failed to fetch/parse ICS from {url}: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid ICS URL: {str(e)}")
    
    subscription_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "url": url,
        "name": name,
        "color": color,
        "is_active": True,
        "last_synced": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ics_subscriptions.insert_one(subscription_dict)
    subscription_dict.pop('_id', None)  # Remove MongoDB ObjectId for JSON serialization
    return subscription_dict

@router.put("/{subscription_id}")
async def update_ics_subscription(
    subscription_id: str,
    subscription_data: dict = Body(...),
    user: dict = Depends(get_current_user)
):
    subscription = await db.ics_subscriptions.find_one({"id": subscription_id})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    if subscription["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot update subscriptions owned by other users")
    
    await db.ics_subscriptions.update_one({"id": subscription_id}, {"$set": subscription_data})
    updated = await db.ics_subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    return updated

@router.delete("/{subscription_id}")
async def delete_ics_subscription(subscription_id: str, user: dict = Depends(get_current_user)):
    subscription = await db.ics_subscriptions.find_one({"id": subscription_id})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    if subscription["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot delete subscriptions owned by other users")
    
    await db.ics_subscriptions.delete_one({"id": subscription_id})
    return {"message": "Subscription deleted"}

@router.get("/{subscription_id}/events")
async def get_ics_subscription_events(subscription_id: str, user: dict = Depends(get_current_user)):
    subscription = await db.ics_subscriptions.find_one({"id": subscription_id})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    if subscription["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot access subscriptions owned by other users")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(subscription["url"])
            response.raise_for_status()
            ics_content = response.text
        
        cal = ICSCalendar(ics_content)
        events = []
        
        for ics_event in cal.events:
            event_dict = {
                "id": f"ics-{subscription_id}-{hash(ics_event.uid)}",
                "title": str(ics_event.name) if ics_event.name else "Untitled",
                "description": str(ics_event.description) if ics_event.description else "",
                "start_time": ics_event.begin.datetime.isoformat() if ics_event.begin else "",
                "end_time": ics_event.end.datetime.isoformat() if ics_event.end else "",
                "location": str(ics_event.location) if ics_event.location else "",
                "event_type": "meeting",
                "status": "confirmed",
                "color": subscription.get("color", "#6366f1"),
                "is_ics_event": True,
                "subscription_id": subscription_id,
                "subscription_name": subscription.get("name", "ICS Calendar")
            }
            events.append(event_dict)
        
        # Update last_synced
        await db.ics_subscriptions.update_one(
            {"id": subscription_id},
            {"$set": {"last_synced": datetime.now(timezone.utc).isoformat()}}
        )
        
        return events
    except Exception as e:
        logger.error(f"Failed to fetch ICS events from {subscription['url']}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch events: {str(e)}")

@router.get("/all-events")
async def get_all_ics_events(user: dict = Depends(get_current_user)):
    subscriptions = await db.ics_subscriptions.find(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    all_events = []
    
    for subscription in subscriptions:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(subscription["url"])
                response.raise_for_status()
                ics_content = response.text
            
            cal = ICSCalendar(ics_content)
            
            for ics_event in cal.events:
                event_dict = {
                    "id": f"ics-{subscription['id']}-{hash(ics_event.uid)}",
                    "title": str(ics_event.name) if ics_event.name else "Untitled",
                    "description": str(ics_event.description) if ics_event.description else "",
                    "start_time": ics_event.begin.datetime.isoformat() if ics_event.begin else "",
                    "end_time": ics_event.end.datetime.isoformat() if ics_event.end else "",
                    "location": str(ics_event.location) if ics_event.location else "",
                    "event_type": "meeting",
                    "status": "confirmed",
                    "color": subscription.get("color", "#6366f1"),
                    "is_ics_event": True,
                    "subscription_id": subscription["id"],
                    "subscription_name": subscription.get("name", "ICS Calendar")
                }
                all_events.append(event_dict)
            
            # Update last_synced
            await db.ics_subscriptions.update_one(
                {"id": subscription["id"]},
                {"$set": {"last_synced": datetime.now(timezone.utc).isoformat()}}
            )
        except Exception as e:
            logger.error(f"Failed to fetch ICS events from {subscription['url']}: {str(e)}")
            # Continue with other subscriptions
            continue
    
    return all_events
