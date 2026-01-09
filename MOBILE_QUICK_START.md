# 📱 Axis Calendar Mobile App - Quick Start

## ⚡ Быстрая инструкция для запуска iOS приложения

### 1. Установка зависимостей (если еще не установлены)

```bash
cd /app/frontend
yarn install
```

### 2. Создание production build

```bash
yarn build
```

### 3. Открытие в Xcode (ТОЛЬКО НА macOS!)

```bash
yarn cap:open:ios
```

Это откроет Xcode с iOS проектом.

### 4. Запуск приложения

В Xcode:
1. Выберите симулятор (например, iPhone 15 Pro)
2. Нажмите ▶️ или `Cmd + R`

---

## 🔄 При изменении кода React

Каждый раз когда вы меняете код:

```bash
# 1. Пересобрать
yarn build

# 2. Синхронизировать
yarn cap:sync

# 3. Запустить в Xcode
yarn cap:open:ios
```

Или используйте короткую команду:
```bash
yarn build:mobile
```

---

## 📱 Что уже реализовано

✅ **Capacitor 7** интеграция  
✅ **iOS проект** готов к сборке  
✅ **Push-уведомления** (нужна настройка в Xcode)  
✅ **Офлайн режим** с локальным хранилищем  
✅ **Определение статуса сети**  
✅ **Общий backend** с веб-версией  
✅ **HashRouter** для нативной навигации  
✅ **Мобильная версия UI** (автоматически активируется)

---

## 🎯 Следующие шаги

1. **Тестирование на симуляторе** - проверьте функциональность
2. **Настройка иконок** - в `ios/App/App/Assets.xcassets/`
3. **Push-уведомления** - настройка в Xcode (Signing & Capabilities)
4. **TestFlight** - загрузка для бета-тестирования

---

## 📚 Полная документация

Смотрите [IOS_BUILD_GUIDE.md](IOS_BUILD_GUIDE.md) для подробной информации о:
- Настройке Xcode
- Конфигурации iOS
- Push-уведомлениях
- Офлайн режиме
- Публикации в TestFlight

---

## ⚠️ Важные заметки

- **macOS ОБЯЗАТЕЛЕН** для iOS разработки
- **Xcode 14+** требуется
- **CocoaPods** должен быть установлен: `sudo gem install cocoapods`
- **Backend URL** уже настроен: `https://single-server-app.preview.emergentagent.com`

---

## 🐛 Проблемы?

Запустите диагностику:
```bash
npx cap doctor
```

Или посмотрите [IOS_BUILD_GUIDE.md](IOS_BUILD_GUIDE.md) раздел "Известные проблемы и решения"
