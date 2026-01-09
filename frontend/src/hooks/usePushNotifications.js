import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export const usePushNotifications = () => {
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Push-уведомления работают только на нативных платформах
    if (!Capacitor.isNativePlatform()) {
      console.log('⚠️ Push notifications are not supported on web');
      return;
    }

    setIsSupported(true);
    initializePushNotifications();
  }, []);

  const initializePushNotifications = async () => {
    try {
      // Запрос разрешения на уведомления
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        console.log('✅ Push notification permission granted');
        await PushNotifications.register();
      } else {
        console.log('⚠️ Push notification permission denied');
        setError('Permission denied');
      }

      // Слушатель для получения токена
      await PushNotifications.addListener('registration', (token) => {
        console.log('✅ Push registration success, token:', token.value);
        setToken(token.value);
      });

      // Слушатель для ошибок регистрации
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('❌ Push registration error:', error);
        setError(error);
      });

      // Слушатель для входящих уведомлений (когда приложение на переднем плане)
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('🔔 Push notification received:', notification);
      });

      // Слушатель для нажатий на уведомления
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('🔔 Push notification action performed:', notification);
      });
    } catch (err) {
      console.error('❌ Error initializing push notifications:', err);
      setError(err.message);
    }
  };

  const sendTokenToBackend = async (userId) => {
    if (!token) {
      console.log('⚠️ No push token available');
      return;
    }

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://single-server-app.preview.emergentagent.com';
      const response = await fetch(`${backendUrl}/api/users/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          token,
          platform: Capacitor.getPlatform(),
        }),
      });

      if (response.ok) {
        console.log('✅ Push token sent to backend');
      } else {
        console.error('❌ Failed to send push token to backend');
      }
    } catch (err) {
      console.error('❌ Error sending push token:', err);
    }
  };

  return {
    token,
    error,
    isSupported,
    sendTokenToBackend,
  };
};
