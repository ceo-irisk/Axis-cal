from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class EventStatus(str, Enum):
    CONFIRMED = "confirmed"       # Согласовано
    TENTATIVE = "tentative"       # Не согласовано
    TEMPLATE = "template"         # Шаблон

class RecurrenceType(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WORKDAYS = "workdays"  # Mon-Fri
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM_DAYS = "custom_days"  # Custom weekdays

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    event_type: str = "meeting"
    status: EventStatus = EventStatus.CONFIRMED
    color: Optional[str] = None
    location: Optional[str] = None
    attendees: List[str] = []
    calendar_id: Optional[str] = None
    custom_fields: Dict[str, Any] = {}
    external_calendar_id: Optional[str] = None
    external_event_id: Optional[str] = None
    
    # Флаги (только необходимые)
    is_all_day: bool = False
    is_urgent: bool = False
    is_blocked: bool = False
    is_completed: bool = False
    is_video_call: bool = False
    
    # Recurrence fields
    recurrence_type: RecurrenceType = RecurrenceType.NONE
    recurrence_end_date: Optional[datetime] = None
    recurrence_parent_id: Optional[str] = None
    recurrence_custom_days: Optional[List[str]] = None

class EventCreate(EventBase):
    pass

class Event(EventBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
