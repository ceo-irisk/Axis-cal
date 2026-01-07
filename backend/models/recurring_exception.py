from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class ExceptionAction(str, Enum):
    CANCEL = "cancel"           # Отменить этот экземпляр
    RESCHEDULE = "reschedule"   # Перенести на другое время
    MODIFY = "modify"           # Изменить детали (title, description, etc)

class RecurringExceptionBase(BaseModel):
    parent_event_id: str  # ID родительского повторяющегося события
    exception_date: str   # Дата исключения в формате YYYY-MM-DD
    action: ExceptionAction
    
    # Для action = "reschedule"
    new_start_time: Optional[datetime] = None
    new_end_time: Optional[datetime] = None
    
    # Для action = "modify"
    modified_fields: Optional[Dict[str, Any]] = None  # {"title": "Новое название", ...}
    
    # Причина/заметка
    note: Optional[str] = None

class RecurringExceptionCreate(RecurringExceptionBase):
    pass

class RecurringException(RecurringExceptionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
