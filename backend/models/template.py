from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any
from datetime import datetime, timezone
import uuid

class TemplateBase(BaseModel):
    name: str
    template_type: str  # day, week
    events: List[Dict[str, Any]] = []  # relative times and event templates
    is_active: bool = True

class Template(TemplateBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
