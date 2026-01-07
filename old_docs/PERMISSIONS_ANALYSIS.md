# 🔐 Анализ Проблемы Прав Доступа

## 🚨 Текущая Проблема

**Баг:** Пользователь `user@company.com` видит чужие события, хотя:
- ❌ Нет подписок на других пользователей (0 subscriptions)
- ❌ Нет прав доступа к чужим календарям (0 permissions)

**Результат:** Видит 11 событий вместо своих 0!

---

## 🔍 Анализ Логики (services/permissions.py)

### Текущий Алгоритм:

```python
for event in events:
    # 1. Свои события - показать
    if event_owner == user_id:
        show_event()
    
    # 2. Без календаря - показать (ПРОБЛЕМА!)
    if not calendar_id:
        show_event()  # ⚠️ Показывает ВСЕМ
    
    # 3. Есть права на календарь - показать
    if calendar_id in permitted_calendar_ids:
        show_event()
    
    # 4. Календарь публичный - показать (ПРОБЛЕМА!)
    if event_calendar.is_public:
        show_event()  # ⚠️ Показывает ВСЕМ
    
    # 5. Календарь приватный - "Занято"
    if event_calendar.is_private:
        show_busy()
```

### Проблемы:

**🔴 Проблема 1: Legacy события (без calendar_id)**
```python
if not calendar_id:
    filtered_events.append(event)  # Показывает ВСЕМ!
```

**Почему плохо:**
- Старые события без календаря видны ВСЕМ пользователям
- Нарушение приватности

**Пример:**
- Admin создал событие "Тестовая встреча" (calendar_id=null)
- User видит это событие, хотя не должен

---

**🔴 Проблема 2: Публичные календари**
```python
if event_calendar.is_public:
    filtered_events.append(event)  # Показывает ВСЕМ!
```

**Почему плохо:**
- Публичный календарь ≠ доступен всем
- Публичный = доступен подписчикам, а не всему миру
- User не подписан → не должен видеть

**Пример:**
- Admin@company.com имеет публичный календарь "Открытый"
- Событие "Созвон 1" в этом календаре
- User НЕ подписан на admin@company.com
- Но User ВИДИТ событие "Созвон 1" ❌

---

## 🎯 Правильная Логика Прав Доступа

### Вариант 1: Строгий (Рекомендую)

**Правило:** Пользователь видит событие, ТОЛЬКО если:
1. Он владелец события, ИЛИ
2. У него есть права на календарь, ИЛИ
3. Он подписан на владельца календаря И календарь публичный

```python
async def filter_events_by_permissions(events, user_id, db):
    # Get user's subscriptions
    subscriptions = await db.user_subscriptions.find(
        {"user_id": user_id}
    ).to_list(100)
    subscribed_user_ids = {s["target_user_id"] for s in subscriptions}
    
    # Get permissions
    permissions = await db.calendar_permissions.find(
        {"user_id": user_id}
    ).to_list(100)
    permitted_calendar_ids = {p["calendar_id"] for p in permissions}
    
    filtered = []
    
    for event in events:
        # 1. Own events - always show
        if event["created_by"] == user_id:
            filtered.append(event)
            continue
        
        calendar_id = event.get("calendar_id")
        
        # 2. No calendar - HIDE (not show to everyone!)
        if not calendar_id:
            continue  # ✅ Skip events without calendar
        
        # 3. Has explicit permission to calendar
        if calendar_id in permitted_calendar_ids:
            filtered.append(event)
            continue
        
        # 4. Check subscription + calendar publicity
        calendar = await db.calendars.find_one({"id": calendar_id})
        if not calendar:
            continue
        
        calendar_owner = calendar["user_id"]
        is_public = calendar.get("is_public", True)
        
        # User subscribed to calendar owner?
        if calendar_owner in subscribed_user_ids:
            if is_public:
                # Public calendar of subscribed user - show
                filtered.append(event)
            else:
                # Private calendar of subscribed user - show as "Занято"
                filtered.append(create_busy_event(event))
        # else: not subscribed - hide completely
    
    return filtered
```

**Логика:**
- ✅ Свои события - всегда видны
- ✅ События без календаря - СКРЫТЫ (не legacy!)
- ✅ Публичные календари - ТОЛЬКО если подписан на владельца
- ✅ Приватные календари - "Занято" если подписан
- ✅ Нет подписки - НЕ ВИДНО

---

### Вариант 2: Мягкий (Компромисс)

**Правило:** Legacy события (без calendar_id) видны только владельцу.

```python
# No calendar - show only to owner
if not calendar_id:
    if event["created_by"] == user_id:
        filtered.append(event)
    continue  # Hide from others
```

**Логика:**
- Публичные календари видны ВСЕМ (текущее поведение)
- Legacy события - только владельцу
- Подписки не обязательны

**Плюсы:**
- Минимальные изменения
- Обратная совместимость

**Минусы:**
- Публичные календари видны всем (может быть нежелательно)

---

### Вариант 3: С Fallback для Legacy

**Правило:** Legacy события видны всем, остальные - по подпискам.

```python
if not calendar_id:
    # Legacy event - show to everyone (backwards compatibility)
    filtered.append(event)
    continue

# For events with calendar - check subscriptions
if calendar_owner in subscribed_user_ids:
    # ... логика
else:
    continue  # Hide if not subscribed
```

---

## 📊 Сравнение Вариантов

| Критерий | Вариант 1 (Строгий) | Вариант 2 (Мягкий) | Вариант 3 (Legacy) |
|----------|---------------------|--------------------|--------------------|
| Legacy события | Скрыты от всех | Видны владельцу | Видны всем |
| Публичные календари | Только подписчикам | Всем | Подписчикам |
| Приватные календари | "Занято" подписчикам | "Занято" подписчикам | "Занято" подписчикам |
| Безопасность | 🔒🔒🔒 Высокая | 🔒🔒 Средняя | 🔒 Низкая |
| Обратная совместимость | ❌ Ломает старые события | ✅ Частично | ✅ Полная |

---

## 🎯 Моя Рекомендация

### ✅ Вариант 1 (Строгий) + Миграция Legacy

**Шаги:**

**1. Исправить логику permissions:**
```python
# Строгая проверка подписок
if not calendar_id:
    continue  # Hide events without calendar

# Public calendars only for subscribers
if calendar_owner in subscribed_user_ids:
    if is_public:
        show()
    else:
        show_busy()
else:
    continue  # Not subscribed - hide
```

**2. Мигрировать legacy события:**
```python
# Найти все события без calendar_id
legacy_events = await db.events.find({"calendar_id": None})

# Назначить им дефолтный календарь владельца
for event in legacy_events:
    owner_id = event["created_by"]
    default_cal = await db.calendars.find_one({
        "user_id": owner_id,
        "name": "Открытый",
        "is_default": True
    })
    
    if default_cal:
        await db.events.update_one(
            {"id": event["id"]},
            {"$set": {"calendar_id": default_cal["id"]}}
        )
```

**3. Создать тестовую подписку:**
```python
# User подписывается на Admin для тестирования
await db.user_subscriptions.insert_one({
    "id": str(uuid.uuid4()),
    "user_id": user_id,
    "target_user_id": admin_id,
    "created_at": datetime.now(timezone.utc).isoformat()
})
```

---

## 🔧 Дополнительные Улучшения

### 1. Batch Loading (убрать N+1)

**Текущая проблема:**
```python
for event in events:
    calendar = await db.calendars.find_one({"id": calendar_id})  # N+1!
```

**Решение:**
```python
# Load all calendars at once
calendar_ids = {e["calendar_id"] for e in events if e.get("calendar_id")}
calendars = await db.calendars.find(
    {"id": {"$in": list(calendar_ids)}}
).to_list(1000)
calendar_map = {c["id"]: c for c in calendars}

# Use map
for event in events:
    calendar = calendar_map.get(event["calendar_id"])
```

---

### 2. Упростить Логику Подписок

**Текущая система:**
- user_subscriptions (подписка на пользователя)
- calendar_permissions (права на календарь)

**Проблема:** Две системы запутывают

**Решение А: Только Subscriptions**
```python
# Убрать calendar_permissions
# Использовать только подписки
# Доступ = подписка на пользователя
```

**Решение Б: Только Permissions**
```python
# Убрать user_subscriptions
# Давать права на конкретные календари
# Более гранулярно, но сложнее UI
```

**Решение В: Гибридный (текущий, но исправленный)**
```python
# Оставить обе системы
# subscriptions - для простого "вижу коллегу"
# permissions - для детального контроля отдельных календарей
# Но исправить логику фильтрации!
```

---

## 📋 План Исправления (Пошаговый)

### Шаг 1: Исправить filter_events_by_permissions
- Добавить проверку подписок
- Скрыть события без calendar_id от чужих
- Публичные календари - только подписчикам

### Шаг 2: Мигрировать legacy события
- Назначить calendar_id всем событиям без него
- Использовать дефолтный календарь владельца

### Шаг 3: Оптимизировать (batch loading)
- Убрать N+1 запросы
- Загружать календари одним запросом

### Шаг 4: Тестирование
- User без подписок → видит только свои события
- User подписался на Admin → видит публичные события Admin
- User НЕ видит приватные события Admin (только "Занято")

---

## ❓ Вопросы к Тебе

1. **Legacy события (без calendar_id):**
   - A) Мигрировать в дефолтные календари? ✅ (рекомендую)
   - B) Оставить как есть и скрывать от чужих?
   - C) Удалить?

2. **Публичные календари:**
   - A) Видны только подписчикам? ✅ (рекомендую)
   - B) Видны всем в системе?

3. **Две системы прав:**
   - A) Оставить обе (subscriptions + permissions)? ✅ (текущее)
   - B) Убрать subscriptions, только permissions?
   - C) Убрать permissions, только subscriptions?

4. **Создание тестовой подписки:**
   - Создать подписку user → admin для тестирования?

---

## 🎯 Моя Итоговая Рекомендация

### ✅ Лучший Вариант:

**1. Исправить логику фильтрации:**
- Публичные календари → только подписчикам
- Legacy события → только владельцу
- Приватные календари подписчикам → "Занято"

**2. Мигрировать legacy события:**
- Назначить calendar_id = дефолтный календарь владельца

**3. Оптимизировать:**
- Batch loading календарей

**4. Для тестирования:**
- Создать подписку user → admin@company.com
- Создать подписку user → admin@example.com

**Результат:**
- ✅ Безопасность
- ✅ Логичная система прав
- ✅ Производительность
- ✅ Удобство тестирования

---

**Готов исправлять? Жду твоего подтверждения!** 🚀
