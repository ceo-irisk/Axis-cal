# 🔔 Push-уведомления для iOS приложения Axis Calendar

## Обзор

Push-уведомления реализованы с использованием Apple Push Notification service (APNs).

---

## 🔧 Настройка APNs

### 1. Apple Developer Portal

1. Зайдите в [Apple Developer Portal](https://developer.apple.com/account/)
2. Перейдите в **Certificates, Identifiers & Profiles**
3. **Keys** → Create a Key
4. Выберите **Apple Push Notifications service (APNs)**
5. Скачайте `.p8` файл (СОХРАНИТЕ ЕГО!)
6. Запишите:
   - **Key ID** (например: `ABC123DEF4`)
   - **Team ID** (находится в Account → Membership)

### 2. Настройка в Backend

Добавьте в `/app/backend/.env`:

```bash
# Apple Push Notifications
APNS_KEY_ID=ABC123DEF4
APNS_TEAM_ID=YOURTTEAMID
APNS_BUNDLE_ID=com.axiscalendar.app
APNS_KEY_PATH=/path/to/AuthKey_ABC123DEF4.p8
APNS_USE_SANDBOX=true  # false для production
```

---

## 📱 Клиентская часть (уже реализована)

### Регистрация устройства

В мобильном приложении автоматически регистрируется токен:

```javascript
// src/hooks/usePushNotifications.js
const { token, sendTokenToBackend } = usePushNotifications();

// После логина отправляем токен на backend
useEffect(() => {
  if (user && token) {
    sendTokenToBackend(user.id);
  }
}, [user, token]);
```

### API Endpoint (уже реализован)

```
POST /api/users/push-token
{
  "userId": "user-uuid",
  "token": "device-push-token",
  "platform": "ios"
}
```

Токен сохраняется в коллекции `users`:
```javascript
{
  "id": "user-uuid",
  "email": "user@example.com",
  "push_token": "device-token-here",
  "push_platform": "ios",
  "push_token_updated_at": "2025-01-09T16:00:00Z"
}
```

---

## 🔨 Backend - Отправка уведомлений

### Установка библиотеки

```bash
cd /app/backend
pip install aioapns
```

Добавьте в `requirements.txt`:
```
aioapns==3.3.0
```

### Создание сервиса для push-уведомлений

Создайте `/app/backend/services/push_notifications.py`:

```python
import os
import logging
from aioapns import APNs, NotificationRequest, PushType
from pathlib import Path

logger = logging.getLogger(__name__)

class PushNotificationService:
    def __init__(self):
        self.apns = None
        self.bundle_id = os.getenv('APNS_BUNDLE_ID', 'com.axiscalendar.app')
        self.use_sandbox = os.getenv('APNS_USE_SANDBOX', 'true').lower() == 'true'
        
    async def initialize(self):
        """Инициализация APNs клиента"""
        try:
            key_path = os.getenv('APNS_KEY_PATH')
            key_id = os.getenv('APNS_KEY_ID')
            team_id = os.getenv('APNS_TEAM_ID')
            
            if not all([key_path, key_id, team_id]):
                logger.warning("⚠️ APNs credentials not configured")
                return False
            
            with open(key_path, 'r') as f:
                key_content = f.read()
            
            self.apns = APNs(
                key=key_content,
                key_id=key_id,
                team_id=team_id,
                topic=self.bundle_id,
                use_sandbox=self.use_sandbox
            )
            
            logger.info(f"✅ APNs initialized (sandbox={self.use_sandbox})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize APNs: {str(e)}")
            return False
    
    async def send_notification(
        self, 
        device_token: str, 
        title: str, 
        body: str,
        badge: int = None,
        data: dict = None
    ):
        """
        Отправить push-уведомление на iOS устройство
        
        Args:
            device_token: Токен устройства из APNs
            title: Заголовок уведомления
            body: Текст уведомления
            badge: Число на бейдже приложения (опционально)
            data: Дополнительные данные (опционально)
        """
        if not self.apns:
            logger.warning("⚠️ APNs not initialized")
            return False
        
        try:
            # Формируем payload
            alert = {
                'title': title,
                'body': body
            }
            
            payload = {
                'aps': {
                    'alert': alert,
                    'sound': 'default'
                }
            }
            
            if badge is not None:
                payload['aps']['badge'] = badge
            
            if data:
                payload.update(data)
            
            # Создаем запрос
            request = NotificationRequest(
                device_token=device_token,
                message=payload,
                push_type=PushType.ALERT
            )
            
            # Отправляем
            response = await self.apns.send_notification(request)
            
            if response.is_successful:
                logger.info(f"✅ Push notification sent to {device_token[:20]}...")
                return True
            else:
                logger.error(f"❌ Failed to send push: {response.description}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error sending push notification: {str(e)}")
            return False
    
    async def close(self):
        """Закрыть APNs соединение"""
        if self.apns:
            await self.apns.close()

# Глобальный экземпляр сервиса
push_service = PushNotificationService()
```

### Использование в API endpoints

Например, отправить уведомление о новом событии:

```python
# В /app/backend/routes/events.py

from services.push_notifications import push_service

@router.post("", response_model=EventResponse)
async def create_event(event: EventCreate, current_user: dict = Depends(get_current_user)):
    # ... создание события ...
    
    # Отправляем push владельцу календаря
    calendar = await db.calendars.find_one({"id": event_dict["calendar_id"]})
    if calendar:
        user = await db.users.find_one({"id": calendar["user_id"]})
        if user and user.get("push_token"):
            await push_service.send_notification(
                device_token=user["push_token"],
                title="Новое событие",
                body=f"{event_dict['title']} в {event_dict['start_time']}",
                data={"event_id": event_dict["id"]}
            )
    
    return EventResponse(**event_dict)
```

---

## 📅 Примеры уведомлений

### 1. Напоминание о событии за 15 минут

```python
async def send_event_reminder(event_id: str):
    event = await db.events.find_one({"id": event_id})
    if not event:
        return
    
    calendar = await db.calendars.find_one({"id": event["calendar_id"]})
    user = await db.users.find_one({"id": calendar["user_id"]})
    
    if user and user.get("push_token"):
        await push_service.send_notification(
            device_token=user["push_token"],
            title="Напоминание",
            body=f"Через 15 минут: {event['title']}",
            badge=1,
            data={
                "type": "reminder",
                "event_id": event_id,
                "event_title": event['title']
            }
        )
```

### 2. Уведомление о приглашении на событие

```python
async def notify_event_invitation(user_id: str, event_title: str, organizer: str):
    user = await db.users.find_one({"id": user_id})
    
    if user and user.get("push_token"):
        await push_service.send_notification(
            device_token=user["push_token"],
            title="Новое приглашение",
            body=f"{organizer} приглашает вас на '{event_title}'",
            data={
                "type": "invitation",
                "organizer": organizer
            }
        )
```

### 3. Уведомление о изменении события

```python
async def notify_event_updated(event_id: str):
    event = await db.events.find_one({"id": event_id})
    calendar = await db.calendars.find_one({"id": event["calendar_id"]})
    user = await db.users.find_one({"id": calendar["user_id"]})
    
    if user and user.get("push_token"):
        await push_service.send_notification(
            device_token=user["push_token"],
            title="Событие изменено",
            body=f"'{event['title']}' было обновлено",
            data={
                "type": "update",
                "event_id": event_id
            }
        )
```

---

## 🔄 Scheduled notifications (с Celery)

Для отправки напоминаний нужен планировщик задач.

### Установка Celery

```bash
pip install celery redis
```

### Создание задачи

```python
# /app/backend/tasks/reminders.py

from celery import Celery
from datetime import datetime, timedelta
from services.push_notifications import push_service

celery_app = Celery('tasks', broker='redis://localhost:6379/0')

@celery_app.task
async def check_upcoming_events():
    """Проверяет события на ближайшие 15 минут и отправляет напоминания"""
    
    now = datetime.now(timezone.utc)
    reminder_time = now + timedelta(minutes=15)
    
    # Найти события, которые начинаются через 15 минут
    events = await db.events.find({
        "start_time": {
            "$gte": reminder_time.isoformat(),
            "$lt": (reminder_time + timedelta(minutes=1)).isoformat()
        }
    }).to_list(100)
    
    for event in events:
        await send_event_reminder(event["id"])

# Запускать каждую минуту
celery_app.conf.beat_schedule = {
    'check-upcoming-events': {
        'task': 'tasks.reminders.check_upcoming_events',
        'schedule': 60.0,  # каждую минуту
    },
}
```

---

## 🧪 Тестирование

### Ручная отправка через API

```bash
curl -X POST http://localhost:8001/api/test/send-push \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-here",
    "title": "Тест",
    "body": "Тестовое уведомление"
  }'
```

### Endpoint для тестирования

```python
# В /app/backend/routes/other.py

@router.post("/test/send-push")
async def test_push_notification(
    user_id: str,
    title: str = "Test",
    body: str = "Test notification"
):
    user = await db.users.find_one({"id": user_id})
    if not user or not user.get("push_token"):
        raise HTTPException(status_code=404, detail="User or push token not found")
    
    success = await push_service.send_notification(
        device_token=user["push_token"],
        title=title,
        body=body
    )
    
    return {"success": success}
```

---

## 📋 Checklist для production

- [ ] Получить APNs ключ (.p8 файл)
- [ ] Настроить переменные окружения (APNS_KEY_ID, APNS_TEAM_ID, etc.)
- [ ] Установить aioapns: `pip install aioapns`
- [ ] Создать сервис push_notifications.py
- [ ] Инициализировать сервис при старте приложения
- [ ] Добавить отправку уведомлений в нужных местах
- [ ] Настроить Celery для scheduled уведомлений
- [ ] Переключить APNS_USE_SANDBOX=false для production
- [ ] Протестировать на реальном устройстве

---

## 🔒 Безопасность

1. **Никогда не коммитьте** `.p8` ключи в git
2. Храните ключи в защищенном месте (environment variables, secrets manager)
3. Используйте разные ключи для development и production
4. Регулярно проверяйте, какие токены активны

---

## 📚 Дополнительные ресурсы

- **Apple Push Notifications**: [https://developer.apple.com/documentation/usernotifications](https://developer.apple.com/documentation/usernotifications)
- **aioapns Documentation**: [https://github.com/Fatal1ty/aioapns](https://github.com/Fatal1ty/aioapns)
- **Testing Push Notifications**: [https://developer.apple.com/documentation/usernotifications/testing-notifications-using-the-push-notification-console](https://developer.apple.com/documentation/usernotifications/testing-notifications-using-the-push-notification-console)

---

## 💡 Советы

1. **Начните с sandbox** - используйте `APNS_USE_SANDBOX=true` для тестирования
2. **Тестируйте на реальном устройстве** - push не работают в симуляторе
3. **Обрабатывайте ошибки** - токены могут устареть, устройство удалено
4. **Не спамьте** - отправляйте только важные уведомления
5. **Локализация** - подумайте о разных языках
