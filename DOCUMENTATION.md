# 📚 Axis Calendar - Документация проекта

## 🎯 Описание продукта

**Axis Calendar** - интеллектуальный календарь для эффективного управления временем с поддержкой:
- Множественных календарей и типов событий
- Шаблонов дней для быстрого планирования
- Правил дня с автоматической проверкой нарушений
- Оценки продуктивности и аналитики
- Мобильной версии с интуитивным интерфейсом

---

## 🏗️ Архитектура

### Tech Stack
- **Frontend**: React 18, TailwindCSS, date-fns, lucide-react
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB
- **Authentication**: JWT tokens

### Структура проекта

```
/app
├── backend/
│   ├── server.py           # FastAPI приложение
│   ├── routes/             # API endpoints
│   │   ├── auth.py         # Авторизация
│   │   ├── events.py       # События
│   │   ├── templates.py    # Шаблоны дней
│   │   ├── other.py        # Правила, опросы, статистика
│   │   └── users.py        # Управление пользователями
│   ├── models/             # Pydantic модели
│   ├── services/           # Бизнес-логика
│   │   ├── auth.py         # Хеширование паролей, JWT
│   │   ├── permissions.py  # Права доступа
│   │   └── init_data.py    # Инициализация БД
│   └── tests/              # Тесты
│
└── frontend/
    ├── src/
    │   ├── components/     # React компоненты
    │   │   ├── Sidebar.jsx         # Боковая панель (desktop)
    │   │   ├── CalendarGrid.jsx    # Сетка календаря
    │   │   ├── EventModal.jsx      # Модальное окно события
    │   │   ├── sidebar/            # Модульные компоненты sidebar
    │   │   └── ui/                 # shadcn/ui компоненты
    │   ├── mobile/         # Мобильная версия
    │   │   ├── components/ # Мобильные компоненты
    │   │   ├── pages/      # Страницы мобильного приложения
    │   │   └── hooks/      # Хуки для мобильной версии
    │   ├── pages/          # Страницы приложения
    │   │   ├── CalendarPage.jsx    # Главная страница
    │   │   ├── LoginPage.jsx       # Вход
    │   │   ├── NotFoundPage.jsx    # 404
    │   │   └── ErrorPage.jsx       # Страница ошибки
    │   └── lib/            # Библиотеки и утилиты
    │       ├── api.js      # API клиент
    │       ├── auth.js     # Auth context
    │       ├── theme.js    # Theme provider
    │       └── timezones.js # Работа с часовыми поясами
    └── public/             # Статические файлы
```

---

## 🔐 Безопасность

### Аутентификация
- JWT токены с истечением
- Пароли хешируются с использованием bcrypt
- Проверка прав доступа на уровне API

### Первоначальный вход
**Email**: `admin@company.com`  
**Пароль**: `admin123` (рекомендуется сменить после первого входа)

### Защита данных
- Все API запросы требуют авторизацию
- CORS настроен для production
- Пароли никогда не передаются в frontend (кроме формы входа)

### Отключенный функционал (Production)
- ❌ Быстрая смена пользователей (hardcoded passwords removed)
- ❌ User switcher dropdown (заблокирован в коде)

---

## 📱 Мобильная версия

### Автоматическая активация
При ширине экрана < 768px автоматически включается мобильная версия.

### Основные компоненты

**TwoDayGrid** - 2-дневная сетка
- Показывает 2 дня рядом
- Свайпы влево/вправо для навигации
- Минимальная дистанция свайпа: 80px
- Отличает горизонтальные свайпы от вертикального скролла
- Текущий день подсвечен зеленым

**MonthView** - Месячный календарь
- Полный календарь месяца
- Точки под датами показывают события
- Клик на дату → переход к 2-дневной сетке

**BottomNavigation** - Нижнее меню
- 4 основные кнопки: Настройки, Календари, События, Дашборд
- Кнопка "Сетка" появляется динамически

**Отдельные страницы**:
- `MobileDashboard` - оценка дня и нарушения
- `MobileEvents` - список событий
- `MobileCalendars` - управление календарями
- `MobileSettings` - меню настроек

Подробнее: `/app/MOBILE_GUIDE.md`

---

## 🚀 API Endpoints

### Авторизация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Текущий пользователь

### События
- `GET /api/events` - Список событий
- `POST /api/events` - Создать событие
- `PUT /api/events/{event_id}` - Обновить событие
- `DELETE /api/events/{event_id}` - Удалить событие

### Шаблоны
- `GET /api/templates` - Список шаблонов
- `POST /api/templates` - Создать шаблон
- `POST /api/templates/apply/{template_id}` - Применить шаблон

### Правила дня
- `GET /api/rules` - Список правил
- `POST /api/rules` - Создать правило
- `PUT /api/rules/{rule_id}` - Обновить правило
- `DELETE /api/rules/{rule_id}` - Удалить правило
- `PATCH /api/rules/toggle/{rule_id}` - Включить/выключить правило
- `POST /api/rules/check` - Проверить нарушения правил

### Календари
- `GET /api/calendars` - Список календарей
- `POST /api/calendars` - Создать календарь
- `DELETE /api/calendars/{calendar_id}` - Удалить календарь

---

## 🗄️ База данных

### Коллекции MongoDB

**users** - Пользователи
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "password_hash": "string (bcrypt)",
  "role": "admin | user",
  "created_at": "datetime"
}
```

**events** - События
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "start_time": "datetime (UTC)",
  "end_time": "datetime (UTC)",
  "timezone": "string",
  "event_type": "string",
  "status": "confirmed | tentative | template",
  "all_day": "boolean",
  "calendar_id": "uuid",
  "created_by": "user_id",
  "is_blocked": "boolean",
  "is_completed": "boolean",
  "is_urgent": "boolean",
  "is_video_call": "boolean",
  "location": "string"
}
```

**templates** - Шаблоны дней
```json
{
  "id": "uuid",
  "name": "string",
  "template_type": "day | week",
  "timezone": "string",
  "events": [
    {
      "title": "string",
      "start_hour": "int",
      "start_minute": "int",
      "end_hour": "int",
      "end_minute": "int",
      "event_type": "string",
      ...
    }
  ],
  "created_by": "user_id"
}
```

**day_rules** - Правила дня
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "rule_type": "max_meetings | min_break | max_hours | max_consecutive | required_lunch",
  "value": "int",
  "is_active": "boolean",
  "created_by": "user_id"
}
```

**calendars** - Календари
```json
{
  "id": "uuid",
  "name": "string",
  "color": "string (hex)",
  "icon": "string",
  "owner_id": "user_id",
  "shared_with": ["user_id"]
}
```

---

## ⚙️ Переменные окружения

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=axis_calendar
JWT_SECRET=your-secret-key
ADMIN_PASSWORD=admin123  # Только для первого запуска
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://your-domain.com
```

---

## 🎨 Дизайн система

### Цвета
- **Primary**: `#085C53` (темно-зеленый)
- **Primary Hover**: `#074a44`
- **Green (accent)**: `#10b981` (текущий день в мобилке)
- **Red**: `#ef4444` (ошибки, блокировки)
- **Amber**: `#f59e0b` (срочные события)
- **Blue**: `#06b6d4` (видеозвонки)

### Типография
- H1: `text-2xl` - `text-4xl`
- H2: `text-lg` - `text-xl`
- Body: `text-sm` - `text-base`
- Small: `text-xs`

---

## 🧪 Тестирование

### Запуск тестов
```bash
# Backend
cd /app/backend
pytest tests/

# Frontend
cd /app/frontend
yarn test
```

### Тестовые данные
- Админ: admin@company.com / admin123
- События создаются с различными типами и статусами
- Шаблоны дней доступны для тестирования

---

## 🚀 Деплой

### На Emergent
1. Нажмите кнопку "Deploy" в интерфейсе
2. Выберите тип деплоя
3. Приложение будет доступно на поддомене

### Переменные окружения (Production)
Убедитесь что установлены:
- `MONGO_URL` - подключение к MongoDB
- `JWT_SECRET` - секретный ключ для токенов
- `REACT_APP_BACKEND_URL` - URL backend API

---

## 📖 Основные функции

### События
- Создание, редактирование, удаление событий
- Различные типы (встреча, задача, обед и т.д.)
- Статусы (подтверждено, предварительно, шаблон)
- Флаги (заблокировано, выполнено, срочно, видеозвонок)
- Поддержка временных зон

### Шаблоны дней
- Создание шаблонов с набором событий
- Применение шаблона на любую дату
- Поддержка часовых поясов

### Правила дня
- Автоматическая проверка нарушений
- Типы: максимум встреч, минимальный перерыв, максимум часов
- Отображение нарушений в дашборде

### Календари
- Множественные календари с разными цветами
- Права доступа (личные/общие)
- Скрытие/показ календарей

### Дашборд
- Оценка дня (1-5 звёзд)
- Статистика событий
- Нарушения правил
- Общее количество событий и часов

---

## 🔧 Разработка

### Установка зависимостей
```bash
# Backend
cd /app/backend
pip install -r requirements.txt

# Frontend
cd /app/frontend
yarn install
```

### Запуск в dev режиме
```bash
# Backend (автоматически через supervisor)
sudo supervisorctl restart backend

# Frontend (автоматически через supervisor)
sudo supervisorctl restart frontend
```

### Hot Reload
Изменения автоматически применяются:
- Frontend: React hot reload
- Backend: uvicorn --reload

---

## 🐛 Известные ограничения

### Production
- User switcher отключен (безопасность)
- Требуется настройка CORS для production домена

### Mobile
- Некоторые сложные жесты могут конфликтовать
- Рекомендуется тестировать на реальных устройствах

---

## 📞 Поддержка

Для вопросов и проблем:
- Проверьте документацию в `/app/MOBILE_GUIDE.md`
- Проверьте логи: `/var/log/supervisor/`
- Используйте troubleshoot agent при проблемах

---

## 📋 Checklist перед production

- ✅ User switcher отключен
- ✅ Пароли хешируются
- ✅ JWT секрет из env
- ✅ Страницы ошибок (404, 500)
- ✅ Мобильная версия работает
- ✅ Lint проверки пройдены
- ✅ Тестирование выполнено
- ⚠️ Смените ADMIN_PASSWORD в env
- ⚠️ Настройте CORS для production домена
- ⚠️ Протестируйте на реальных устройствах

---

**Версия**: 1.0.0 (Beta)  
**Дата**: Январь 2026
