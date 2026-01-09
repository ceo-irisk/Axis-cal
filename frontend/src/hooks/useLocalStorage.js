import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Хук для работы с локальным хранилищем
 * Автоматически использует Capacitor Preferences для нативных платформ
 * и localStorage для веб-версии
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  // Получить значение из хранилища
  const getValue = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { value } = await Preferences.get({ key });
        return value ? JSON.parse(value) : initialValue;
      } else {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      }
    } catch (error) {
      console.error(`❌ Error reading from storage (${key}):`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  // Загрузить значение при монтировании
  useEffect(() => {
    const loadValue = async () => {
      setIsLoading(true);
      const value = await getValue();
      setStoredValue(value);
      setIsLoading(false);
    };

    loadValue();
  }, [getValue]);

  // Сохранить значение в хранилище
  const setValue = useCallback(
    async (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (Capacitor.isNativePlatform()) {
          await Preferences.set({
            key,
            value: JSON.stringify(valueToStore),
          });
        } else {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
        
        console.log(`✅ Saved to storage (${key})`);
      } catch (error) {
        console.error(`❌ Error writing to storage (${key}):`, error);
      }
    },
    [key, storedValue]
  );

  // Удалить значение из хранилища
  const removeValue = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key });
      } else {
        window.localStorage.removeItem(key);
      }
      setStoredValue(initialValue);
      console.log(`✅ Removed from storage (${key})`);
    } catch (error) {
      console.error(`❌ Error removing from storage (${key}):`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue, isLoading];
};

/**
 * Утилита для очистки всего хранилища
 */
export const clearAllStorage = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Preferences.clear();
    } else {
      window.localStorage.clear();
    }
    console.log('✅ All storage cleared');
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
  }
};
