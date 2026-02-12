# Axis Calendar — iOS App (React Native / Expo)

Настоящее нативное iOS приложение, использующее единый бэкэнд с веб-версией.

## Быстрый старт

### 1. Установка зависимостей
```bash
cd ios-app
npm install
```

### 2. Настройка API URL
Откройте `src/config.js` и укажите URL вашего бэкэнда:
```js
export const API_BASE_URL = 'https://your-backend.com/api';
```

### 3. Запуск на устройстве

**Через Expo Go (быстрый тест):**
```bash
npx expo start
```
Отсканируйте QR-код в приложении Expo Go на iPhone.

**Через iOS симулятор (нужен Xcode):**
```bash
npx expo run:ios
```

### 4. Сборка для App Store
```bash
# Установка EAS CLI
npm install -g eas-cli

# Логин в Expo
eas login

# Сборка для TestFlight
eas build --platform ios --profile preview

# Сборка для App Store
eas build --platform ios --profile production

# Отправка в App Store Connect
eas submit --platform ios
```

## Архитектура

```
ios-app/
├── App.js                    # Главный файл приложения
├── app.json                  # Конфигурация Expo
├── eas.json                  # Конфигурация EAS Build
└── src/
    ├── api/index.js           # API слой (единый с веб-версией)
    ├── auth/AuthContext.js    # Аутентификация (SecureStore)
    ├── config.js              # Конфигурация
    ├── theme/index.js         # Тёмная тема (glassmorphism)
    ├── utils/dates.js         # Утилиты дат
    ├── components/
    │   ├── WeekView.js        # Недельный вид
    │   ├── DayView.js         # Дневной вид
    │   ├── MonthView.js       # Месячный вид
    │   ├── EventCard.js       # Карточка события
    │   └── GlassCard.js       # Glass-компонент
    └── screens/
        ├── LoginScreen.js     # Экран входа
        ├── CalendarScreen.js  # Главный календарь
        ├── EventsScreen.js    # Список событий
        ├── CreateEventScreen  # Создание события
        ├── EventDetailScreen  # Детали события
        ├── EditEventScreen    # Редактирование
        ├── CalendarsScreen    # Управление календарями
        └── SettingsScreen     # Настройки
```

## Функционал

- ✅ Аутентификация (JWT + SecureStore)
- ✅ Календарь: день / неделя / месяц
- ✅ Создание / редактирование / удаление событий
- ✅ Управление календарями
- ✅ Флаги событий (срочно, видеозвонок, заблокировано, выполнено)
- ✅ Типы и статусы событий
- ✅ Повторяющиеся события
- ✅ Шаблоны
- ✅ Правила дня
- ✅ Справочники
- ✅ Тёмная тема (glassmorphism)
- ✅ Haptic Feedback
- ✅ Pull to refresh
- ✅ Нативная iOS навигация

## Бэкэнд

Приложение использует **тот же самый бэкэнд** (FastAPI + MongoDB), что и веб-версия.
Учётные данные для тестирования: `admin@company.com` / `admin123`
