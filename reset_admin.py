import asyncio
import sys
sys.path.insert(0, '/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

# Load environment
load_dotenv(Path('/app/backend/.env'))

async def reset_admin():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Удаляем старого админа
    result = await db.users.delete_one({"email": "admin@company.com"})
    print(f"✅ Удалено пользователей: {result.deleted_count}")
    
    # Также удаляем все календари этого пользователя (если знаем user_id)
    # Но так как мы удалили пользователя, проще удалить все дефолтные календари
    calendars_result = await db.calendars.delete_many({
        "name": {"$in": ["Открытый", "Закрытый"]},
        "is_default": True
    })
    print(f"✅ Удалено дефолтных календарей: {calendars_result.deleted_count}")
    
    client.close()
    print("\n🔄 Теперь перезапустите backend: sudo supervisorctl restart backend")

if __name__ == "__main__":
    asyncio.run(reset_admin())
