from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import redis.asyncio as redis

# Import routes
from routes import auth, users, events, calendars, templates, ratings, dictionaries, ics, other, recurring_exceptions
from dependencies import init_db as init_dependencies_db
from services.init_data import initialize_default_data, create_indexes
from services import cache

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

# Redis connection (with graceful degradation)
redis_client = None
try:
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
    cache_enabled = os.environ.get('ENABLE_CACHING', 'true').lower() == 'true'
    
    if cache_enabled:
        redis_client = redis.from_url(redis_url, decode_responses=False)
        logger.info(f"✅ Redis connection configured: {redis_url}")
    else:
        logger.info("ℹ️  Caching disabled via ENABLE_CACHING=false")
except Exception as e:
    logger.warning(f"⚠️  Redis connection failed: {str(e)}. Running without cache.")
    redis_client = None

# Initialize cache service
cache.init_redis(redis_client)

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
    recurring_exceptions.init_db(db)  # ✨ NEW
    init_dependencies_db(db)

init_all_routes()

# Include all routers
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(events.router)
api_router.include_router(calendars.router)
# subscriptions_router удален - используем только calendar_permissions
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
api_router.include_router(recurring_exceptions.router)  # ✨ NEW
api_router.include_router(recurring_exceptions.router)  # ✨ NEW

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
    await create_indexes(db)
    await initialize_default_data(db)

# Shutdown event
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

