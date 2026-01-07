# 📋 Axis Calendar v0.09 Pre-Beta Release Notes

**Release Date**: 2026-01-07  
**Status**: 🚧 In Progress

---

## 🎯 Цели релиза

Улучшение архитектуры, производительности и пользовательского опыта:
- Упрощение системы прав доступа
- Добавление защиты данных (транзакции)
- Улучшение работы с шаблонами
- Гибкость повторяющихся событий
- Оптимизация производительности

---

## ✅ Реализованные Изменения

### 1. 🔐 Безопасное Управление Администратором
**Статус**: ✅ Завершено

**Изменения**:
- Автоматическое создание администратора из переменных окружения
- Креденшелы в `.env` (не хардкод в коде)
- Идемпотентность (повторный запуск безопасен)
- Автоматическое создание дефолтных календарей

**Файлы**:
- `backend/services/init_data.py` - добавлено чтение из `os.environ`
- `backend/.env` - добавлены `ADMIN_EMAIL` и `ADMIN_PASSWORD`
- `backend/.env.example` - шаблон для новых установок
- `.gitignore` - обновлен для защиты `.env`

**Документация**:
- `ADMIN_USER_SETUP.md` - инструкции по управлению пользователями
- `SECURITY.md` - рекомендации по безопасности
- `README.md` - обновлен quick start

---

### 2. 🏷️ Template ID для События из Шаблонов
**Статус**: 🚧 В процессе

**Проблема**: События из шаблонов не связаны с источником

**Решение**: 
- Добавлено поле `template_id` в модель Event
- При применении шаблона сохраняется ID источника
- Frontend отображает источник шаблона в форме события

**Файлы**:
- [ ] `backend/models/event.py` - добавлено поле `template_id`
- [ ] `backend/routes/templates.py` - сохранение `template_id` при применении
- [ ] `frontend/src/components/EventModal.jsx` - отображение поля "Шаблон"

**API Changes**:
```javascript
// До
event: { status: "template" }

// После
event: { 
  status: "template",
  template_id: "uuid-шаблона",
  template_name: "Рабочий день"  // Для удобства отображения
}
```

---

### 3. 🗑️ Удаление Системы Подписок
**Статус**: ⏳ Ожидает выполнения

**Проблема**: Две системы прав (subscriptions + permissions) запутывают пользователей

**Решение**: 
- Полное удаление `user_subscriptions`
- Оставляем только `calendar_permissions`

**Файлы для изменения**:
- [ ] `backend/routes/calendars.py` - удалить subscriptions_router
- [ ] `backend/routes/other.py` - удалить зависимости от подписок
- [ ] `backend/services/permissions.py` - упростить логику фильтрации
- [ ] MongoDB - удалить коллекцию `user_subscriptions`

**Breaking Changes**: API эндпоинты `/api/subscriptions/*` будут удалены

---

### 4. 🔒 Транзакции для Критических Операций
**Статус**: ⏳ Ожидает выполнения

**Проблема**: Риск потери данных при сбоях между операциями

**Решение**: 
- MongoDB транзакции для атомарности операций
- Применение шаблона (delete + insert)
- Удаление пользователя (каскадное)
- Перенос событий между календарями

**Файлы**:
- [ ] `backend/routes/templates.py` - транзакции для apply_template
- [ ] `backend/routes/users.py` - каскадное удаление
- [ ] `backend/routes/events.py` - массовые операции

**Технические требования**:
- MongoDB Replica Set (для транзакций)
- Graceful degradation для standalone MongoDB

---

### 5. 🔄 Исключения для Повторяющихся Событий
**Статус**: ⏳ Ожидает выполнения

**Проблема**: Невозможно изменить/отменить один экземпляр повторяющегося события

**Решение**: 
- Новая коллекция `recurring_exceptions`
- Действия: cancel, reschedule, modify
- Frontend: drag-and-drop одного экземпляра

**Файлы**:
- [ ] `backend/models/event.py` - модель RecurringException
- [ ] `backend/routes/events.py` - CRUD для исключений
- [ ] `backend/services/recurrence.py` - учет исключений при генерации
- [ ] `frontend/src/components/CalendarGrid.jsx` - обработка drag одного экземпляра

**Schema**:
```javascript
recurring_exceptions: {
  id: "uuid",
  parent_event_id: "uuid",
  exception_date: "2026-01-20",
  action: "cancel" | "reschedule" | "modify",
  new_start_time?: "...",
  new_end_time?: "...",
  modified_fields?: {...}
}
```

---

### 6. 📄 Pagination для Событий
**Статус**: ⏳ Ожидает выполнения

**Проблема**: Загрузка всех событий замедляет приложение при большом объеме данных

**Решение**: 
- Пагинация на backend (skip/limit)
- Frontend загружает только видимый диапазон
- Sidebar календарь: отдельный endpoint для счетчиков

**Файлы**:
- [ ] `backend/routes/events.py` - добавить skip/limit параметры
- [ ] `backend/routes/other.py` - новый endpoint `/event-counts` для sidebar
- [ ] `frontend/src/lib/api.js` - обновить getEvents с pagination
- [ ] `frontend/src/pages/CalendarPage.jsx` - загрузка по мере навигации

**API Changes**:
```javascript
GET /api/events?start_date=...&end_date=...&skip=0&limit=50
GET /api/analytics/event-counts?start_date=...&end_date=...
  → { "2026-01-15": 5, "2026-01-16": 3, ... }
```

---

### 7. ⚡ Redis Caching для Справочников
**Статус**: ⏳ Ожидает выполнения

**Проблема**: Справочники загружаются из БД при каждом запросе

**Решение**: 
- Redis кеширование для редко меняющихся данных
- Инвалидация кеша при изменении
- Frontend обработка ошибок при устаревшем кеше

**Что кешируем**:
- Event types
- Event statuses
- Timezones
- Day rules
- Survey questions

**Файлы**:
- [ ] `backend/services/cache.py` - Redis wrapper с инвалидацией
- [ ] `backend/routes/dictionaries.py` - кеширование get, инвалидация при create/update/delete
- [ ] `frontend/src/lib/api.js` - обработка 404/400 ошибок типов событий
- [ ] `requirements.txt` - добавить `redis`, `aioredis`

**Инвалидация**:
```python
# При создании/обновлении/удалении
await cache.invalidate("event_types")
await cache.invalidate("timezones")
```

**Frontend Error Handling**:
- Показать toast: "Тип события устарел, обновите страницу"
- Автоматически перезагрузить справочники
- Fallback на дефолтный тип

---

## 📊 Метрики Улучшений

### До v0.09:
- Время загрузки событий (1000 шт): ~500ms
- Запросов к БД при открытии календаря: 8-10
- Размер ответа для месяца: ~150KB

### После v0.09 (ожидаемое):
- Время загрузки событий (pagination): ~50ms
- Запросов к БД (с кешем): 2-3
- Размер ответа (только видимый диапазон): ~30KB

**Ускорение**: ~10x для больших календарей

---

## 🔧 Технические Детали

### Зависимости
Новые пакеты:
```
# Backend
redis==5.0.1
aioredis==2.0.1
```

### Конфигурация
Новые переменные окружения:
```bash
# backend/.env
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600  # 1 час
ENABLE_CACHING=true
```

### MongoDB
Требования:
- Replica Set (для транзакций)
- Индексы на `start_time`, `created_by`, `calendar_id`

---

## 🐛 Известные Проблемы

### В процессе исправления:
- [ ] N+1 запросы в некоторых местах
- [ ] Нет rate limiting
- [ ] Отсутствует soft delete

---

## 📝 Migration Guide

### Для существующих установок:

1. **Обновите переменные окружения**:
   ```bash
   # Добавьте в backend/.env
   REDIS_URL=redis://localhost:6379
   ENABLE_CACHING=true
   ```

2. **Установите Redis** (если используете кеширование):
   ```bash
   # Docker
   docker run -d -p 6379:6379 redis:alpine
   
   # Ubuntu
   sudo apt install redis-server
   ```

3. **Обновите зависимости**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Перезапустите сервисы**:
   ```bash
   sudo supervisorctl restart all
   ```

---

## 🎯 Следующие Шаги (v0.10)

Планируется в следующем релизе:
- Event Sourcing для истории изменений
- Soft Delete
- Rate Limiting
- WebSocket для real-time обновлений
- Мобильная версия (responsive)

---

## 👥 Contributors

- Main Developer: Axis Calendar Team
- AI Assistant: Claude (Emergent Platform)

---

## 📞 Support

Вопросы и предложения: [GitHub Issues](your-repo/issues)

---

**Примечание**: Этот документ обновляется по мере выполнения задач.

Последнее обновление: 2026-01-07 13:00 UTC
