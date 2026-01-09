#!/bin/bash

# 📱 Скрипт автоматической сборки iOS приложения Axis Calendar
# Использование: ./build-ios.sh

set -e  # Выйти при ошибке

echo "🚀 Начинаем сборку iOS приложения Axis Calendar..."
echo ""

# Переходим в директорию frontend
cd "$(dirname "$0")/frontend"

# Проверяем наличие node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости..."
    yarn install
    echo "✅ Зависимости установлены"
    echo ""
fi

# Создаем production build
echo "🔨 Создаем production build..."
yarn build
echo "✅ Build создан"
echo ""

# Синхронизируем с iOS
echo "🔄 Синхронизируем с iOS проектом..."
npx cap sync ios
echo "✅ Синхронизация завершена"
echo ""

# Проверяем статус Capacitor
echo "🔍 Проверяем конфигурацию Capacitor..."
npx cap doctor
echo ""

echo "✨ Сборка завершена успешно!"
echo ""
echo "📱 Следующие шаги:"
echo "1. Откройте Xcode:"
echo "   yarn cap:open:ios"
echo ""
echo "2. Выберите симулятор (iPhone 15 Pro рекомендуется)"
echo ""
echo "3. Нажмите Run (▶️) или Cmd+R"
echo ""
echo "🎉 Готово! Приложение готово к запуску в Xcode"
