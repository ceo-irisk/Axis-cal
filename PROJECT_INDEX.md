# 📱 Axis Calendar - Документация проекта

## 🗂️ Обзор всех документов

### 🚀 Быстрый старт

| Файл | Описание | Для кого |
|------|----------|----------|
| [README.md](README.md) | Главное описание проекта | Все |
| [MOBILE_QUICK_START.md](MOBILE_QUICK_START.md) | Запуск iOS за 5 минут | iOS разработчики |
| [MOBILE_APP_SUMMARY.md](MOBILE_APP_SUMMARY.md) | Итоговый отчет по мобильному приложению | Руководители проекта |

---

## 📱 Мобильное приложение

### iOS
| Файл | Описание | Время чтения |
|------|----------|--------------|
| [IOS_BUILD_GUIDE.md](IOS_BUILD_GUIDE.md) | Полное руководство по iOS | 20-30 мин |
| [PUSH_NOTIFICATIONS_GUIDE.md](PUSH_NOTIFICATIONS_GUIDE.md) | Настройка push-уведомлений | 15-20 мин |
| [MOBILE_QUICK_START.md](MOBILE_QUICK_START.md) | Быстрые команды | 5 мин |

### Android (на будущее)
| Файл | Описание | Время чтения |
|------|----------|--------------|
| [ANDROID_GUIDE.md](ANDROID_GUIDE.md) | Руководство по Android | 20-30 мин |

### Общее
| Файл | Описание |
|------|----------|
| [MOBILE_GUIDE.md](MOBILE_GUIDE.md) | Архитектура мобильной веб-версии |

---

## 🌐 Веб-приложение

| Файл | Описание |
|------|----------|
| [DOCUMENTATION.md](DOCUMENTATION.md) | Полная документация веб-версии |
| [TIMEZONE_GUIDE.md](TIMEZONE_GUIDE.md) | Работа с часовыми поясами |
| [BETA_TESTING_GUIDE.md](BETA_TESTING_GUIDE.md) | Руководство для бета-тестеров |

---

## 🧪 Тестирование

| Файл | Описание |
|------|----------|
| [test_result.md](test_result.md) | Результаты тестирования (автоматически обновляется) |

---

## 🔧 Скрипты

| Файл | Назначение |
|------|------------|
| [build-ios.sh](build-ios.sh) | Автоматическая сборка iOS |

---

## 📋 Структура проекта

```
/app/
├── 📄 README.md                          # Главное описание
├── 📄 MOBILE_QUICK_START.md             # iOS за 5 минут
├── 📄 IOS_BUILD_GUIDE.md                # Полное руководство iOS
├── 📄 PUSH_NOTIFICATIONS_GUIDE.md       # Push-уведомления
├── 📄 ANDROID_GUIDE.md                  # Android (будущее)
├── 📄 MOBILE_APP_SUMMARY.md             # Итоговый отчет
│
├── backend/                             # FastAPI сервер
│   ├── server.py                        # Главный файл
│   ├── routes/                          # API endpoints
│   │   └── users.py                     # + push-токены
│   ├── models/                          # Модели данных
│   ├── services/                        # Бизнес-логика
│   └── requirements.txt                 # Зависимости
│
├── frontend/                            # React приложение
│   ├── ios/                             # 🆕 iOS проект
│   │   └── App/
│   │       └── App.xcworkspace         # Открывать в Xcode
│   │
│   ├── src/
│   │   ├── hooks/                       # 🆕 Мобильные хуки
│   │   │   ├── usePushNotifications.js
│   │   │   ├── useNetworkStatus.js
│   │   │   ├── useLocalStorage.js
│   │   │   └── index.js
│   │   │
│   │   ├── components/
│   │   │   └── NetworkStatusBanner.jsx  # 🆕 Офлайн баннер
│   │   │
│   │   ├── mobile/                      # Мобильная веб-версия
│   │   │   ├── components/
│   │   │   └── pages/
│   │   │
│   │   ├── lib/
│   │   │   └── auth.js                  # 🔄 + офлайн
│   │   │
│   │   └── App.js                       # 🔄 HashRouter
│   │
│   ├── capacitor.config.ts              # 🆕 Capacitor конфиг
│   └── package.json                     # Зависимости
│
└── build-ios.sh                         # 🆕 Скрипт сборки
```

---

## 🎯 Сценарии использования

### Я хочу запустить iOS приложение

1. **Быстро (5 мин):** [MOBILE_QUICK_START.md](MOBILE_QUICK_START.md)
2. **Подробно (30 мин):** [IOS_BUILD_GUIDE.md](IOS_BUILD_GUIDE.md)

### Я хочу настроить push-уведомления

→ [PUSH_NOTIFICATIONS_GUIDE.md](PUSH_NOTIFICATIONS_GUIDE.md)

### Я хочу добавить Android

→ [ANDROID_GUIDE.md](ANDROID_GUIDE.md)

### Я хочу понять архитектуру

→ [MOBILE_APP_SUMMARY.md](MOBILE_APP_SUMMARY.md)

### Я хочу узнать про веб-версию

→ [DOCUMENTATION.md](DOCUMENTATION.md)

### Я тестер

→ [BETA_TESTING_GUIDE.md](BETA_TESTING_GUIDE.md)

---

## 🔑 Ключевые команды

### iOS разработка

```bash
# Быстрая сборка
cd /app/frontend
yarn build
yarn cap:open:ios

# Или используйте скрипт
/app/build-ios.sh

# После изменений в React
yarn build && yarn cap:sync
```

### Веб-разработка

```bash
# Запуск dev сервера
cd /app/frontend
yarn start

# Перезапуск сервисов
sudo supervisorctl restart all
```

### Backend

```bash
# Перезапуск backend
sudo supervisorctl restart backend

# Логи
tail -f /var/log/supervisor/backend.*.log
```

---

## 📊 Технологии

### Frontend
- **React 19** - UI framework
- **Tailwind CSS** - Стилизация
- **Radix UI** - Компоненты
- **Capacitor 7** - Мобильные приложения
- **React Router** - Навигация (HashRouter для mobile)

### Backend
- **FastAPI** - API фреймворк
- **MongoDB** - База данных
- **Motor** - Async MongoDB драйвер
- **JWT** - Аутентификация
- **Redis** - Кеширование (опционально)

### Mobile
- **Capacitor** - Native runtime
- **Push Notifications** - APNs (iOS) / FCM (Android)
- **Network API** - Офлайн режим
- **Preferences API** - Локальное хранилище

---

## 🚦 Статус функций

### Готово ✅

- ✅ Веб-приложение (desktop + mobile web)
- ✅ iOS нативное приложение (Capacitor)
- ✅ Push-уведомления (клиент готов, сервер нужно настроить)
- ✅ Офлайн режим
- ✅ Локальное хранилище
- ✅ Общий backend

### В разработке 🚧

- 🚧 iOS production (настройка Xcode, иконки)
- 🚧 Push-уведомления (backend интеграция с APNs)
- 🚧 TestFlight публикация

### Запланировано 📋

- 📋 Android приложение
- 📋 macOS приложение
- 📋 App Store публикация
- 📋 Google Play публикация

---

## 🐛 Известные проблемы

### iOS

1. **CocoaPods требуется:** `sudo gem install cocoapods`
2. **macOS обязателен** для iOS разработки
3. **Push не работают в симуляторе** (только на реальном устройстве)

### Решения

Все решения описаны в [IOS_BUILD_GUIDE.md](IOS_BUILD_GUIDE.md) в разделе "Известные проблемы и решения"

---

## 📞 Поддержка

### Диагностика

```bash
# Проверить Capacitor
npx cap doctor

# Список плагинов
npx cap ls

# Логи backend
tail -f /var/log/supervisor/backend.*.log
```

### Документация

- Всегда начинайте с соответствующего .md файла
- Используйте поиск по документам (Cmd/Ctrl + F)
- Проверяйте раздел "Известные проблемы"

---

## 📈 Версионирование

**Текущая версия:** 1.0.0

### Changelog

**v1.0.0 (2025-01-09)**
- ✨ Добавлено iOS приложение (Capacitor)
- ✨ Push-уведомления (клиент)
- ✨ Офлайн режим
- ✨ Кросс-платформенное хранилище
- 📚 Полная документация

---

## 🎯 Цели проекта

### Краткосрочные (1-2 недели)

- [ ] Настроить iOS проект в Xcode
- [ ] Добавить иконки и splash screens
- [ ] Протестировать на реальном устройстве
- [ ] Настроить push-уведомления (APNs)
- [ ] Загрузить в TestFlight

### Среднесрочные (1-2 месяца)

- [ ] Добавить Android платформу
- [ ] Настроить FCM для Android
- [ ] Оптимизировать офлайн режим
- [ ] Бета-тестирование на обеих платформах
- [ ] Публикация в App Store

### Долгосрочные (3-6 месяцев)

- [ ] Публикация в Google Play
- [ ] macOS приложение
- [ ] Apple Watch companion app
- [ ] Widget для iOS/Android
- [ ] Синхронизация между устройствами

---

## 🙏 Благодарности

Проект создан с использованием:
- Capacitor от Ionic Team
- React от Facebook
- FastAPI от Sebastián Ramírez
- Tailwind CSS от Tailwind Labs

---

## 📄 Лицензия

[Укажите вашу лицензию]

---

**Последнее обновление:** 2025-01-09  
**Версия документации:** 1.0.0

---

## 🔗 Быстрые ссылки

- 🏠 [Главная](README.md)
- 🚀 [Быстрый старт iOS](MOBILE_QUICK_START.md)
- 📱 [Полное руководство iOS](IOS_BUILD_GUIDE.md)
- 🔔 [Push-уведомления](PUSH_NOTIFICATIONS_GUIDE.md)
- 📊 [Итоговый отчет](MOBILE_APP_SUMMARY.md)
- 🌐 [Веб-документация](DOCUMENTATION.md)

---

**Готово! Начинайте с [MOBILE_QUICK_START.md](MOBILE_QUICK_START.md) 🎉**
