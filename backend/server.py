from fastapi import FastAPI, APIRouter, HTTPException, Depends, status as http_status, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum
import httpx
from ics import Calendar as ICSCalendar

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'executive_calendar_secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()

# Create the main app
app = FastAPI(title="Executive Calendar API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class EventStatus(str, Enum):
    CONFIRMED = "confirmed"
    TENTATIVE = "tentative"
    CANCELLED = "cancelled"

class EventType(str, Enum):
    MEETING = "meeting"
    CALL = "call"
    PERSONAL = "personal"
    URGENT = "urgent"
    TRAVEL = "travel"
    DEEP_WORK = "deep_work"

# ==================== MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole
    timezone: str = "Europe/Moscow"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    timezone: str
    is_active: bool

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class CustomField(BaseModel):
    name: str
    field_type: str = "text"  # text, number, select, checkbox
    required: bool = False
    options: Optional[List[str]] = None

# Recurrence types
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
    pattern: Optional[str] = None  # for tentative events
    location: Optional[str] = None
    attendees: List[str] = []
    calendar_id: Optional[str] = None  # User's calendar
    custom_fields: Dict[str, Any] = {}
    external_calendar_id: Optional[str] = None
    external_event_id: Optional[str] = None
    # New fields for enhanced UI
    is_all_day: bool = False
    is_unconfirmed: bool = False
    is_template_event: bool = False
    is_blocked: bool = False
    is_completed: bool = False
    is_urgent: bool = False
    is_video_call: bool = False
    # Recurrence fields
    recurrence_type: RecurrenceType = RecurrenceType.NONE
    recurrence_end_date: Optional[datetime] = None
    recurrence_parent_id: Optional[str] = None  # For generated instances
    recurrence_custom_days: Optional[List[str]] = None  # For custom_days recurrence: ['monday', 'wednesday', 'friday']

class EventCreate(EventBase):
    pass

class Event(EventBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

class DayRating(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD format
    rating: int = Field(ge=1, le=5)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SurveyQuestion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    question_type: str = "text"  # text, scale, choice
    options: Optional[List[str]] = None
    order: int = 0
    is_active: bool = True

class SurveyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    responses: Dict[str, Any] = {}
    ai_summary: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    fields: List[CustomField] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== DICTIONARY MODELS ====================

class EventTypeConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    label: str
    color: str  # Tailwind color class or hex
    order: int = 0
    is_active: bool = True

class EventStatusConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    label: str
    color: str
    order: int = 0
    is_active: bool = True

# ==================== ICS SUBSCRIPTION MODEL ====================

class ICSSubscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    url: str
    name: str
    color: str = "#6366f1"
    is_active: bool = True
    last_synced: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ICSSubscriptionCreate(BaseModel):
    url: str
    name: str
    color: str = "#6366f1"

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


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

async def require_manager_or_admin(user: dict = Depends(get_current_user)) -> dict:
    """Require admin role (manager role removed)"""
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== STARTUP ====================

@app.on_event("startup")
async def startup_event():
    # Create indexes for better query performance
    await db.events.create_index("start_time")
    await db.events.create_index("created_by")
    await db.users.create_index("email", unique=True)
    await db.day_ratings.create_index([("user_id", 1), ("date", 1)])
    await db.survey_responses.create_index([("user_id", 1), ("date", 1)])
    
    # Create default admin if not exists
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@company.com')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'Admin123!')
    
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Администратор",
            "role": UserRole.ADMIN,
            "password": hash_password(admin_password),
            "timezone": "Europe/Moscow",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info(f"Created default admin: {admin_email}")
    
    # Create default event types if none exist
    event_types_count = await db.event_types.count_documents({})
    if event_types_count == 0:
        default_event_types = [
            {"id": "default-meeting", "name": "meeting", "label": "Встреча", "color": "#8b5cf6", "order": 0, "is_active": True},
            {"id": "default-call", "name": "call", "label": "Звонок", "color": "#06b6d4", "order": 1, "is_active": True},
            {"id": "default-personal", "name": "personal", "label": "Личное", "color": "#f59e0b", "order": 2, "is_active": True},
            {"id": "default-urgent", "name": "urgent", "label": "Срочно", "color": "#ef4444", "order": 3, "is_active": True},
            {"id": "default-travel", "name": "travel", "label": "Поездка", "color": "#10b981", "order": 4, "is_active": True},
            {"id": "default-deep_work", "name": "deep_work", "label": "Глубокая работа", "color": "#6366f1", "order": 5, "is_active": True},
        ]
        await db.event_types.insert_many(default_event_types)
        logger.info("Created default event types")
    
    # Create default survey questions if none exist
    questions_count = await db.survey_questions.count_documents({})
    if questions_count == 0:
        default_questions = [
            {"id": str(uuid.uuid4()), "question": "Как вы оцениваете продуктивность сегодняшнего дня?", "question_type": "scale", "options": ["1", "2", "3", "4", "5"], "order": 1, "is_active": True},
            {"id": str(uuid.uuid4()), "question": "Какие задачи были выполнены?", "question_type": "text", "order": 2, "is_active": True},
            {"id": str(uuid.uuid4()), "question": "Какие задачи остались невыполненными?", "question_type": "text", "order": 3, "is_active": True},
            {"id": str(uuid.uuid4()), "question": "Что можно улучшить завтра?", "question_type": "text", "order": 4, "is_active": True}
        ]
        await db.survey_questions.insert_many(default_questions)
        logger.info("Created default survey questions")
    
    # Create default day rules
    rules_count = await db.day_rules.count_documents({})
    if rules_count == 0:
        default_rules = [
            {"id": str(uuid.uuid4()), "name": "Максимум встреч", "description": "Максимальное количество встреч в день", "rule_type": "max_meetings", "value": 8, "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Минимальный перерыв", "description": "Минимальный перерыв между встречами (минуты)", "rule_type": "min_break", "value": 15, "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Максимум рабочих часов", "description": "Максимальное количество рабочих часов в день", "rule_type": "max_hours", "value": 10, "is_active": True}
        ]
        await db.day_rules.insert_many(default_rules)
        logger.info("Created default day rules")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user = await db.users.find_one({"email": request.email})
    if not user or not verify_password(request.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User is deactivated")
    
    token = create_token(user["id"], user["role"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            timezone=user.get("timezone", "Europe/Moscow"),
            is_active=user.get("is_active", True)
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)

# ==================== USER ROUTES (Admin only) ====================

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, admin: dict = Depends(require_admin)):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_data.model_dump()
    user_dict["id"] = str(uuid.uuid4())
    user_dict["password"] = hash_password(user_dict["password"])
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    user_dict["is_active"] = True
    
    await db.users.insert_one(user_dict)
    
    # Create default calendars for the new user
    default_calendars = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_dict["id"],
            "name": "Открытый",
            "provider": "custom",
            "color": "#085C53",
            "icon": "book-open",
            "is_default": True,
            "is_public": True,
            "is_active": True,
            "sync_enabled": False,
            "credentials": {},
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_dict["id"],
            "name": "Закрытый",
            "provider": "custom",
            "color": "#6b7280",
            "icon": "lock",
            "is_default": True,
            "is_public": False,
            "is_active": True,
            "sync_enabled": False,
            "credentials": {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.calendars.insert_many(default_calendars)
    logger.info(f"Created default calendars for user {user_dict['email']}")
    
    return UserResponse(**{k: v for k, v in user_dict.items() if k != "password"})

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return [UserResponse(**u) for u in users]

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserBase, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_data.model_dump()
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return UserResponse(**updated)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

@api_router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get("is_active", True)
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}

# ==================== EVENT ROUTES ====================

@api_router.post("/events", response_model=dict)
async def create_event(event_data: EventCreate, user: dict = Depends(get_current_user)):
    event_dict = event_data.model_dump()
    event_dict["id"] = str(uuid.uuid4())
    event_dict["created_by"] = user["id"]
    event_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    event_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Ensure datetime fields have timezone info
    start_time = event_dict["start_time"]
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    event_dict["start_time"] = start_time.isoformat()
    
    end_time = event_dict["end_time"]
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)
    event_dict["end_time"] = end_time.isoformat()
    
    # Handle recurrence_end_date
    if event_dict.get("recurrence_end_date"):
        rec_end = event_dict["recurrence_end_date"]
        if rec_end.tzinfo is None:
            rec_end = rec_end.replace(tzinfo=timezone.utc)
        event_dict["recurrence_end_date"] = rec_end.isoformat()
    
    # Set pattern for tentative events
    if event_dict["status"] == EventStatus.TENTATIVE:
        event_dict["pattern"] = "tentative"
    
    await db.events.insert_one(event_dict)
    return {k: v for k, v in event_dict.items() if k != "_id"}

@api_router.get("/events")
async def get_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    
    if start_date:
        query["start_time"] = {"$gte": start_date}
    if end_date:
        if "start_time" in query:
            query["start_time"]["$lte"] = end_date
        else:
            query["start_time"] = {"$lte": end_date}
    
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    
    # Filter events based on calendar permissions
    filtered_events = await filter_events_by_permissions(events, user["id"], db)
    
    return filtered_events

@api_router.get("/events/{event_id}")
async def get_event(event_id: str, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, event_data: EventCreate, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = event_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Ensure datetime fields have timezone info
    start_time = update_data["start_time"]
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    update_data["start_time"] = start_time.isoformat()
    
    end_time = update_data["end_time"]
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)
    update_data["end_time"] = end_time.isoformat()
    
    # Handle recurrence_end_date
    if update_data.get("recurrence_end_date"):
        rec_end = update_data["recurrence_end_date"]
        if rec_end.tzinfo is None:
            rec_end = rec_end.replace(tzinfo=timezone.utc)
        update_data["recurrence_end_date"] = rec_end.isoformat()
    
    if update_data["status"] == EventStatus.TENTATIVE:
        update_data["pattern"] = "tentative"
    else:
        update_data["pattern"] = None
    
    await db.events.update_one({"id": event_id}, {"$set": update_data})
    updated = await db.events.find_one({"id": event_id}, {"_id": 0})
    return updated

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(get_current_user)):
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}

# ==================== TEMPLATE ROUTES ====================

@api_router.post("/templates")
async def create_template(template_data: TemplateBase, user: dict = Depends(require_manager_or_admin)):
    template_dict = template_data.model_dump()
    template_dict["id"] = str(uuid.uuid4())
    template_dict["created_by"] = user["id"]
    template_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.templates.insert_one(template_dict)
    return {k: v for k, v in template_dict.items() if k != "_id"}

@api_router.get("/templates")
async def get_templates(user: dict = Depends(get_current_user)):
    templates = await db.templates.find({}, {"_id": 0}).to_list(100)
    return templates

@api_router.put("/templates/{template_id}")
async def update_template(template_id: str, template_data: TemplateBase, user: dict = Depends(require_manager_or_admin)):
    result = await db.templates.update_one(
        {"id": template_id},
        {"$set": template_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    updated = await db.templates.find_one({"id": template_id}, {"_id": 0})
    return updated

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(require_manager_or_admin)):
    result = await db.templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

@api_router.post("/templates/{template_id}/apply")
async def apply_template(template_id: str, target_date: str, user: dict = Depends(get_current_user)):
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check if there's already a template applied to this day
    existing_applied = await db.applied_templates.find_one({
        "user_id": user["id"],
        "date": target_date
    })
    
    if existing_applied:
        # Delete events from old template
        old_template_id = existing_applied.get("template_id")
        await db.events.delete_many({
            "created_by": user["id"],
            "template_id": old_template_id,
            "start_time": {"$gte": f"{target_date}T00:00:00", "$lte": f"{target_date}T23:59:59"}
        })
        
        # Update applied template record
        await db.applied_templates.update_one(
            {"id": existing_applied["id"]},
            {"$set": {"template_id": template_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        # Create new applied template record
        applied_dict = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "template_id": template_id,
            "date": target_date,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.applied_templates.insert_one(applied_dict)
    
    created_events = []
    base_date = datetime.fromisoformat(target_date)
    # Ensure base_date has timezone
    if base_date.tzinfo is None:
        base_date = base_date.replace(tzinfo=timezone.utc)
    
    for event_template in template.get("events", []):
        start_offset = timedelta(hours=event_template.get("start_hour", 9), minutes=event_template.get("start_minute", 0))
        end_offset = timedelta(hours=event_template.get("end_hour", 10), minutes=event_template.get("end_minute", 0))
        
        event_date = base_date
        
        # Calculate start and end times with timezone
        start_time = event_date.replace(hour=0, minute=0, second=0, microsecond=0) + start_offset
        end_time = event_date.replace(hour=0, minute=0, second=0, microsecond=0) + end_offset
        
        event_dict = {
            "id": str(uuid.uuid4()),
            "title": event_template.get("title", "Событие"),
            "description": event_template.get("description"),
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "event_type": event_template.get("event_type", "meeting"),
            "status": event_template.get("status", "confirmed"),
            "color": event_template.get("color"),
            "is_template_event": True,  # Mark as template event
            "template_id": template_id,  # Reference to source template
            "created_by": user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.events.insert_one(event_dict)
        created_events.append({k: v for k, v in event_dict.items() if k != "_id"})
    
    return {"created_events": created_events}

@api_router.delete("/templates/applied/{date}")
async def remove_template_from_day(date: str, user: dict = Depends(get_current_user)):
    """Remove template from a specific day and delete all template events for that day"""
    # Find applied template
    applied = await db.applied_templates.find_one({
        "user_id": user["id"],
        "date": date
    })
    
    if not applied:
        raise HTTPException(status_code=404, detail="No template applied to this day")
    
    template_id = applied.get("template_id")
    
    # Delete all events from this template on this day
    result = await db.events.delete_many({
        "created_by": user["id"],
        "template_id": template_id,
        "start_time": {"$gte": f"{date}T00:00:00", "$lte": f"{date}T23:59:59"}
    })
    
    # Remove applied template record
    await db.applied_templates.delete_one({"id": applied["id"]})
    
    return {"message": f"Template removed from {date}", "deleted_events": result.deleted_count}

@api_router.get("/templates/applied")
async def get_applied_templates(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all applied templates for date range"""
    query = {"user_id": user["id"]}
    
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    applied = await db.applied_templates.find(query, {"_id": 0}).to_list(1000)
    return applied

# ==================== DAY RATING ROUTES ====================

@api_router.post("/ratings")
async def create_or_update_rating(rating: int, date: str, notes: Optional[str] = None, user: dict = Depends(get_current_user)):
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    existing = await db.day_ratings.find_one({"user_id": user["id"], "date": date})
    
    if existing:
        await db.day_ratings.update_one(
            {"id": existing["id"]},
            {"$set": {"rating": rating, "notes": notes}}
        )
        updated = await db.day_ratings.find_one({"id": existing["id"]}, {"_id": 0})
        return updated
    else:
        rating_dict = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "date": date,
            "rating": rating,
            "notes": notes,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.day_ratings.insert_one(rating_dict)
        return {k: v for k, v in rating_dict.items() if k != "_id"}

@api_router.get("/ratings")
async def get_ratings(start_date: Optional[str] = None, end_date: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    ratings = await db.day_ratings.find(query, {"_id": 0}).to_list(366)
    return ratings

@api_router.get("/ratings/{date}")
async def get_rating(date: str, user: dict = Depends(get_current_user)):
    rating = await db.day_ratings.find_one({"user_id": user["id"], "date": date}, {"_id": 0})
    return rating

# ==================== SURVEY ROUTES ====================

@api_router.get("/survey/questions")
async def get_survey_questions(user: dict = Depends(get_current_user)):
    questions = await db.survey_questions.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(50)
    return questions

@api_router.post("/survey/questions")
async def create_survey_question(question: str, question_type: str = "text", options: Optional[List[str]] = None, admin: dict = Depends(require_admin)):
    max_order = await db.survey_questions.find_one(sort=[("order", -1)])
    new_order = (max_order.get("order", 0) if max_order else 0) + 1
    
    question_dict = {
        "id": str(uuid.uuid4()),
        "question": question,
        "question_type": question_type,
        "options": options,
        "order": new_order,
        "is_active": True
    }
    await db.survey_questions.insert_one(question_dict)
    return {k: v for k, v in question_dict.items() if k != "_id"}

@api_router.put("/survey/questions/{question_id}")
async def update_survey_question(question_id: str, question: str, question_type: str = "text", options: Optional[List[str]] = None, admin: dict = Depends(require_admin)):
    result = await db.survey_questions.update_one(
        {"id": question_id},
        {"$set": {"question": question, "question_type": question_type, "options": options}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    
    updated = await db.survey_questions.find_one({"id": question_id}, {"_id": 0})
    return updated

@api_router.delete("/survey/questions/{question_id}")
async def delete_survey_question(question_id: str, admin: dict = Depends(require_admin)):
    result = await db.survey_questions.delete_one({"id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question deleted"}

@api_router.post("/survey/responses")
async def submit_survey_response(date: str, responses: Dict[str, Any], user: dict = Depends(get_current_user)):
    # Get events for the day
    events = await db.events.find({
        "start_time": {"$gte": f"{date}T00:00:00", "$lt": f"{date}T23:59:59"}
    }, {"_id": 0}).to_list(100)
    
    # Generate AI summary
    ai_summary = await generate_day_summary(date, events, responses)
    
    response_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "date": date,
        "responses": responses,
        "ai_summary": ai_summary,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert - update if exists, insert if not
    existing = await db.survey_responses.find_one({"user_id": user["id"], "date": date})
    if existing:
        await db.survey_responses.update_one(
            {"id": existing["id"]},
            {"$set": {"responses": responses, "ai_summary": ai_summary}}
        )
        response_dict["id"] = existing["id"]
    else:
        await db.survey_responses.insert_one(response_dict)
    
    return {k: v for k, v in response_dict.items() if k != "_id"}

@api_router.get("/survey/responses")
async def get_survey_responses(start_date: Optional[str] = None, end_date: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    responses = await db.survey_responses.find(query, {"_id": 0}).to_list(100)
    return responses

@api_router.get("/survey/responses/{date}")
async def get_survey_response(date: str, user: dict = Depends(get_current_user)):
    response = await db.survey_responses.find_one({"user_id": user["id"], "date": date}, {"_id": 0})
    return response

# ==================== AI SUMMARY ====================

async def generate_day_summary(date: str, events: list, survey_responses: dict) -> str:
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return "AI summary unavailable - no API key configured"
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"day-summary-{date}",
            system_message="Вы - ассистент руководителя. Ваша задача - создавать краткие, структурированные отчеты о прошедшем дне в формате Markdown. Будьте конкретны и профессиональны."
        ).with_model("openai", "gpt-5.2")
        
        events_text = "\n".join([f"- {e.get('title', 'Без названия')} ({e.get('start_time', '')[:16]} - {e.get('end_time', '')[:16]}): {e.get('description', '')}" for e in events])
        responses_text = "\n".join([f"- {k}: {v}" for k, v in survey_responses.items()])
        
        prompt = f"""Создайте краткий отчет о дне {date} для базы знаний руководителя.

События дня:
{events_text if events else "Нет событий"}

Ответы на вопросы дня:
{responses_text if survey_responses else "Нет ответов"}

Создайте структурированный Markdown-отчет с разделами:
1. Краткое резюме дня
2. Ключевые события и встречи
3. Выполненные задачи
4. Зоны для улучшения
5. Рекомендации на следующий день"""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response
        
    except Exception as e:
        logger.error(f"Error generating AI summary: {e}")
        return f"Ошибка генерации отчета: {str(e)}"

# ==================== DAY RULES ROUTES ====================

@api_router.get("/rules")
async def get_rules(user: dict = Depends(get_current_user)):
    rules = await db.day_rules.find({}, {"_id": 0}).to_list(50)
    return rules

@api_router.post("/rules")
async def create_rule(name: str, description: str, rule_type: str, value: int, admin: dict = Depends(require_admin)):
    rule_dict = {
        "id": str(uuid.uuid4()),
        "name": name,
        "description": description,
        "rule_type": rule_type,
        "value": value,
        "is_active": True
    }
    await db.day_rules.insert_one(rule_dict)
    return {k: v for k, v in rule_dict.items() if k != "_id"}

@api_router.put("/rules/{rule_id}")
async def update_rule(rule_id: str, name: str, description: str, rule_type: str, value: int, admin: dict = Depends(require_admin)):
    result = await db.day_rules.update_one(
        {"id": rule_id},
        {"$set": {"name": name, "description": description, "rule_type": rule_type, "value": value}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    updated = await db.day_rules.find_one({"id": rule_id}, {"_id": 0})
    return updated

@api_router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, admin: dict = Depends(require_admin)):
    result = await db.day_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Rule deleted"}

@api_router.get("/rules/check/{date}")
async def check_day_rules(date: str, user: dict = Depends(get_current_user)):
    rules = await db.day_rules.find({"is_active": True}, {"_id": 0}).to_list(50)
    events = await db.events.find({
        "start_time": {"$gte": f"{date}T00:00:00", "$lt": f"{date}T23:59:59"}
    }, {"_id": 0}).to_list(100)
    
    violations = []
    
    for rule in rules:
        if rule["rule_type"] == "max_meetings":
            meeting_count = len([e for e in events if e.get("event_type") in ["meeting", "call"]])
            if meeting_count > rule["value"]:
                violations.append({
                    "rule": rule["name"],
                    "message": f"Превышен лимит встреч: {meeting_count} из {rule['value']} разрешённых",
                    "severity": "high"
                })
        
        elif rule["rule_type"] == "max_hours":
            total_minutes = 0
            for event in events:
                try:
                    start = datetime.fromisoformat(event["start_time"].replace("Z", "+00:00"))
                    end = datetime.fromisoformat(event["end_time"].replace("Z", "+00:00"))
                    total_minutes += (end - start).total_seconds() / 60
                except (ValueError, KeyError, TypeError):
                    pass
            
            total_hours = total_minutes / 60
            if total_hours > rule["value"]:
                violations.append({
                    "rule": rule["name"],
                    "message": f"Превышен лимит рабочих часов: {total_hours:.1f} из {rule['value']} разрешённых",
                    "severity": "high"
                })
        
        elif rule["rule_type"] == "min_break":
            sorted_events = sorted(events, key=lambda x: x.get("start_time", ""))
            for i in range(len(sorted_events) - 1):
                try:
                    end_current = datetime.fromisoformat(sorted_events[i]["end_time"].replace("Z", "+00:00"))
                    start_next = datetime.fromisoformat(sorted_events[i + 1]["start_time"].replace("Z", "+00:00"))
                    gap_minutes = (start_next - end_current).total_seconds() / 60
                    
                    if 0 < gap_minutes < rule["value"]:
                        violations.append({
                            "rule": rule["name"],
                            "message": f"Недостаточный перерыв между '{sorted_events[i].get('title', '')}' и '{sorted_events[i+1].get('title', '')}': {int(gap_minutes)} мин",
                            "severity": "medium"
                        })
                except (ValueError, KeyError, TypeError):
                    pass
    
    return {
        "date": date,
        "is_valid": len(violations) == 0,
        "violations": violations,
        "events_count": len(events)
    }

# ==================== EVENT FIELD CONFIG ====================

@api_router.get("/event-fields")
async def get_event_fields(user: dict = Depends(get_current_user)):
    config = await db.event_field_config.find_one({}, {"_id": 0})
    if not config:
        return {"fields": []}
    return config

@api_router.put("/event-fields")
async def update_event_fields(fields: List[dict], admin: dict = Depends(require_admin)):
    config = {
        "id": "event-field-config",
        "fields": fields,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.event_field_config.update_one(
        {"id": "event-field-config"},
        {"$set": config},
        upsert=True
    )
    return config

# ==================== CALENDAR INTEGRATION ROUTES ====================

@api_router.get("/calendars")
async def get_calendars(user: dict = Depends(get_current_user)):
    # Get user's own calendars
    own_calendars = await db.calendars.find({"user_id": user["id"]}, {"_id": 0, "credentials": 0}).to_list(100)
    
    # Get calendars shared with this user
    permissions = await db.calendar_permissions.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    shared_calendar_ids = [p["calendar_id"] for p in permissions]
    
    shared_calendars = []
    if shared_calendar_ids:
        shared_calendars = await db.calendars.find(
            {"id": {"$in": shared_calendar_ids}}, 
            {"_id": 0, "credentials": 0}
        ).to_list(100)
        
        # Add permission info to shared calendars
        for cal in shared_calendars:
            perm = next((p for p in permissions if p["calendar_id"] == cal["id"]), None)
            if perm:
                cal["permission_level"] = perm["permission_level"]
                cal["is_shared"] = True
    
    return own_calendars + shared_calendars

@api_router.post("/calendars")
async def add_calendar(name: str, color: str, icon: str = "calendar", user: dict = Depends(get_current_user)):
    calendar_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": name,
        "provider": "custom",
        "color": color,
        "icon": icon,
        "is_default": False,
        "is_public": True,
        "pattern": None,
        "is_active": True,
        "sync_enabled": False,
        "credentials": {},
        "last_synced": None
    }
    await db.calendars.insert_one(calendar_dict)
    return {k: v for k, v in calendar_dict.items() if k not in ["_id", "credentials"]}

@api_router.delete("/calendars/{calendar_id}")
async def delete_calendar(calendar_id: str, user: dict = Depends(get_current_user)):
    result = await db.calendars.delete_one({"id": calendar_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Calendar not found")
    return {"message": "Calendar deleted"}


# ==================== CALENDAR PERMISSIONS ====================

@api_router.get("/calendars/{calendar_id}/permissions")
async def get_calendar_permissions(calendar_id: str, user: dict = Depends(get_current_user)):
    """Get all permissions for a calendar (owner only)"""
    calendar = await db.calendars.find_one({"id": calendar_id, "user_id": user["id"]})
    if not calendar:
        raise HTTPException(status_code=403, detail="Not calendar owner")
    
    permissions = await db.calendar_permissions.find({"calendar_id": calendar_id}, {"_id": 0}).to_list(100)
    
    # Enrich with user info
    for perm in permissions:
        user_info = await db.users.find_one({"id": perm["user_id"]}, {"_id": 0, "password": 0})
        if user_info:
            perm["user_name"] = user_info.get("name")
            perm["user_email"] = user_info.get("email")
    
    return permissions

@api_router.post("/calendars/{calendar_id}/permissions")
async def grant_calendar_permission(
    calendar_id: str, 
    user_email: str, 
    permission_level: str,
    owner: dict = Depends(get_current_user)
):
    """Grant access to a calendar"""
    # Verify owner
    calendar = await db.calendars.find_one({"id": calendar_id, "user_id": owner["id"]})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    # Add permission
    await db.calendar_permissions.insert_one({
        "id": str(uuid.uuid4()),
        "calendar_id": calendar_id,
        "user_id": user_id,
        "permission": permission,
        "created_at": datetime.utcnow().isoformat()
    })
    return {"status": "ok"}


# ==================== USER SUBSCRIPTIONS ====================

@api_router.get("/subscriptions")
async def get_subscriptions(user: dict = Depends(get_current_user)):
    """Get list of users current user is subscribed to"""
    subscriptions = await db.user_subscriptions.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    
    # Enrich with user info
    for sub in subscriptions:
        target_user = await db.users.find_one({"id": sub["target_user_id"]}, {"_id": 0, "password": 0})
        if target_user:
            sub["target_user_name"] = target_user.get("name")
            sub["target_user_email"] = target_user.get("email")
    
    return subscriptions

@api_router.post("/subscriptions")
async def create_subscription(target_user_id: str, user: dict = Depends(get_current_user)):
    """Subscribe to another user's calendar"""
    if target_user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot subscribe to yourself")
    
    # Check if target user exists
    target = await db.users.find_one({"id": target_user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already subscribed
    existing = await db.user_subscriptions.find_one({
        "user_id": user["id"],
        "target_user_id": target_user_id
    })
    
    if existing:
        return existing
    
    # Create subscription
    sub_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "target_user_id": target_user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_subscriptions.insert_one(sub_dict)
    return {k: v for k, v in sub_dict.items() if k != "_id"}

@api_router.delete("/subscriptions/{target_user_id}")
async def delete_subscription(target_user_id: str, user: dict = Depends(get_current_user)):
    """Unsubscribe from a user"""
    result = await db.user_subscriptions.delete_one({
        "user_id": user["id"],
        "target_user_id": target_user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    return {"message": "Unsubscribed"}

@api_router.get("/users/{user_id}/events")
async def get_user_events(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get events for a specific user (with permission filtering for current user)"""
    # Build query
    query = {"created_by": user_id}
    
    if start_date and end_date:
        query["start_time"] = {"$gte": f"{start_date}T00:00:00", "$lte": f"{end_date}T23:59:59"}
    
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    
    # Generate recurring instances
    if start_date and end_date:
        start_dt = datetime.fromisoformat(start_date)
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=timezone.utc)
        
        end_dt = datetime.fromisoformat(end_date)
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=timezone.utc)
        
        all_events = list(events)
        for event in events:
            if event.get("recurrence_type") and event.get("recurrence_type") not in ["none", None, ""]:
                instances = generate_recurring_instances(event, start_dt, end_dt)
                all_events.extend(instances)
        
        events = all_events
    
    # Filter by permissions (if viewing another user)
    if user_id != current_user["id"]:
        filtered_events = await filter_events_by_permissions(events, current_user["id"], db)
        return filtered_events
    
    return events

@api_router.post("/calendars/{calendar_id}/share")
async def share_calendar(
    calendar_id: str,
    user_email: str = Body(...),
    permission_level: str = Body(...),
    owner: dict = Depends(get_current_user)
):
    """Share calendar with another user"""
    # Verify owner
    calendar = await db.calendars.find_one({"id": calendar_id, "user_id": owner["id"]})
    if not calendar:
        raise HTTPException(status_code=403, detail="Not calendar owner")
    
    if calendar.get("is_default") and not calendar.get("is_public"):
        raise HTTPException(status_code=400, detail="Cannot share private calendar")
    
    # Validate permission level
    if permission_level not in ["read", "edit", "full"]:
        raise HTTPException(status_code=400, detail="Invalid permission level")
    
    # Find target user
    target_user = await db.users.find_one({"email": user_email})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user["id"] == owner["id"]:
        raise HTTPException(status_code=400, detail="Cannot grant permission to yourself")
    
    # Check if permission already exists
    existing = await db.calendar_permissions.find_one({
        "calendar_id": calendar_id,
        "user_id": target_user["id"]
    })
    
    if existing:
        # Update permission level
        await db.calendar_permissions.update_one(
            {"id": existing["id"]},
            {"$set": {"permission_level": permission_level}}
        )
        return {**existing, "permission_level": permission_level}
    else:
        # Create new permission
        perm_dict = {
            "id": str(uuid.uuid4()),
            "calendar_id": calendar_id,
            "user_id": target_user["id"],
            "permission_level": permission_level,
            "granted_by": owner["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.calendar_permissions.insert_one(perm_dict)
        return {k: v for k, v in perm_dict.items() if k != "_id"}


@api_router.delete("/calendars/{calendar_id}/permissions/{permission_user_id}")
async def revoke_calendar_permission(calendar_id: str, permission_user_id: str, owner: dict = Depends(get_current_user)):
    """Revoke access to a calendar"""
    # Verify owner
    calendar = await db.calendars.find_one({"id": calendar_id, "user_id": owner["id"]})
    if not calendar:
        raise HTTPException(status_code=403, detail="Not calendar owner")
    
    result = await db.calendar_permissions.delete_one({
        "calendar_id": calendar_id,
        "user_id": permission_user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    return {"message": "Permission revoked"}

# ==================== OVERLOADED DAYS ====================

@api_router.get("/analytics/overloaded-days")
async def get_overloaded_days(start_date: str, end_date: str, user: dict = Depends(get_current_user)):
    rules = await db.day_rules.find({"is_active": True, "rule_type": "max_meetings"}, {"_id": 0}).to_list(1)
    max_meetings = rules[0]["value"] if rules else 8
    
    events = await db.events.find({
        "start_time": {"$gte": f"{start_date}T00:00:00", "$lte": f"{end_date}T23:59:59"}
    }, {"_id": 0}).to_list(1000)
    
    day_counts = {}
    for event in events:
        day = event["start_time"][:10]
        if day not in day_counts:
            day_counts[day] = 0
        day_counts[day] += 1
    
    overloaded = [{"date": day, "count": count, "is_overloaded": count > max_meetings} for day, count in day_counts.items() if count > max_meetings * 0.8]
    
    return overloaded

class EventTypeReorderRequest(BaseModel):
    type_ids: List[str]

# ==================== EVENT TYPES DICTIONARY ====================

@api_router.get("/dictionaries/event-types")
async def get_event_types(user: dict = Depends(get_current_user)):
    types = await db.event_types.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return types

@api_router.post("/dictionaries/event-types")
async def create_event_type(name: str, label: str, color: str, admin: dict = Depends(require_admin)):
    max_order = await db.event_types.find_one(sort=[("order", -1)])
    new_order = (max_order.get("order", 0) if max_order else 0) + 1
    
    type_dict = {
        "id": str(uuid.uuid4()),
        "name": name,
        "label": label,
        "color": color,
        "order": new_order,
        "is_active": True
    }
    await db.event_types.insert_one(type_dict)
    return {k: v for k, v in type_dict.items() if k != "_id"}

@api_router.put("/dictionaries/event-types/reorder")
async def reorder_event_types(request: EventTypeReorderRequest, admin: dict = Depends(require_admin)):
    for idx, type_id in enumerate(request.type_ids):
        await db.event_types.update_one({"id": type_id}, {"$set": {"order": idx}})
    return {"message": "Event types reordered"}

@api_router.put("/dictionaries/event-types/{type_id}")
async def update_event_type(type_id: str, name: str, label: str, color: str, order: int = 0, is_active: bool = True, admin: dict = Depends(require_admin)):
    result = await db.event_types.update_one(
        {"id": type_id},
        {"$set": {"name": name, "label": label, "color": color, "order": order, "is_active": is_active}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event type not found")
    
    updated = await db.event_types.find_one({"id": type_id}, {"_id": 0})
    return updated

@api_router.delete("/dictionaries/event-types/{type_id}")
async def delete_event_type(type_id: str, admin: dict = Depends(require_admin)):
    result = await db.event_types.delete_one({"id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event type not found")
    return {"message": "Event type deleted"}

# ==================== EVENT STATUSES DICTIONARY ====================

@api_router.get("/dictionaries/event-statuses")
async def get_event_statuses(user: dict = Depends(get_current_user)):
    statuses = await db.event_statuses.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    if not statuses:
        # Return default statuses if none exist
        return [
            {"id": "default-confirmed", "name": "confirmed", "label": "Подтверждено", "color": "#10b981", "order": 0, "is_active": True},
            {"id": "default-tentative", "name": "tentative", "label": "Не подтверждено", "color": "#f59e0b", "order": 1, "is_active": True},
            {"id": "default-cancelled", "name": "cancelled", "label": "Отменено", "color": "#ef4444", "order": 2, "is_active": True},
        ]
    return statuses

@api_router.post("/dictionaries/event-statuses")
async def create_event_status(name: str, label: str, color: str, admin: dict = Depends(require_admin)):
    max_order = await db.event_statuses.find_one(sort=[("order", -1)])
    new_order = (max_order.get("order", 0) if max_order else 0) + 1
    
    status_dict = {
        "id": str(uuid.uuid4()),
        "name": name,
        "label": label,
        "color": color,
        "order": new_order,
        "is_active": True
    }
    await db.event_statuses.insert_one(status_dict)
    return {k: v for k, v in status_dict.items() if k != "_id"}

@api_router.put("/dictionaries/event-statuses/{status_id}")
async def update_event_status(status_id: str, name: str, label: str, color: str, order: int = 0, is_active: bool = True, admin: dict = Depends(require_admin)):
    result = await db.event_statuses.update_one(
        {"id": status_id},
        {"$set": {"name": name, "label": label, "color": color, "order": order, "is_active": is_active}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event status not found")
    
    updated = await db.event_statuses.find_one({"id": status_id}, {"_id": 0})
    return updated

@api_router.delete("/dictionaries/event-statuses/{status_id}")
async def delete_event_status(status_id: str, admin: dict = Depends(require_admin)):
    result = await db.event_statuses.delete_one({"id": status_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event status not found")
    return {"message": "Event status deleted"}

# ==================== CUSTOM TIMEZONES ====================

@api_router.get("/dictionaries/timezones")
async def get_custom_timezones(current_user: dict = Depends(get_current_user)):
    timezones = await db.custom_timezones.find({}, {"_id": 0}).to_list(100)
    return timezones

@api_router.post("/dictionaries/timezones")
async def create_custom_timezone(name: str, label: str, offset: float, admin: dict = Depends(require_admin)):
    timezone_data = {
        "id": str(uuid.uuid4()),
        "value": name,  # For compatibility with frontend TIMEZONES format
        "name": name,
        "label": label,
        "offset": offset,
        "is_custom": True
    }
    await db.custom_timezones.insert_one(timezone_data)
    timezone_data.pop("_id", None)
    return timezone_data

@api_router.delete("/dictionaries/timezones/{timezone_id}")
async def delete_custom_timezone(timezone_id: str, admin: dict = Depends(require_admin)):
    result = await db.custom_timezones.delete_one({"id": timezone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Timezone not found")
    return {"message": "Timezone deleted"}

# ==================== ICS SUBSCRIPTIONS ====================

@api_router.get("/ics-subscriptions")
async def get_ics_subscriptions(user: dict = Depends(get_current_user)):
    """Get all ICS subscriptions for current user"""
    subscriptions = await db.ics_subscriptions.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)
    return subscriptions

@api_router.post("/ics-subscriptions")
async def create_ics_subscription(subscription: ICSSubscriptionCreate, user: dict = Depends(get_current_user)):
    """Create a new ICS subscription"""
    # Validate URL by trying to fetch it
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(subscription.url)
            response.raise_for_status()
            # Try to parse as ICS
            ICSCalendar(response.text)
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Не удалось загрузить календарь: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Невалидный ICS файл: {str(e)}")
    
    sub_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "url": subscription.url,
        "name": subscription.name,
        "color": subscription.color,
        "is_active": True,
        "last_synced": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ics_subscriptions.insert_one(sub_dict)
    return {k: v for k, v in sub_dict.items() if k != "_id"}

@api_router.put("/ics-subscriptions/{subscription_id}")
async def update_ics_subscription(subscription_id: str, name: str, color: str, user: dict = Depends(get_current_user)):
    """Update an ICS subscription"""
    result = await db.ics_subscriptions.update_one(
        {"id": subscription_id, "user_id": user["id"]},
        {"$set": {"name": name, "color": color}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    updated = await db.ics_subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    return updated

@api_router.delete("/ics-subscriptions/{subscription_id}")
async def delete_ics_subscription(subscription_id: str, user: dict = Depends(get_current_user)):
    """Delete an ICS subscription"""
    result = await db.ics_subscriptions.delete_one({"id": subscription_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"message": "Subscription deleted"}

@api_router.get("/ics-subscriptions/{subscription_id}/events")
async def get_ics_events(subscription_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Fetch and parse events from an ICS subscription"""
    subscription = await db.ics_subscriptions.find_one({"id": subscription_id, "user_id": user["id"]}, {"_id": 0})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(subscription["url"])
            response.raise_for_status()
            calendar = ICSCalendar(response.text)
        
        events = []
        start_filter = datetime.fromisoformat(start_date) if start_date else None
        end_filter = datetime.fromisoformat(end_date) if end_date else None
        
        for event in calendar.events:
            # Filter by date range if provided
            if start_filter and event.begin.datetime < start_filter.replace(tzinfo=event.begin.datetime.tzinfo):
                continue
            if end_filter and event.begin.datetime > end_filter.replace(tzinfo=event.begin.datetime.tzinfo):
                continue
            
            events.append({
                "id": f"ics-{subscription_id}-{event.uid or str(uuid.uuid4())}",
                "title": event.name or "Без названия",
                "description": event.description or "",
                "start_time": event.begin.datetime.isoformat(),
                "end_time": event.end.datetime.isoformat() if event.end else event.begin.shift(hours=1).datetime.isoformat(),
                "location": event.location or "",
                "is_external": True,
                "external_calendar_id": subscription_id,
                "external_calendar_name": subscription["name"],
                "external_calendar_color": subscription["color"],
                "event_type": "meeting",
                "status": "confirmed"
            })
        
        # Update last_synced
        await db.ics_subscriptions.update_one(
            {"id": subscription_id},
            {"$set": {"last_synced": datetime.now(timezone.utc).isoformat()}}
        )
        
        return events
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки календаря: {str(e)}")
    except Exception as e:
        logger.error(f"Error parsing ICS: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка парсинга ICS: {str(e)}")

@api_router.get("/ics-subscriptions/all-events")
async def get_all_ics_events(start_date: Optional[str] = None, end_date: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Fetch events from all active ICS subscriptions"""
    subscriptions = await db.ics_subscriptions.find({"user_id": user["id"], "is_active": True}, {"_id": 0}).to_list(50)
    
    all_events = []
    for subscription in subscriptions:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(subscription["url"])
                response.raise_for_status()
                calendar = ICSCalendar(response.text)
            
            start_filter = datetime.fromisoformat(start_date) if start_date else None
            end_filter = datetime.fromisoformat(end_date) if end_date else None
            
            for event in calendar.events:
                # Filter by date range if provided
                if start_filter and event.begin.datetime < start_filter.replace(tzinfo=event.begin.datetime.tzinfo):
                    continue
                if end_filter and event.begin.datetime > end_filter.replace(tzinfo=event.begin.datetime.tzinfo):
                    continue
                
                all_events.append({
                    "id": f"ics-{subscription['id']}-{event.uid or str(uuid.uuid4())}",
                    "title": event.name or "Без названия",
                    "description": event.description or "",
                    "start_time": event.begin.datetime.isoformat(),
                    "end_time": event.end.datetime.isoformat() if event.end else event.begin.shift(hours=1).datetime.isoformat(),
                    "location": event.location or "",
                    "is_external": True,
                    "external_calendar_id": subscription["id"],
                    "external_calendar_name": subscription["name"],
                    "external_calendar_color": subscription["color"],
                    "event_type": "meeting",
                    "status": "confirmed"
                })
        except Exception as e:
            logger.warning(f"Failed to fetch ICS {subscription['id']}: {e}")
            continue
    
    return all_events

# ==================== RECURRING EVENTS ====================

def generate_recurring_instances(event: dict, start_date: datetime, end_date: datetime) -> List[dict]:
    """Generate instances of a recurring event within a date range"""
    instances = []
    recurrence_type = event.get("recurrence_type", "none")
    
    if recurrence_type == "none":
        return instances
    
    event_start = datetime.fromisoformat(event["start_time"].replace("Z", "+00:00"))
    event_end = datetime.fromisoformat(event["end_time"].replace("Z", "+00:00"))
    duration = event_end - event_start
    
    # Ensure all datetimes have timezone info
    if start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=timezone.utc)
    if end_date.tzinfo is None:
        end_date = end_date.replace(tzinfo=timezone.utc)
    if event_start.tzinfo is None:
        event_start = event_start.replace(tzinfo=timezone.utc)
    
    recurrence_end = None
    if event.get("recurrence_end_date"):
        recurrence_end = datetime.fromisoformat(event["recurrence_end_date"].replace("Z", "+00:00"))
        if recurrence_end.tzinfo is None:
            recurrence_end = recurrence_end.replace(tzinfo=timezone.utc)
    
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

@api_router.get("/recurring-events")
async def get_events_with_recurring(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get events including generated recurring instances"""
    # Fetch ALL events in date range (same as regular /events endpoint)
    query = {}
    if start_date:
        query["start_time"] = {"$gte": start_date}
    if end_date:
        if "start_time" in query:
            query["start_time"]["$lte"] = end_date
        else:
            query["start_time"] = {"$lte": end_date}
    
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    
    # Also fetch recurring events that might have started before start_date
    recurring_query = {"recurrence_type": {"$nin": ["none", None, ""]}}
    if start_date:
        recurring_query["start_time"] = {"$lt": start_date}
    recurring_events = await db.events.find(recurring_query, {"_id": 0}).to_list(100)
    
    # Parse date range for recurring generation
    if start_date:
        start_dt = datetime.fromisoformat(start_date)
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=timezone.utc)
    else:
        start_dt = datetime.now(timezone.utc) - timedelta(days=30)
    
    if end_date:
        end_dt = datetime.fromisoformat(end_date)
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=timezone.utc)
    else:
        end_dt = datetime.now(timezone.utc) + timedelta(days=30)
    
    # Start with all regular events
    result_events = list(events)
    processed_parent_ids = set()
    
    # Add recurring instances for recurring events
    all_recurring = [e for e in events if e.get("recurrence_type") and e.get("recurrence_type") not in ["none", None, ""]]
    all_recurring.extend(recurring_events)
    
    for event in all_recurring:
        event_id = event.get("id")
        if event_id in processed_parent_ids:
            continue
        
        instances = generate_recurring_instances(event, start_dt, end_dt)
        result_events.extend(instances)
        processed_parent_ids.add(event_id)
    
    # Filter by permissions
    filtered_events = await filter_events_by_permissions(result_events, user["id"], db)
    
    return filtered_events

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Executive Calendar API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
