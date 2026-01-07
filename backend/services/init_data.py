"""
Инициализация дефолтных данных при старте приложения
"""
import uuid
import os
from datetime import datetime, timezone
from models.user import UserRole
from services.auth import hash_password
import logging

logger = logging.getLogger(__name__)

async def initialize_default_data(db):
    """Initialize all default data on startup"""
    
    # 1. Create default admin user from environment variables
    # Безопасность: логин и пароль берутся из .env файла
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@company.com')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    
    # Проверяем существование пользователя (идемпотентность)
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
        
        # Создаем дефолтные календари для админа
        default_calendars = [
            {
                "id": str(uuid.uuid4()),
                "user_id": admin_user["id"],
                "name": "Открытый",
                "provider": "custom",
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
                "user_id": admin_user["id"],
                "name": "Закрытый",
                "provider": "custom",
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
        logger.info(f"✅ Created default admin: {admin_email} with default calendars")
    else:
        logger.info(f"ℹ️  Admin user already exists: {admin_email}")
    
    # 2. Create default event types
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
    
    # 3. Create default survey questions
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
    
    # 4. Create default day rules
    rules_count = await db.day_rules.count_documents({})
    if rules_count == 0:
        default_rules = [
            {"id": str(uuid.uuid4()), "name": "Максимум встреч", "description": "Максимальное количество встреч в день", "rule_type": "max_meetings", "value": 8, "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Минимальный перерыв", "description": "Минимальный перерыв между встречами (минуты)", "rule_type": "min_break", "value": 15, "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Максимум рабочих часов", "description": "Максимальное количество рабочих часов в день", "rule_type": "max_hours", "value": 10, "is_active": True}
        ]
        await db.day_rules.insert_many(default_rules)
        logger.info("Created default day rules")
    
    # 5. Create default timezones
    timezones_count = await db.custom_timezones.count_documents({})
    if timezones_count == 0:
        default_timezones = [
            {"id": str(uuid.uuid4()), "name": "UTC (0:00)", "offset": "0:00"},
            {"id": str(uuid.uuid4()), "name": "Лондон (GMT+0)", "offset": "+0:00"},
            {"id": str(uuid.uuid4()), "name": "Париж (GMT+1)", "offset": "+1:00"},
            {"id": str(uuid.uuid4()), "name": "Берлин (GMT+1)", "offset": "+1:00"},
            {"id": str(uuid.uuid4()), "name": "Киев (GMT+2)", "offset": "+2:00"},
            {"id": str(uuid.uuid4()), "name": "Москва (GMT+3)", "offset": "+3:00"},
            {"id": str(uuid.uuid4()), "name": "Самара (GMT+4)", "offset": "+4:00"},
            {"id": str(uuid.uuid4()), "name": "Екатеринбург (GMT+5)", "offset": "+5:00"},
            {"id": str(uuid.uuid4()), "name": "Омск (GMT+6)", "offset": "+6:00"},
            {"id": str(uuid.uuid4()), "name": "Красноярск (GMT+7)", "offset": "+7:00"},
            {"id": str(uuid.uuid4()), "name": "Иркутск (GMT+8)", "offset": "+8:00"},
            {"id": str(uuid.uuid4()), "name": "Якутск (GMT+9)", "offset": "+9:00"},
            {"id": str(uuid.uuid4()), "name": "Владивосток (GMT+10)", "offset": "+10:00"},
            {"id": str(uuid.uuid4()), "name": "Магадан (GMT+11)", "offset": "+11:00"},
            {"id": str(uuid.uuid4()), "name": "Камчатка (GMT+12)", "offset": "+12:00"},
            {"id": str(uuid.uuid4()), "name": "Дубай (GMT+4)", "offset": "+4:00"},
            {"id": str(uuid.uuid4()), "name": "Сингапур (GMT+8)", "offset": "+8:00"},
            {"id": str(uuid.uuid4()), "name": "Токио (GMT+9)", "offset": "+9:00"},
            {"id": str(uuid.uuid4()), "name": "Нью-Йорк (GMT-5)", "offset": "-5:00"},
            {"id": str(uuid.uuid4()), "name": "Чикаго (GMT-6)", "offset": "-6:00"},
            {"id": str(uuid.uuid4()), "name": "Денвер (GMT-7)", "offset": "-7:00"},
            {"id": str(uuid.uuid4()), "name": "Лос-Анджелес (GMT-8)", "offset": "-8:00"},
        ]
        await db.custom_timezones.insert_many(default_timezones)
        logger.info("Created default timezones")

async def create_indexes(db):
    """Create database indexes for performance"""
    await db.events.create_index("start_time")
    await db.events.create_index("created_by")
    await db.users.create_index("email", unique=True)
    await db.day_ratings.create_index([("user_id", 1), ("date", 1)])
    await db.survey_responses.create_index([("user_id", 1), ("date", 1)])
