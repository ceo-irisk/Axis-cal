# 🧠 Анализ Архитектуры БД - Логика Решений и Улучшения

## 📌 Почему Сделал Именно Так?

### 1️⃣ **UUID вместо MongoDB ObjectId**

**Решение:**
```python
id: str = Field(default_factory=lambda: str(uuid.uuid4()))
```

**Почему:**
- ✅ **Простота на фронтенде** - не нужно обрабатывать ObjectId
- ✅ **JSON-сериализуемость** - не нужно преобразование
- ✅ **Кроссплатформенность** - UUID работает везде одинаково
- ✅ **Предсказуемость** - всегда строка, никаких сюрпризов

**Минусы:**
- ❌ UUID строки занимают больше места (36 байт vs 12 байт ObjectId)
- ❌ Хуже производительность индексов (строки vs бинарные данные)
- ❌ Потеря информации о времени создания (ObjectId содержит timestamp)

**Альтернатива:**
- ULID (Universally Unique Lexicographically Sortable ID) - сортируемые UUID с timestamp

---

### 2️⃣ **Отдельные Коллекции для Календарей**

**Решение:**
```
users → calendars (1:N)
calendars → events (1:N)
```

**Почему:**
- ✅ **Гибкость** - пользователь может иметь множество календарей
- ✅ **Права доступа** - можно дать доступ к конкретному календарю, а не ко всем
- ✅ **Группировка событий** - легко фильтровать по календарю
- ✅ **Визуальная кастомизация** - каждый календарь со своим цветом/иконкой

**Альтернатива (НЕ выбрана):**
```javascript
// Хранить всё в events с user_id
events: { user_id, calendar_type: "open" | "private" }
```
❌ Менее гибко для будущих фич (права, синхронизация)

---

### 3️⃣ **Две Системы Прав: Subscriptions + Permissions**

**Текущая архитектура:**

```
USER_SUBSCRIPTIONS (подписки на пользователей)
  user_id → target_user_id

CALENDAR_PERMISSIONS (права на календари)
  calendar_id → user_id → permission_level
```

**Почему ДВЕ системы:**

1. **User Subscriptions** - для простого сценария:
   - "Я хочу видеть календари коллеги"
   - Подписка на человека, а не на конкретные календари
   - Автоматически видишь все новые публичные календари

2. **Calendar Permissions** - для детального контроля:
   - "Дам доступ к конкретному календарю конкретному человеку"
   - Гранулярные права: read/edit/full
   - Не нужна подписка на всего пользователя

**Логика фильтрации (service/permissions.py):**
```python
if event_owner == user_id:
    show_full_event()
elif calendar_id in permitted_calendar_ids:
    show_full_event()
elif calendar.is_public and user_subscribed_to_owner:
    show_full_event()
elif calendar.is_private:
    show_busy_block()
```

**Проблема:**
- 🤔 Две похожие системы создают когнитивную нагрузку
- 🤔 Непонятно, что использовать в каких случаях

---

### 4️⃣ **События из Шаблонов - Реальные Документы**

**Решение:**
При применении шаблона → создаются реальные события в коллекции `events` с флагом:
```javascript
is_template_event: true
```

**Почему:**
- ✅ **Редактирование** - пользователь может изменить событие из шаблона
- ✅ **Удаление** - можно удалить одно событие, не трогая остальные
- ✅ **Унификация** - события из шаблонов не отличаются от обычных в запросах

**Минусы:**
- ❌ Дублирование данных (шаблон + события)
- ❌ При удалении шаблона события остаются (сироты)
- ❌ Нет связи template_id → события не знают, из какого шаблона созданы

**Альтернатива:**
```javascript
events: {
  template_id: "uuid",  // Если создано из шаблона
  is_template_instance: true
}
```

---

### 5️⃣ **Повторяющиеся События - Генерация на Лету**

**Решение:**
Одно событие в БД + генерация экземпляров при запросе:
```python
# В БД хранится одно событие
event = {
  recurrence_type: "weekly",
  recurrence_end_date: "2026-12-31"
}

# При запросе генерируются экземпляры
instances = generate_recurring_instances(event, start_date, end_date)
```

**Почему:**
- ✅ **Экономия места** - не нужно хранить 52 события для еженедельного
- ✅ **Простота изменения** - изменил одно событие → все экземпляры обновились
- ✅ **Производительность** - меньше записей в БД

**Минусы:**
- ❌ Нельзя изменить один экземпляр (например, перенести одну встречу)
- ❌ Нельзя отметить один экземпляр как завершенный
- ❌ Сложность исключений ("все, кроме 15 января")

**Альтернатива (Google Calendar подход):**
```javascript
// Родительское событие
parent_event = { id: "recurring-1", recurrence: "RRULE:FREQ=WEEKLY" }

// Модифицированные экземпляры
instance_exception = { 
  id: "recurring-1-20260115",
  parent_id: "recurring-1",
  start_time: "modified_time" 
}
```

---

### 6️⃣ **Datetime в Строках (ISO 8601), а не Date**

**Решение:**
```javascript
start_time: "2026-01-10T10:00:00Z"  // Строка
```

**Почему:**
- ✅ **MongoDB BSON Date проблемы** - при сериализации в JSON теряется таймзона
- ✅ **Явность** - строка с Z на конце = UTC, всегда понятно
- ✅ **Отладка** - легко читать в БД, не нужно конвертировать

**Минусы:**
- ❌ Запросы по диапазонам дат работают как string comparison
- ❌ Нет встроенной валидации MongoDB для дат
- ❌ Больше размер (строка vs BSON Date)

**Почему НЕ BSON Date:**
```python
# BSON Date в MongoDB
date = datetime.now(timezone.utc)
await db.events.insert_one({"date": date})

# При выдаче в JSON
response = await db.events.find_one({})
print(response["date"])  # datetime объект
# FastAPI сериализует как "2026-01-10T10:00:00+00:00"
# Но могут быть проблемы с таймзонами
```

---

### 7️⃣ **Нормализация vs Денормализация**

**Решение: Смешанный подход**

**Нормализовано:**
```javascript
events: { calendar_id: "uuid" }  // Связь через ID
calendars: { user_id: "uuid" }
```

**Денормализовано:**
```javascript
events: { 
  attendees: ["email1", "email2"],  // Массив email, не ID
  created_by: "user_id"             // Дублируем user_id, хотя есть calendar → user
}
```

**Почему такой микс:**
- ✅ **Производительность чтения** - не нужен JOIN для created_by
- ✅ **Гибкость attendees** - участники могут не быть пользователями системы
- ✅ **Быстрые запросы** - "все события пользователя" без JOIN

**Минусы:**
- ❌ Если пользователь меняет email - нужно обновлять в attendees везде
- ❌ Дублирование created_by (есть через calendar_id → user_id)

---

## 🚨 Что НЕ ТАК (Честная Критика)

### ❌ **Проблема 1: Дублирование Данных**

**Пример:**
```javascript
// Коллекция applied_templates (Legacy)
applied_templates: { user_id, date, template_id }

// И одновременно
events: { is_template_event: true, ... }
```

**Проблема:**
- Две системы делают одно и то же
- applied_templates не используется
- Коллекция-призрак занимает место

**Решение:**
Удалить applied_templates, использовать только events с флагом.

---

### ❌ **Проблема 2: N+1 Запросы в Фильтре Прав**

**Текущий код (services/permissions.py):**
```python
for event in events:
    calendar = await db.calendars.find_one({"id": event.calendar_id})
    # Для каждого события - отдельный запрос к БД!
```

**Проблема:**
- 100 событий = 100 запросов к БД
- Медленно при больших выборках

**Решение:**
```python
# Собрать все calendar_id
calendar_ids = {e["calendar_id"] for e in events if e.get("calendar_id")}

# Один запрос для всех
calendars = await db.calendars.find(
    {"id": {"$in": list(calendar_ids)}}
).to_list(1000)

calendar_map = {c["id"]: c for c in calendars}

# Быстрая фильтрация
for event in events:
    calendar = calendar_map.get(event.calendar_id)
```

---

### ❌ **Проблема 3: Нет Транзакций**

**Пример проблемного сценария:**
```python
# Применение шаблона
await db.events.delete_many({"is_template_event": True, "date": date})
await db.events.insert_many(new_events)
```

**Проблема:**
Если `insert_many` упадет → старые события удалены, новые не созданы = потеря данных.

**Решение:**
```python
async with await client.start_session() as session:
    async with session.start_transaction():
        await db.events.delete_many({...}, session=session)
        await db.events.insert_many(new_events, session=session)
```

**Почему НЕ используется:**
- MongoDB транзакции требуют replica set
- Локальная MongoDB в dev режиме - standalone
- Для production - обязательно нужно

---

### ❌ **Проблема 4: События не Знают о Шаблонах**

**Текущая схема:**
```javascript
templates: { id, name, events: [...] }
events: { is_template_event: true }  // Но нет template_id!
```

**Проблема:**
- Невозможно узнать, из какого шаблона создано событие
- Нельзя показать "события созданы из шаблона X"
- При удалении шаблона события становятся сиротами

**Решение:**
```javascript
events: {
  is_template_event: true,
  template_id: "template-uuid",  // Добавить!
  applied_date: "2026-01-10"
}
```

---

### ❌ **Проблема 5: Две Системы Прав Запутаны**

**Текущая логика:**
```
user_subscriptions: Подписка на человека
calendar_permissions: Права на календарь
```

**Проблема:**
Пользователю непонятно:
- Подписаться на коллегу или дать ему права?
- Что если подписка есть, а календарь закрыли?
- Зачем две системы для одной задачи?

**Решение 1 (Упростить):**
Оставить только `calendar_permissions`:
```javascript
// Убрать user_subscriptions
// Использовать только calendar_permissions
permissions: {
  calendar_id,
  user_id,
  permission_level: "view" | "edit" | "full"
}
```

**Решение 2 (Унифицировать):**
```javascript
access_rules: {
  resource_type: "calendar" | "user",
  resource_id: "uuid",
  granted_to_user_id: "uuid",
  access_level: "view_public" | "view_all" | "edit"
}
```

---

### ❌ **Проблема 6: Отсутствие Истории Изменений**

**Текущая схема:**
```javascript
events: { 
  created_at: "...",
  updated_at: "..."  // Только последнее изменение
}
```

**Проблема:**
- Нельзя понять, кто и когда изменил событие
- Нельзя откатить изменения
- Нет аудита

**Решение (Event Sourcing):**
```javascript
event_history: {
  event_id: "uuid",
  version: 1,
  changed_by: "user-uuid",
  changed_at: "...",
  changes: {
    field: "start_time",
    old_value: "10:00",
    new_value: "11:00"
  }
}
```

---

### ❌ **Проблема 7: Нет Каскадного Удаления**

**Проблема:**
Удаляя пользователя, нужно вручную удалять:
- Его календари
- Его события
- Его подписки
- Его шаблоны
- Его рейтинги

**Текущая ситуация:**
Нет автоматики → можно забыть → orphaned data.

**Решение:**
```python
async def delete_user_cascade(user_id: str):
    async with await client.start_session() as session:
        async with session.start_transaction():
            await db.events.delete_many({"created_by": user_id}, session=session)
            await db.calendars.delete_many({"user_id": user_id}, session=session)
            await db.user_subscriptions.delete_many(
                {"$or": [{"user_id": user_id}, {"target_user_id": user_id}]},
                session=session
            )
            # ... и так далее
            await db.users.delete_one({"id": user_id}, session=session)
```

---

### ❌ **Проблема 8: Повторяющиеся События Негибкие**

**Проблема:**
```javascript
event: { recurrence_type: "weekly" }
```

Нельзя:
- Перенести одну встречу
- Отменить один экземпляр
- Отметить один экземпляр завершенным

**Решение (Google Calendar подход):**
```javascript
// Базовое событие
recurring_event: {
  id: "rec-1",
  recurrence_rule: "FREQ=WEEKLY;BYDAY=MO"
}

// Исключения
recurring_exceptions: {
  parent_id: "rec-1",
  exception_date: "2026-01-20",
  action: "cancel" | "reschedule",
  new_start_time: "..."  // Если reschedule
}
```

---

## ✅ Что ХОРОШО (Похвалить Себя)

### 1️⃣ **Модульная Структура Бэкенда**

```
/routes  - API endpoints
/models  - Pydantic models
/services - Business logic
```

✅ Легко поддерживать  
✅ Масштабируемо  
✅ Тестируемо

---

### 2️⃣ **Индексы на Критичных Полях**

```javascript
db.events.createIndex({ start_time: 1 })
db.events.createIndex({ created_by: 1 })
db.users.createIndex({ email: 1 }, { unique: true })
```

✅ Быстрые запросы по датам  
✅ Быстрая аутентификация

---

### 3️⃣ **Система Прав с Фильтром "Занято"**

```python
filter_events_by_permissions(events, user_id, db)
```

✅ Приватность защищена  
✅ Информация о занятости доступна  
✅ Гибкое управление доступом

---

### 4️⃣ **UTC Везде**

```python
datetime.now(timezone.utc)
```

✅ Нет проблем с таймзонами  
✅ Конвертация на фронтенде  
✅ Простота отладки

---

## 🎯 Что Я Бы УЛУЧШИЛ (Приоритеты)

### 🔴 **Критично (Сделать СЕЙЧАС)**

**1. Добавить template_id в события из шаблонов**
```python
event_dict["template_id"] = template_id if from_template else None
```
Зачем: Связать события с шаблонами, уметь фильтровать.

**2. Оптимизировать фильтр прав (убрать N+1)**
```python
# Batch loading календарей
calendar_map = await load_calendars_batch(calendar_ids)
```
Зачем: Производительность при больших выборках.

**3. Удалить коллекцию applied_templates**
```python
await db.applied_templates.drop()
```
Зачем: Убрать технический долг, не используется.

---

### 🟡 **Важно (Сделать в Течение Месяца)**

**4. Унифицировать системы прав**
Выбрать один подход: либо subscriptions, либо permissions, либо единая система.

**5. Добавить транзакции для критичных операций**
```python
# Применение шаблона
# Удаление пользователя
# Перенос событий между календарями
```

**6. Реализовать исключения для повторяющихся событий**
```javascript
recurring_exceptions: { parent_id, exception_date, action }
```

---

### 🟢 **Хорошо бы (Фичи на Будущее)**

**7. Event Sourcing для аудита**
```javascript
event_history: { event_id, version, changes, changed_by }
```

**8. Каскадное удаление**
```python
async def delete_user_cascade(user_id): ...
```

**9. Миграция на ULID вместо UUID**
```python
id = str(ulid.create())  # Сортируемые ID с timestamp
```

**10. Soft delete везде**
```javascript
deleted_at: null | "2026-01-10T..."
```
Вместо физического удаления.

---

## 📊 Итоговая Оценка Архитектуры

### Сильные Стороны (7/10):
✅ Модульность  
✅ Гибкость прав доступа  
✅ Поддержка повторяющихся событий  
✅ Хорошие индексы  
✅ UTC timezone management  

### Слабые Стороны (3/10):
❌ N+1 запросы  
❌ Дублирование данных  
❌ Две системы прав запутаны  
❌ Нет транзакций  
❌ Негибкие повторяющиеся события  
❌ Нет истории изменений  

---

## 🎓 Выводы

### Почему сделал именно так:
1. **Скорость разработки** - быстрый старт с MongoDB
2. **Гибкость NoSQL** - легко добавлять поля
3. **Простота для фронтенда** - UUID, JSON-friendly
4. **Базовые фичи работают** - календарь, события, права

### Что бы сделал иначе, зная сейчас:
1. **Одна система прав** вместо двух
2. **Batch loading** с самого начала
3. **Транзакции** для критичных операций
4. **Template_id в событиях** сразу
5. **Исключения для recurring events** изначально

### Философия:
> "Make it work, make it right, make it fast"

Текущее состояние: **"It works"** ✅  
Следующий шаг: **"Make it right"** 🔧  
Будущее: **"Make it fast"** ⚡

---

**Архитектура не идеальна, но она функциональна, понятна и масштабируема.**  
**Главное - она решает задачи пользователя и легко улучшается по мере роста.**
