# 📱 Axis Calendar - Мобильное iOS Приложение

## 🎯 Обзор

Мобильное приложение Axis Calendar создано с использованием **Capacitor 7**, что позволяет использовать существующий React код для создания нативного iOS приложения.

### Технологический стек:
- **Frontend**: React 19 + Tailwind CSS
- **Backend**: FastAPI (общий с веб-версией)
- **Mobile Framework**: Capacitor 7
- **Платформа**: iOS (с возможностью добавления Android)

---

## 🚀 Быстрый старт

### Предварительные требования

Для разработки iOS приложения вам понадобится:

1. **macOS** (обязательно для iOS разработки)
2. **Xcode 14+** 
   - Скачать из App Store
   - Установить Command Line Tools: `xcode-select --install`
3. **CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```
4. **Node.js 20+** и **Yarn**

---

## 📦 Установка зависимостей

```bash
cd /app/frontend
yarn install
```

---

## 🔧 Разработка и сборка

### 1. Создание production build

```bash
cd /app/frontend
yarn build
```

### 2. Синхронизация с iOS проектом

После каждого изменения в коде React нужно синхронизировать:

```bash
yarn cap:sync
```

Это скопирует build в iOS проект и обновит плагины.

### 3. Открытие проекта в Xcode

```bash
yarn cap:open:ios
```

Или вручную:
```bash
open ios/App/App.xcworkspace
```

**⚠️ ВАЖНО**: Открывайте `.xcworkspace`, а НЕ `.xcodeproj`!

### 4. Запуск в Xcode

1. В Xcode выберите симулятор (iPhone 14 Pro и выше рекомендуется)
2. Нажмите ▶️ (Play) или `Cmd + R`
3. Приложение запустится в симуляторе

---

## 🎨 Настройка iOS приложения

### Иконка приложения

Иконки находятся в: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

**Требуемые размеры:**
- 1024x1024 (App Store)
- 60x60, 76x76, 83.5x83.5 (различные устройства)

Используйте инструмент: [https://www.appicon.co/](https://www.appicon.co/)

### Splash Screen

Настройте в `capacitor.config.ts`:
```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: '#ffffff',
    showSpinner: false
  }
}
```

### Bundle Identifier

В Xcode:
1. Выберите проект `App` в навигаторе
2. Target → App → General → Identity
3. Bundle Identifier: `com.axiscalendar.app`

### Настройка прав доступа (Info.plist)

Для push-уведомлений и других функций, добавьте в `ios/App/App/Info.plist`:

```xml
<key>NSUserNotificationsUsageDescription</key>
<string>Мы отправляем уведомления о предстоящих событиях</string>
```

---

## 🔔 Функции приложения

### 1. Push-уведомления

Реализовано через `@capacitor/push-notifications`

**Использование в коде:**
```javascript
import { usePushNotifications } from './hooks/usePushNotifications';

const { token, sendTokenToBackend } = usePushNotifications();
```

**Настройка в Xcode:**
1. Target → Signing & Capabilities
2. + Capability → Push Notifications
3. Требуется Apple Developer Account

### 2. Офлайн режим

Реализовано через:
- `@capacitor/network` - определение статуса сети
- `@capacitor/preferences` - локальное хранилище данных

**Использование:**
```javascript
import { useNetworkStatus } from './hooks/useNetworkStatus';

const { isOnline, connectionType } = useNetworkStatus();
```

При потере соединения приложение:
- Показывает баннер "Нет подключения"
- Использует кешированные данные пользователя
- Работает с локальным хранилищем

### 3. Локальное хранилище

```javascript
import { useLocalStorage } from './hooks/useLocalStorage';

const [events, setEvents] = useLocalStorage('events', []);
```

Автоматически использует:
- `Preferences API` на iOS
- `localStorage` в веб-версии

---

## 🏗️ Структура проекта

```
/app/frontend/
├── ios/                          # iOS нативный проект (Xcode)
│   └── App/
│       └── App/
│           ├── App.xcworkspace   # Открывать этот файл!
│           ├── Assets.xcassets/  # Иконки и изображения
│           └── Info.plist        # Конфигурация iOS
├── src/
│   ├── hooks/                    # Мобильные хуки
│   │   ├── usePushNotifications.js
│   │   ├── useNetworkStatus.js
│   │   └── useLocalStorage.js
│   ├── components/
│   │   └── NetworkStatusBanner.jsx
│   └── mobile/                   # Мобильные компоненты
│       ├── components/
│       │   ├── TwoDayGrid.jsx
│       │   ├── MonthView.jsx
│       │   └── BottomNavigation.jsx
│       └── pages/
│           └── MobileCalendarPage.jsx
├── build/                        # Production build (копируется в iOS)
├── capacitor.config.ts           # Конфигурация Capacitor
└── package.json
```

---

## 🌐 Backend конфигурация

**Production Backend URL:**
```
https://single-server-app.preview.emergentagent.com
```

Настроено в `capacitor.config.ts`:
```typescript
server: {
  url: 'https://single-server-app.preview.emergentagent.com',
  cleartext: true
}
```

**⚠️ ВАЖНО**: Backend общий для веб-версии и мобильного приложения!

---

## 📝 Workflow разработки

### Типичный цикл разработки:

1. **Изменяем React код**
   ```bash
   cd /app/frontend/src
   # Редактируем файлы
   ```

2. **Тестируем в браузере**
   ```bash
   yarn start
   # Открываем http://localhost:3000
   # Включаем mobile view (< 768px)
   ```

3. **Создаем production build**
   ```bash
   yarn build
   ```

4. **Синхронизируем с iOS**
   ```bash
   yarn cap:sync
   ```

5. **Запускаем в Xcode**
   ```bash
   yarn cap:open:ios
   # В Xcode: Cmd + R
   ```

---

## 🧪 Тестирование

### В iOS Simulator

```bash
# Открыть Simulator отдельно
open -a Simulator

# Список доступных устройств
xcrun simctl list devices

# Запустить на конкретном симуляторе
npx cap run ios --target="iPhone-15-Pro"
```

### На реальном устройстве

1. Подключите iPhone через USB
2. В Xcode выберите ваше устройство вместо симулятора
3. Настройте signing (нужен Apple Developer Account)
4. Нажмите Run

---

## 🚢 Подготовка к TestFlight

### 1. Настройка в Xcode

**Signing & Capabilities:**
- Team: Ваша команда разработчика
- Bundle Identifier: `com.axiscalendar.app`
- Signing Certificate: Apple Development / Distribution

**General:**
- Version: 1.0.0
- Build: 1

### 2. Архивирование приложения

1. В Xcode: Product → Archive
2. Дождитесь завершения архивирования
3. Откроется Organizer с архивом

### 3. Загрузка в App Store Connect

1. В Organizer нажмите "Distribute App"
2. Выберите "App Store Connect"
3. Выберите "Upload"
4. Следуйте инструкциям
5. Дождитесь обработки (10-30 минут)

### 4. Создание TestFlight билда

1. Зайдите в [App Store Connect](https://appstoreconnect.apple.com)
2. Мои приложения → Axis Calendar
3. TestFlight → iOS Builds
4. Добавьте внутренних тестеров
5. Отправьте приглашения

---

## 🔍 Отладка

### Console.log в Xcode

В Xcode откройте Debug Area (View → Debug Area → Show Debug Area)

Все `console.log()` из React будут видны здесь.

### Safari Web Inspector

1. На Mac: Safari → Preferences → Advanced → Show Develop menu
2. Запустите приложение на симуляторе
3. Develop → Simulator → localhost
4. Откроется полноценный инспектор с DOM, Network, Console

### Capacitor DevTools

```bash
# Логи всех плагинов
npx cap doctor

# Проверка конфигурации
npx cap ls
```

---

## 📚 Полезные команды

```bash
# Создать production build и синхронизировать
yarn build:mobile

# Открыть iOS проект в Xcode
yarn cap:open:ios

# Синхронизировать изменения
yarn cap:sync

# Запустить на симуляторе
yarn cap:run:ios

# Проверить статус Capacitor
npx cap doctor

# Список установленных плагинов
npx cap ls

# Обновить плагины
npx cap sync ios
```

---

## 🐛 Известные проблемы и решения

### 1. "CocoaPods not found"

```bash
sudo gem install cocoapods
cd ios/App
pod install
```

### 2. "Build failed" в Xcode

- Очистите: Product → Clean Build Folder (Shift + Cmd + K)
- Удалите DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- Переустановите pods: `cd ios/App && pod deintegrate && pod install`

### 3. Приложение не обновляется

```bash
# Полная пересборка
yarn build
npx cap sync --inline
yarn cap:open:ios
# В Xcode: Clean + Build
```

### 4. Push-уведомления не работают

- Проверьте Capabilities в Xcode (Push Notifications включены)
- Требуется реальное устройство (не работают в симуляторе)
- Требуется Apple Developer Account
- Настройте APNs ключи в Apple Developer Portal

---

## 📖 Дополнительные ресурсы

- **Capacitor Docs**: [https://capacitorjs.com/docs](https://capacitorjs.com/docs)
- **iOS Human Interface Guidelines**: [https://developer.apple.com/design/human-interface-guidelines/ios](https://developer.apple.com/design/human-interface-guidelines/ios)
- **TestFlight Guide**: [https://developer.apple.com/testflight/](https://developer.apple.com/testflight/)
- **App Store Connect**: [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com)

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи в Xcode Debug Area
2. Проверьте Safari Web Inspector
3. Запустите `npx cap doctor`
4. Проверьте конфигурацию в `capacitor.config.ts`

---

## 🎉 Поздравляем!

Вы готовы к разработке iOS приложения Axis Calendar! 

**Следующие шаги:**
1. Соберите проект в Xcode
2. Протестируйте на симуляторе
3. Подготовьте иконки и splash screens
4. Загрузите в TestFlight для бета-тестирования

Удачи! 🚀
