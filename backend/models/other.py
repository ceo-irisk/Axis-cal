from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid

class DayRule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    rule_type: str  # max_meetings, min_break, max_hours
    value: int
    is_active: bool = True

class EventFieldConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fields: List[dict] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventTypeConfig(BaseModel):
    id: str
    name: str
    label: str
    color: str
    order: int = 0
    is_active: bool = True

class EventStatusConfig(BaseModel):
    id: str
    name: str
    label: str
    color: str
    order: int = 0
    is_active: bool = True

class EventTypeReorderRequest(BaseModel):
    type_ids: List[str]

class ICSSubscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    url: str
    name: str
    color: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
