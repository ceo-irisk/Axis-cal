# 📊 Архитектура Базы Данных - Календарь "Axis"

## 🗂️ Обзор

**База данных:** MongoDB  
**Всего коллекций:** 12  
**Тип:** NoSQL документо-ориентированная

---

## 📋 Основные Коллекции и Их Связи

### 1️⃣ **USERS** (Пользователи)
Центральная коллекция для управления пользователями.

```javascript
{
  id: "uuid",                    // Уникальный идентификатор
  email: "admin@example.com",    // Email (unique)
  name: "Администратор",          // Имя пользователя
  role: "admin" | "user",        // Роль пользователя
  timezone: "Europe/Moscow",     // Часовой пояс
  is_active: true,               // Активен ли пользователь
  created_at: "2026-01-01T...",  // Дата создания
  password: "hashed_password"    // Хешированный пароль (bcrypt)
}
```

**Связи:**
- `users.id` → `events.created_by` (создатель события)
- `users.id` → `calendars.user_id` (владелец календаря)
- `users.id` → `templates.created_by` (создатель шаблона)
- `users.id` → `user_subscriptions.user_id` (подписчик)
- `users.id` → `user_subscriptions.target_user_id` (цель подписки)

**Индексы:**
- `email` (unique) - для быстрого поиска по email при логине

---

### 2️⃣ **EVENTS** (События)
Хранит все события календаря с поддержкой повторяющихся событий.

```javascript
{
  id: "uuid",                           // Уникальный идентификатор
  title: "Встреча с командой",          // Название события
  description: "Обсуждение проекта",    // Описание
  start_time: "2026-01-10T10:00:00Z",   // Время начала (UTC)
  end_time: "2026-01-10T11:00:00Z",     // Время окончания (UTC)
  event_type: "meeting",                // Тип события
  status: "confirmed",                  // Статус (confirmed/tentative/cancelled)
  color: "#8b5cf6",                     // Цвет события
  pattern: null,                        // Паттерн для tentative событий
  location: "Офис",                     // Место проведения
  attendees: ["user@example.com"],      // Список участников
  
  // Связь с календарем
  calendar_id: "calendar-uuid",         // ID календаря (FK → calendars.id)
  created_by: "user-uuid",              // Создатель (FK → users.id)
  
  // Флаги
  is_all_day: false,                    // Событие на весь день
  is_template_event: false,             // Событие из шаблона  / Есть явное ощущение что это надо переделать
  is_blocked: false,                    // Заблокировано
  is_completed: false,                  // Завершено
  is_urgent: false,                     // Срочное
  is_video_call: false,                 // Видеозвонок
  
  // Повторяющиеся события
  recurrence_type: "weekly",            // Тип повторения (daily/weekly/monthly/yearly/custom_days)
  recurrence_end_date: "2026-12-31",    // Дата окончания повторения
  recurrence_parent_id: null,           // ID родительского события (для экземпляров)
  recurrence_custom_days: ["monday"],   // Дни недели для custom_days
  
  // Внешние календари (ICS)
  external_calendar_id: null,
  external_event_id: null,
  
  // Метаданные
  custom_fields: {},                    // Кастомные поля
  created_at: "2026-01-01T...",
  updated_at: "2026-01-01T..."
}
```

**Связи:**
- `events.created_by` → `users.id`
- `events.calendar_id` → `calendars.id`
- `events.recurrence_parent_id` → `events.id` (для экземпляров повторяющихся событий)

**Индексы:**
- `start_time` - для быстрых запросов по датам
- `created_by` - для фильтрации событий пользователя

**Особенности:**
- Все datetime хранятся в формате ISO 8601 с UTC timezone
- Повторяющиеся события хранятся как один документ + генерируются экземпляры на лету

---

### 3️⃣ **CALENDARS** (Календари)
Календари пользователей с настройками доступа.

```javascript
{
  id: "uuid",
  user_id: "user-uuid",              // Владелец (FK → users.id)
  name: "Открытый" | "Закрытый",     // Название календаря
  provider: "custom",                // Провайдер (google/yandex/custom)
  color: "#085C53",                  // Цвет календаря
  icon: "book-open" | "lock",        // Иконка (lucide-react)
  
  // Настройки видимости
  is_default: true,                  // Дефолтный календарь
  is_public: true,                   // Публичный/Закрытый
  is_active: true,                   // Активен
  
  // Синхронизация
  sync_enabled: false,
  provider: "custom",
  credentials: {},                   // Креды для внешних провайдеров
  last_synced: null
}
```

**Связи:**
- `calendars.user_id` → `users.id`
- `calendars.id` → `events.calendar_id`
- `calendars.id` → `calendar_permissions.calendar_id`

**Логика работы:**
- Каждый пользователь при создании получает 2 дефолтных календаря: "Открытый" и "Закрытый"
- События из закрытых календарей других пользователей отображаются как "Занято" (grey block)

---

### 4️⃣ **CALENDAR_PERMISSIONS** (Права доступа к календарям)
⚠️ **Коллекция существует в коде, но не видна в БД** (пока нет данных)

```javascript
{
  id: "uuid",
  calendar_id: "calendar-uuid",      // Календарь (FK → calendars.id)
  user_id: "user-uuid",              // Пользователь с доступом (FK → users.id)
  permission_level: "read" | "edit" | "full",  // Уровень доступа
  granted_by: "admin-uuid",          // Кто выдал доступ (FK → users.id)
  created_at: "2026-01-01T..."
}
```

**Связи:**
- `calendar_permissions.calendar_id` → `calendars.id`
- `calendar_permissions.user_id` → `users.id`
- `calendar_permissions.granted_by` → `users.id`

**Логика:**
- Владелец календаря может выдавать права другим пользователям
- Уровни доступа:
  - `read` - только просмотр
  - `edit` - редактирование событий
  - `full` - полный доступ (включая управление правами)

---

### 5️⃣ **USER_SUBSCRIPTIONS** (Подписки на пользователей)
Система подписок для просмотра календарей других пользователей.

```javascript
{
  id: "uuid",
  user_id: "user1-uuid",             // Кто подписался (FK → users.id)
  target_user_id: "user2-uuid",      // На кого подписался (FK → users.id)
  created_at: "2026-01-01T..."
}
```

**Связи:**
- `user_subscriptions.user_id` → `users.id`
- `user_subscriptions.target_user_id` → `users.id`

**Логика:**
- Пользователь подписывается на другого пользователя
- После подписки видит все публичные календари target_user
- События из закрытых календарей отображаются как "Занято"

---

### 6️⃣ **TEMPLATES** (Шаблоны дней)
Шаблоны для быстрого создания событий на день.

```javascript
{
  id: "uuid",
  name: "Рабочий день",
  template_type: "day",              // day или week (week устарел)
  events: [                          // Массив шаблонов событий
    {
      title: "Утренняя встреча",
      start_time: "09:00",           // Относительное время
      end_time: "10:00",
      event_type: "meeting",
      description: "...",
      location: "..."
    }
  ],
  is_active: true,
  created_by: "user-uuid",           // FK → users.id
  created_at: "2026-01-01T..."
}
```

**Связи:**
- `templates.created_by` → `users.id`

**Логика:**
- При применении шаблона создаются реальные события в коллекции `events` с флагом `is_template_event: true`
- Удаление старых template events происходит при применении нового шаблона на ту же дату

---

### 7️⃣ **EVENT_TYPES** (Справочник типов событий)
Настраиваемые типы событий с цветами.

```javascript
{
  id: "default-meeting",
  name: "meeting",                   // Системное имя
  label: "Встреча",                  // Отображаемое название
  color: "#8b5cf6",                  // Hex цвет
  order: 0,                          // Порядок сортировки
  is_active: true
}
```

**Дефолтные типы:**
- meeting (Встреча) - #8b5cf6
- call (Звонок) - #06b6d4
- personal (Личное) - #f59e0b
- urgent (Срочно) - #ef4444
- travel (Поездка) - #10b981
- deep_work (Глубокая работа) - #6366f1

---

### 8️⃣ **DAY_RATINGS** (Оценки дней)
Система оценки продуктивности дней.

```javascript
{
  id: "uuid",
  user_id: "user-uuid",              // FK → users.id
  date: "2026-01-10",                // Дата (YYYY-MM-DD)
  rating: 4,                         // Оценка (1-5)
  notes: "Хороший продуктивный день",
  created_at: "2026-01-01T..."
}
```

**Индексы:**
- `(user_id, date)` - композитный индекс для быстрого поиска

---

### 9️⃣ **SURVEY_QUESTIONS** (Вопросы опроса)
Настраиваемые вопросы для опроса в конце дня.

```javascript
{
  id: "uuid",
  question: "Как вы оцениваете продуктивность?",
  question_type: "scale" | "text" | "choice",
  options: ["1", "2", "3", "4", "5"],  // Для scale/choice
  order: 1,                            // Порядок отображения
  is_active: true
}
```

---

### 🔟 **SURVEY_RESPONSES** (Ответы на опросы)

```javascript
{
  id: "uuid",
  user_id: "user-uuid",              // FK → users.id
  date: "2026-01-10",
  responses: {                       // Ключ = question_id, значение = ответ
    "question-uuid-1": "5",
    "question-uuid-2": "Выполнил все задачи"
  },
  ai_summary: null,                  // Для будущей интеграции с AI
  created_at: "2026-01-01T..."
}
```

**Индексы:**
- `(user_id, date)` - композитный индекс

---

### 1️⃣1️⃣ **DAY_RULES** (Правила дня)
Правила для контроля нагрузки.

```javascript
{
  id: "uuid",
  name: "Максимум встреч",
  description: "Максимальное количество встреч в день",
  rule_type: "max_meetings" | "min_break" | "max_hours",
  value: 8,                          // Числовое значение правила
  is_active: true
}
```

**Типы правил:**
- `max_meetings` - максимум встреч в день
- `min_break` - минимальный перерыв между встречами (минуты)
- `max_hours` - максимум рабочих часов в день

---

### 1️⃣2️⃣ **ICS_SUBSCRIPTIONS** (ICS подписки)
Подписки на внешние календари (Google, Yandex, iCal).

```javascript
{
  id: "uuid",
  user_id: "user-uuid",              // FK → users.id
  url: "https://calendar.google.com/...",
  name: "Google Calendar",
  color: "#6366f1",
  is_active: true,
  last_synced: "2026-01-01T...",
  created_at: "2026-01-01T..."
}
```

**Особенности:**
- События из ICS не сохраняются в БД
- Генерируются на лету при запросе
- Read-only (только чтение)

---

## 🔗 Диаграмма Связей

```
┌─────────────────┐
│     USERS       │ (Центральная таблица)
│  - id (PK)      │
│  - email        │
│  - role         │
└────────┬────────┘
         │
         ├─────────────────────────────────────────┐
         │                                         │
         ▼                                         ▼
┌─────────────────┐                      ┌─────────────────┐
│    CALENDARS    │                      │     EVENTS      │
│  - id (PK)      │◄─────────────────────│  - id (PK)      │
│  - user_id (FK) │                      │  - calendar_id  │
│  - is_public    │                      │  - created_by   │
│  - is_default   │                      │  - start_time   │
└────────┬────────┘                      └─────────────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│ CALENDAR_        │  │ USER_            │
│ PERMISSIONS      │  │ SUBSCRIPTIONS    │
│  - calendar_id   │  │  - user_id (FK)  │
│  - user_id (FK)  │  │  - target_user   │
│  - permission    │  │                  │
└──────────────────┘  └──────────────────┘

     USERS
       │
       ├──────────► TEMPLATES (created_by)
       │
       ├──────────► DAY_RATINGS (user_id)
       │
       ├──────────► SURVEY_RESPONSES (user_id)
       │
       └──────────► ICS_SUBSCRIPTIONS (user_id)
```

---

## 🔐 Система Прав Доступа

### Логика отображения событий:

1. **Свои события** → Всегда видны полностью
2. **События из публичных календарей** → Видны полностью
3. **События из закрытых календарей других** → Показываются как "Занято" (grey block)
4. **События с предоставленными правами** → Видны согласно уровню доступа

**Реализация:**
- Функция `filter_events_by_permissions()` в `/app/backend/services/permissions.py`
- Проверяет:
  1. Владелец события?
  2. Есть ли подписка на пользователя?
  3. Календарь публичный?
  4. Есть ли явные права на календарь?

---

## ⚡ Оптимизация

### Индексы для производительности:

```javascript
// users
db.users.createIndex({ email: 1 }, { unique: true })

// events
db.events.createIndex({ start_time: 1 })
db.events.createIndex({ created_by: 1 })

// ratings/surveys
db.day_ratings.createIndex({ user_id: 1, date: 1 })
db.survey_responses.createIndex({ user_id: 1, date: 1 })
```

---

## 📦 Важные Особенности

### 1. UUID вместо ObjectId
- Все документы используют UUID строки как ID
- **Критично:** Всегда удаляем `_id` после `insert_one()` для JSON сериализации

### 2. Timezone Management
- Все datetime в БД хранятся в UTC (ISO 8601)
- Конвертация в локальное время происходит на фронтенде
- Каждый пользователь имеет настройку timezone

### 3. Дефолтные данные при старте
- Создаются дефолтные типы событий
- Создаются дефолтные вопросы опроса
- Создаются дефолтные правила дня
- При создании пользователя → 2 календаря ("Открытый" + "Закрытый")

### 4. Soft Delete
- Некоторые сущности не удаляются физически
- Используется флаг `is_active: false`
- Пример: event_types, day_rules

---

## 🎯 Будущие Возможности (На основе схемы)

### Запланированные интеграции:
1. **Google Calendar** (sync_enabled, provider, credentials)
2. **Yandex Calendar** (sync_enabled, provider, credentials)
3. **Bitrix24 CRM** (external_calendar_id)
4. **AI анализ** (ai_summary в survey_responses)

### Кастомизация:
- custom_fields в events - для будущих кастомных полей
- event_field_config - настройка кастомных полей (коллекция существует в коде)

---

## 📊 Текущее Состояние БД

```
users:              3 документа
calendars:         13 документов (3 пользователя × 2-4 календаря)
events:             9 документов
templates:          3 документа
event_types:        9 типов (6 дефолтных + 3 кастомных)
user_subscriptions: 1 подписка
day_ratings:        3 оценки
survey_questions:  13 вопросов
survey_responses:   3 ответа
day_rules:          3 правила
ics_subscriptions:  0 (пока не используется)
```

---

## 🔧 Для Разработчиков

### Важные паттерны:

1. **Создание события:**
```python
event_dict["calendar_id"] = calendar_id  # Связь с календарем
event_dict["created_by"] = user["id"]    # Владелец
event_dict["created_at"] = datetime.now(timezone.utc).isoformat()
await db.events.insert_one(event_dict)
event_dict.pop('_id', None)  # КРИТИЧНО!
```

2. **Фильтрация по правам:**
```python
events = await db.events.find({...}).to_list(1000)
filtered = await filter_events_by_permissions(events, user_id, db)
```

3. **Запрос без _id:**
```python
await db.users.find({}, {"_id": 0, "password": 0})
```

---

Это полная архитектура вашей базы данных! 🎉
