# 🔐 Безопасное Управление Пользователями

## Автоматическое Создание Админа

При каждом запуске приложения автоматически создается пользователь-администратор.

### Как это работает?

1. **При старте приложения** (`server.py` → `startup_event`)
2. **Вызывается** `initialize_default_data(db)` из `services/init_data.py`
3. **Проверяется** существование пользователя с email из переменной `ADMIN_EMAIL`
4. **Если не существует** - создается новый администратор с креденшелами из `.env`
5. **Если существует** - пропускается (идемпотентность)

### Конфигурация через Environment Variables

Логин и пароль **НЕ хардкодятся** в коде, а берутся из файла `.env`:

```bash
# backend/.env
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=admin123
```

### 🛡️ Безопасность

#### ✅ Что сделано правильно:

1. **Переменные окружения** - креденшелы не в коде
2. **`.env` в `.gitignore`** - не коммитятся в репозиторий
3. **`.env.example`** - шаблон для новых установок
4. **Идемпотентность** - пользователь создается только один раз
5. **Хеширование паролей** - bcrypt, не plain text
6. **Дефолтные календари** - создаются автоматически ("Открытый" и "Закрытый")

#### ⚠️ Важные Рекомендации:

1. **Production**: Обязательно измените `ADMIN_PASSWORD` на сложный пароль!
   ```bash
   # Используйте генератор паролей:
   openssl rand -base64 32
   ```

2. **JWT_SECRET**: Измените на случайный ключ:
   ```bash
   openssl rand -hex 32
   ```

3. **После первого входа**: Смените пароль через UI приложения

### Как использовать в новом окружении

1. **Скопируйте `.env.example` в `.env`**:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Отредактируйте значения**:
   ```bash
   nano backend/.env
   ```

3. **Запустите приложение**:
   ```bash
   sudo supervisorctl restart backend
   ```

4. **Проверьте логи**:
   ```bash
   tail -f /var/log/supervisor/backend.err.log | grep admin
   ```

### Логин в приложение

**URL**: http://your-domain.com/login

**Креденшелы по умолчанию**:
- Email: `admin@company.com`
- Password: `admin123`

⚠️ **Сразу после входа смените пароль!**

### Создание дополнительных пользователей

1. **Через UI** (только для админов):
   - Войдите как администратор
   - Перейдите в раздел "Пользователи"
   - Нажмите "Создать пользователя"

2. **Через API**:
   ```bash
   curl -X POST http://localhost:8001/api/users \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@company.com",
       "name": "Иван Иванов",
       "password": "secure_password",
       "role": "user"
     }'
   ```

### Структура Ролей

- **admin** - полный доступ ко всем функциям
- **manager** - управление шаблонами и пользователями
- **user** - базовый доступ к календарю

### Технические Детали

**Файл**: `backend/services/init_data.py`

```python
# Безопасно: берем из environment
admin_email = os.environ.get('ADMIN_EMAIL', 'admin@company.com')
admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Идемпотентность: проверяем существование
existing_admin = await db.users.find_one({"email": admin_email})
if not existing_admin:
    # Создаем только если не существует
    admin_user = {...}
    await db.users.insert_one(admin_user)
    
    # + Создаем дефолтные календари
    await db.calendars.insert_many(default_calendars)
```

### FAQ

**Q: Что если я забыл пароль?**
A: Измените `ADMIN_PASSWORD` в `.env` и удалите пользователя из БД:
```bash
mongo test_database --eval 'db.users.deleteOne({email: "admin@company.com"})'
```
Затем перезапустите backend - пользователь создастся заново.

**Q: Можно ли изменить email администратора?**
A: Да, просто измените `ADMIN_EMAIL` в `.env` перед первым запуском.

**Q: Пароль хранится в plain text?**
A: Нет! Используется bcrypt hashing перед сохранением в БД.

**Q: Нужно ли создавать пользователя вручную?**
A: Нет, он создается автоматически при первом запуске.

---

## 🚀 Quick Start

```bash
# 1. Настройте .env
cp backend/.env.example backend/.env
nano backend/.env  # Измените ADMIN_PASSWORD

# 2. Запустите приложение
sudo supervisorctl restart backend

# 3. Войдите в систему
# http://localhost:3000/login
# Email: admin@company.com
# Password: (ваш пароль из .env)
```

✅ **Готово! Безопасный администратор создан автоматически.**
