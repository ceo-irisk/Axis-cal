from fastapi import FastAPI, APIRouter, HTTPException, Depends, status as http_status
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
    MANAGER = "manager"
    ASSISTANT = "assistant"

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
    MONTHLY = "monthly"
    YEARLY = "yearly"

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    event_type: EventType = EventType.MEETING
    status: EventStatus = EventStatus.CONFIRMED
    color: Optional[str] = None
    pattern: Optional[str] = None  # for tentative events
    location: Optional[str] = None
    attendees: List[str] = []
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
    provider: str  # google, yandex, apple, bitrix24
    color: str
    pattern: Optional[str] = None
    is_active: bool = True
    sync_enabled: bool = True
    credentials: Dict[str, Any] = {}
    last_synced: Optional[datetime] = None

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

async def require_manager_or_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Manager or Admin access required")
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
    event_dict["start_time"] = event_dict["start_time"].isoformat()
    event_dict["end_time"] = event_dict["end_time"].isoformat()
    
    # Handle recurrence_end_date
    if event_dict.get("recurrence_end_date"):
        event_dict["recurrence_end_date"] = event_dict["recurrence_end_date"].isoformat()
    
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
    return events

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
    update_data["start_time"] = update_data["start_time"].isoformat()
    update_data["end_time"] = update_data["end_time"].isoformat()
    
    # Handle recurrence_end_date
    if update_data.get("recurrence_end_date"):
        update_data["recurrence_end_date"] = update_data["recurrence_end_date"].isoformat()
    
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
    
    created_events = []
    base_date = datetime.fromisoformat(target_date)
    
    for event_template in template.get("events", []):
        start_offset = timedelta(hours=event_template.get("start_hour", 9), minutes=event_template.get("start_minute", 0))
        end_offset = timedelta(hours=event_template.get("end_hour", 10), minutes=event_template.get("end_minute", 0))
        
        if template["template_type"] == "week":
            day_offset = event_template.get("day_of_week", 0)
            event_date = base_date + timedelta(days=day_offset)
        else:
            event_date = base_date
        
        event_dict = {
            "id": str(uuid.uuid4()),
            "title": event_template.get("title", "Событие"),
            "description": event_template.get("description"),
            "start_time": (event_date.replace(hour=0, minute=0, second=0, microsecond=0) + start_offset).isoformat(),
            "end_time": (event_date.replace(hour=0, minute=0, second=0, microsecond=0) + end_offset).isoformat(),
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
    calendars = await db.calendars.find({"user_id": user["id"]}, {"_id": 0, "credentials": 0}).to_list(20)
    return calendars

@api_router.post("/calendars")
async def add_calendar(name: str, provider: str, color: str, pattern: Optional[str] = None, user: dict = Depends(get_current_user)):
    calendar_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": name,
        "provider": provider,
        "color": color,
        "pattern": pattern,
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
    if not types:
        # Return default types if none exist
        return [
            {"id": "default-meeting", "name": "meeting", "label": "Встреча", "color": "#8b5cf6", "order": 0, "is_active": True},
            {"id": "default-call", "name": "call", "label": "Звонок", "color": "#06b6d4", "order": 1, "is_active": True},
            {"id": "default-personal", "name": "personal", "label": "Личное", "color": "#f59e0b", "order": 2, "is_active": True},
            {"id": "default-urgent", "name": "urgent", "label": "Срочно", "color": "#ef4444", "order": 3, "is_active": True},
            {"id": "default-travel", "name": "travel", "label": "Поездка", "color": "#10b981", "order": 4, "is_active": True},
            {"id": "default-deep_work", "name": "deep_work", "label": "Глубокая работа", "color": "#6366f1", "order": 5, "is_active": True},
        ]
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
    
    return result_events

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
