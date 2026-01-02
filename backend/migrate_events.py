#!/usr/bin/env python3
"""
Миграция БД: Обновление структуры событий
- is_template_event → status="template"
- Удаление устаревших полей
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def migrate_events():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("🔄 Начало миграции событий...")
    
    # 1. Мигрировать is_template_event → status="template"
    template_events = await db.events.find({"is_template_event": True}).to_list(10000)
    print(f"📋 Найдено {len(template_events)} шаблонных событий")
    
    for event in template_events:
        await db.events.update_one(
            {"id": event["id"]},
            {"$set": {"status": "template"}}
        )
    print(f"✅ Обновлено {len(template_events)} событий: is_template_event → status='template'")
    
    # 2. Удалить устаревшие поля из всех событий
    removed_fields = [
        "is_template_event",
        "is_unconfirmed",
        "pattern"
    ]
    
    unset_dict = {field: "" for field in removed_fields}
    
    result = await db.events.update_many(
        {},
        {"$unset": unset_dict}
    )
    print(f"✅ Удалены устаревшие поля из {result.modified_count} документов")
    
    # 3. Проверка результата
    print("\n📊 Статистика после миграции:")
    
    total = await db.events.count_documents({})
    confirmed = await db.events.count_documents({"status": "confirmed"})
    tentative = await db.events.count_documents({"status": "tentative"})
    template = await db.events.count_documents({"status": "template"})
    
    print(f"  Всего событий: {total}")
    print(f"  - Согласовано (confirmed): {confirmed}")
    print(f"  - Не согласовано (tentative): {tentative}")
    print(f"  - Шаблон (template): {template}")
    
    # Проверка, что старые поля удалены
    sample = await db.events.find_one({})
    if sample:
        has_old_fields = any(field in sample for field in removed_fields)
        if has_old_fields:
            print("⚠️  ВНИМАНИЕ: Некоторые старые поля еще присутствуют!")
        else:
            print("✅ Все старые поля успешно удалены")
    
    client.close()
    print("\n🎉 Миграция завершена успешно!")

if __name__ == "__main__":
    asyncio.run(migrate_events())
