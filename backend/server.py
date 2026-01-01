from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import uuid
from datetime import datetime, timezone

# Import routes
from routes import auth, users, events, calendars, templates, ratings, dictionaries, ics, other
from dependencies import init_db as init_dependencies_db
from models.user import UserRole
from services.auth import hash_password

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Executive Calendar API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize database in all route modules
def init_all_routes():
    auth.init_db(db)
    users.init_db(db)
    events.init_db(db)
    calendars.init_db(db)
    templates.init_db(db)
    ratings.init_db(db)
    dictionaries.init_db(db)
    ics.init_db(db)
    other.init_db(db)
    init_dependencies_db(db)

init_all_routes()

# Include all routers
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(events.router)
api_router.include_router(calendars.router)
api_router.include_router(calendars.subscriptions_router)
api_router.include_router(templates.router)
api_router.include_router(ratings.router)
api_router.include_router(ratings.survey_router)
api_router.include_router(dictionaries.router)
api_router.include_router(ics.router)
api_router.include_router(other.router)
api_router.include_router(other.analytics_router)
api_router.include_router(other.event_fields_router)
api_router.include_router(other.recurring_router)
api_router.include_router(other.user_events_router)

# Health check routes
@api_router.get("/")
async def root():
    return {"message": "Executive Calendar API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the main router in the app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
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

# Shutdown event
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
