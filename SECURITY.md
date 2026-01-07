# 🔐 Безопасность и Лучшие Практики

## Environment Variables

### ✅ Что делаем правильно:

1. **Не коммитим `.env` в git**
   ```bash
   # .gitignore
   .env
   *.env
   ```

2. **Используем `.env.example` как шаблон**
   ```bash
   cp backend/.env.example backend/.env
   # Затем редактируем backend/.env с реальными значениями
   ```

3. **Хешируем пароли** (bcrypt)
   - Пароли никогда не хранятся в plain text
   - Используется bcrypt с salt

4. **JWT токены** с expiration
   - Access token expires через 24 часа
   - Требует повторную авторизацию

### 🔒 Конфигурация для Production

#### 1. Измените критические переменные:

```bash
# backend/.env

# ⚠️ ОБЯЗАТЕЛЬНО ИЗМЕНИТЕ:
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=$(openssl rand -base64 32)

# Рекомендуется:
ADMIN_EMAIL=your_real_email@company.com
```

#### 2. Настройте CORS правильно:

```bash
# Development
CORS_ORIGINS="*"

# Production (замените на ваш домен)
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

#### 3. MongoDB Connection:

```bash
# Development
MONGO_URL="mongodb://localhost:27017"

# Production (используйте учетные данные)
MONGO_URL="mongodb://username:password@your-mongo-host:27017/?authSource=admin"
```

### 🛡️ Чеклист Безопасности

#### Перед Deployment:

- [ ] Изменен `JWT_SECRET` на случайный ключ
- [ ] Изменен `ADMIN_PASSWORD` на сложный пароль
- [ ] CORS настроен на конкретные домены (не "*")
- [ ] MongoDB использует аутентификацию
- [ ] `.env` файл в `.gitignore`
- [ ] Логи не содержат чувствительных данных
- [ ] HTTPS настроен на production

#### После Первого Запуска:

- [ ] Войдите как администратор
- [ ] Смените пароль через UI
- [ ] Создайте обычных пользователей
- [ ] Проверьте права доступа
- [ ] Настройте backup MongoDB

### 🔑 Генерация Безопасных Ключей

```bash
# JWT Secret (используйте один из вариантов)
openssl rand -hex 32
# или
python3 -c "import secrets; print(secrets.token_hex(32))"

# Admin Password
openssl rand -base64 32
# или
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 📝 Пример .env для Production

```bash
# MongoDB Configuration
MONGO_URL="mongodb://axis_user:SECURE_PASSWORD@mongo.yourcompany.com:27017/axis_calendar?authSource=admin"
DB_NAME="axis_calendar_prod"

# CORS (только ваши домены!)
CORS_ORIGINS="https://calendar.yourcompany.com"

# External Services
EMERGENT_LLM_KEY=your_emergent_key_here

# Security (ИЗМЕНИТЕ ЭТИ ЗНАЧЕНИЯ!)
JWT_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=SuperSecureRandomPassword123!@#$

# Optional: Rate Limiting
# RATE_LIMIT_PER_MINUTE=60
```

### 🚨 Что НЕ ДЕЛАТЬ:

❌ **Не коммитьте `.env` в git**
```bash
# ПЛОХО:
git add backend/.env
git commit -m "Added configuration"
```

❌ **Не используйте слабые пароли**
```bash
# ПЛОХО:
ADMIN_PASSWORD=123456
ADMIN_PASSWORD=admin
ADMIN_PASSWORD=password
```

❌ **Не используйте `CORS_ORIGINS="*"` в production**
```bash
# ПЛОХО для production:
CORS_ORIGINS="*"

# ХОРОШО:
CORS_ORIGINS="https://yourdomain.com"
```

❌ **Не храните ключи в коде**
```python
# ПЛОХО:
JWT_SECRET = "my_secret_key"

# ХОРОШО:
JWT_SECRET = os.environ.get('JWT_SECRET')
```

### 🔄 Ротация Ключей

Если ключи скомпрометированы:

1. **Измените JWT_SECRET**:
   ```bash
   # Сгенерируйте новый ключ
   echo "JWT_SECRET=$(openssl rand -hex 32)" >> backend/.env
   
   # Перезапустите backend
   sudo supervisorctl restart backend
   ```
   ⚠️ Все пользователи должны будут войти заново

2. **Измените пароль администратора**:
   ```bash
   # Через UI приложения (рекомендуется)
   # ИЛИ через скрипт reset_admin.py
   python3 /app/reset_admin.py
   ```

### 📊 Мониторинг

Следите за:
- Неудачными попытками входа
- Подозрительной активностью API
- Изменениями прав доступа
- Созданием новых пользователей

```bash
# Логи аутентификации
tail -f /var/log/supervisor/backend.err.log | grep "login"

# Ошибки
tail -f /var/log/supervisor/backend.err.log | grep "ERROR"
```

### 🆘 Восстановление Доступа

Если забыли пароль администратора:

```bash
# 1. Удалите старого админа
python3 /app/reset_admin.py

# 2. Измените пароль в .env
nano /app/backend/.env
# Измените ADMIN_PASSWORD на новый

# 3. Перезапустите backend
sudo supervisorctl restart backend

# 4. Войдите с новым паролем
```

---

## 🎯 Quick Security Checklist

```bash
# 1. Проверьте .env
cat backend/.env | grep -E "SECRET|PASSWORD"

# 2. Проверьте .gitignore
grep ".env" .gitignore

# 3. Проверьте JWT secret (должен быть длинным)
cat backend/.env | grep JWT_SECRET

# 4. Проверьте CORS
cat backend/.env | grep CORS_ORIGINS

# 5. Войдите как админ и смените пароль через UI
```

✅ **Безопасность настроена!**
