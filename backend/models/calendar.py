from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

class CalendarConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    provider: str  # google, yandex, apple, bitrix24, custom
    color: str
    icon: str = "calendar"  # Icon name from lucide-react
    is_default: bool = False  # True for "Открытый" and "Закрытый"
    is_public: bool = True  # False for "Закрытый" calendar
    pattern: Optional[str] = None
    is_active: bool = True
    sync_enabled: bool = True
    credentials: Dict[str, Any] = {}
    last_synced: Optional[datetime] = None

class CalendarPermission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    calendar_id: str
    user_id: str  # User who has access
    permission_level: str  # "read", "edit", "full"
    granted_by: str  # User who granted access
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSubscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Who is subscribing
    target_user_id: str  # Who they're subscribing to
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
