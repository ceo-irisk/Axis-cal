#!/usr/bin/env python3
"""
Миграция legacy событий: назначение calendar_id
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def migrate_legacy_events():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("🔄 Миграция legacy событий (без calendar_id)...")
    
    # Find events without calendar_id
    legacy_events = await db.events.find({
        "$or": [
            {"calendar_id": None},
            {"calendar_id": {"$exists": False}}
        ]
    }).to_list(10000)
    
    print(f"📋 Найдено {len(legacy_events)} событий без calendar_id")
    
    migrated_count = 0
    
    for event in legacy_events:
        owner_id = event.get("created_by")
        if not owner_id:
            print(f"⚠️  Событие {event['id']} без владельца, пропускаем")
            continue
        
        # Find default "Открытый" calendar for owner
        default_calendar = await db.calendars.find_one({
            "user_id": owner_id,
            "name": "Открытый",
            "is_default": True
        })
        
        if default_calendar:
            await db.events.update_one(
                {"id": event["id"]},
                {"$set": {"calendar_id": default_calendar["id"]}}
            )
            migrated_count += 1
            print(f"  ✓ {event['title'][:40]:40} → calendar: Открытый")
        else:
            print(f"  ⚠️ Нет дефолтного календаря для пользователя {owner_id[:8]}...")
    
    print(f"\n✅ Мигрировано {migrated_count}/{len(legacy_events)} событий")
    
    # Verify
    remaining = await db.events.count_documents({
        "$or": [
            {"calendar_id": None},
            {"calendar_id": {"$exists": False}}
        ]
    })
    
    if remaining == 0:
        print("✅ Все события теперь имеют calendar_id")
    else:
        print(f"⚠️  Осталось {remaining} событий без calendar_id")
    
    client.close()
    print("\n🎉 Миграция завершена!")

if __name__ == "__main__":
    asyncio.run(migrate_legacy_events())
