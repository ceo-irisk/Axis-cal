import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // Для веб-версии используем стандартный navigator.onLine
      setIsOnline(navigator.onLine);
      
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Для нативной платформы используем Capacitor Network API
    let listener;

    const initNetworkStatus = async () => {
      try {
        // Получаем текущий статус сети
        const status = await Network.getStatus();
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);
        
        console.log('🌐 Network status:', status);

        // Подписываемся на изменения статуса сети
        listener = await Network.addListener('networkStatusChange', (status) => {
          console.log('🌐 Network status changed:', status);
          setIsOnline(status.connected);
          setConnectionType(status.connectionType);
        });
      } catch (err) {
        console.error('❌ Error getting network status:', err);
      }
    };

    initNetworkStatus();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, []);

  return {
    isOnline,
    connectionType,
  };
};
