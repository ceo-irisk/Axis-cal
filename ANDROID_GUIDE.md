# 🤖 Добавление Android платформы (для будущего)

## Обзор

После того как iOS приложение готово, можно легко добавить поддержку Android, используя тот же код.

---

## 📋 Предварительные требования

1. **Android Studio** - [Скачать](https://developer.android.com/studio)
2. **Java JDK 17+** - установить через Android Studio SDK Manager
3. **Android SDK** - устанавливается вместе с Android Studio

---

## 🚀 Добавление Android платформы

### 1. Добавить Android в проект

```bash
cd /app/frontend
npx cap add android
```

Это создаст директорию `android/` с Android Studio проектом.

### 2. Синхронизировать

```bash
yarn build
npx cap sync android
```

### 3. Открыть в Android Studio

```bash
npx cap open android
```

Или вручную:
```bash
open -a "Android Studio" android/
```

---

## ⚙️ Настройка Android

### 1. Bundle ID (Package Name)

В `android/app/build.gradle`:
```gradle
android {
    namespace "com.axiscalendar.app"
    ...
}
```

### 2. Разрешения (Permissions)

В `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <!-- Интернет (обязательно) -->
    <uses-permission android:name="android.permission.INTERNET" />
    
    <!-- Push-уведомления -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <!-- Сеть (для офлайн режима) -->
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
</manifest>
```

### 3. Иконка приложения

Иконки в `android/app/src/main/res/`:
- `mipmap-hdpi/` - 72x72px
- `mipmap-mdpi/` - 48x48px
- `mipmap-xhdpi/` - 96x96px
- `mipmap-xxhdpi/` - 144x144px
- `mipmap-xxxhdpi/` - 192x192px

Используйте: [https://romannurik.github.io/AndroidAssetStudio/](https://romannurik.github.io/AndroidAssetStudio/)

---

## 🔔 Push-уведомления для Android (FCM)

### 1. Создать Firebase проект

1. Перейдите в [Firebase Console](https://console.firebase.google.com/)
2. Создайте новый проект "Axis Calendar"
3. Добавьте Android приложение
4. Package name: `com.axiscalendar.app`
5. Скачайте `google-services.json`

### 2. Добавить google-services.json

Скопируйте файл в:
```
android/app/google-services.json
```

### 3. Настроить Gradle

В `android/build.gradle`:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

В `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.1.2'
}
```

### 4. Backend для FCM

Установите библиотеку:
```bash
pip install firebase-admin
```

Создайте сервис в `/app/backend/services/fcm_push.py`:

```python
import firebase_admin
from firebase_admin import credentials, messaging
import logging

logger = logging.getLogger(__name__)

class FCMPushService:
    def __init__(self):
        # Путь к Firebase service account key
        cred = credentials.Certificate('path/to/serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
    
    async def send_notification(self, device_token: str, title: str, body: str, data: dict = None):
        """Отправить push-уведомление на Android"""
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                token=device_token,
            )
            
            response = messaging.send(message)
            logger.info(f"✅ FCM notification sent: {response}")
            return True
        except Exception as e:
            logger.error(f"❌ FCM error: {str(e)}")
            return False
```

---

## 🔨 Сборка APK

### Debug APK (для тестирования)

```bash
cd android
./gradlew assembleDebug
```

APK будет в: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (для публикации)

1. Создайте keystore:
```bash
keytool -genkey -v -keystore axis-calendar.keystore -alias axis-calendar -keyalg RSA -keysize 2048 -validity 10000
```

2. Настройте в `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('axis-calendar.keystore')
            storePassword 'your-password'
            keyAlias 'axis-calendar'
            keyPassword 'your-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

3. Соберите release:
```bash
./gradlew assembleRelease
```

---

## 🏪 Публикация в Google Play

### 1. Создать приложение

1. Зайдите в [Google Play Console](https://play.google.com/console)
2. Создайте приложение "Axis Calendar"
3. Заполните информацию о приложении

### 2. Загрузить AAB (Android App Bundle)

```bash
cd android
./gradlew bundleRelease
```

AAB будет в: `android/app/build/outputs/bundle/release/app-release.aab`

### 3. Тестирование

- **Internal testing** - для команды (до 100 тестеров)
- **Closed testing** - для бета-тестеров
- **Open testing** - публичное бета-тестирование

### 4. Production

После тестирования можно публиковать в production.

---

## 🔄 Workflow разработки

### После изменений в React:

```bash
yarn build
npx cap sync android
npx cap open android
```

### Быстрая команда:

Добавьте в `package.json`:
```json
"scripts": {
  "build:android": "yarn build && npx cap sync android",
  "open:android": "npx cap open android"
}
```

Используйте:
```bash
yarn build:android
yarn open:android
```

---

## 🧪 Запуск на эмуляторе

### Создать эмулятор

1. В Android Studio: Tools → Device Manager
2. Create Virtual Device
3. Выберите устройство (Pixel 7 Pro рекомендуется)
4. Выберите API Level 33+ (Android 13+)

### Запустить приложение

1. Запустите эмулятор
2. В Android Studio нажмите Run (▶️) или `Shift + F10`

---

## 🐛 Отладка

### Logcat в Android Studio

View → Tool Windows → Logcat

Все `console.log()` будут видны здесь.

### Chrome DevTools

1. Запустите приложение на устройстве/эмуляторе
2. Откройте Chrome
3. Перейдите на `chrome://inspect`
4. Выберите ваше приложение
5. Откроется DevTools с Console, Network, etc.

---

## 📚 Полезные ссылки

- **Android Studio**: [https://developer.android.com/studio](https://developer.android.com/studio)
- **Capacitor Android**: [https://capacitorjs.com/docs/android](https://capacitorjs.com/docs/android)
- **Firebase Cloud Messaging**: [https://firebase.google.com/docs/cloud-messaging](https://firebase.google.com/docs/cloud-messaging)
- **Google Play Console**: [https://play.google.com/console](https://play.google.com/console)

---

## ✅ Checklist для Android

- [ ] Установить Android Studio
- [ ] Добавить Android платформу: `npx cap add android`
- [ ] Настроить Bundle ID
- [ ] Добавить иконки приложения
- [ ] Настроить Firebase (для push)
- [ ] Протестировать на эмуляторе
- [ ] Создать keystore для release
- [ ] Собрать release APK/AAB
- [ ] Загрузить в Google Play Console
- [ ] Провести тестирование
- [ ] Опубликовать!

---

## 💡 Советы

1. **Начните с iOS** - обычно проще для первого релиза
2. **Тестируйте на реальных устройствах** - эмуляторы не всегда точны
3. **Material Design** - используйте для Android-специфичного UI
4. **Размер приложения** - оптимизируйте изображения и код
5. **Версионирование** - синхронизируйте версии iOS и Android

---

**Готово!** Теперь у вас будет мультиплатформенное приложение! 🎉
