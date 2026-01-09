import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from './api';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const AuthContext = createContext(null);

// Утилиты для работы с хранилищем (работают и на веб, и на нативных платформах)
const storage = {
  getItem: async (key) => {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },
  removeItem: async (key) => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = await storage.getItem('token');
      const storedUser = await storage.getItem('user');
      
      if (storedToken) {
        try {
          // Пытаемся получить актуальные данные с сервера
          const response = await getMe();
          setUser(response.data);
          setToken(storedToken);
        } catch (error) {
          console.log('⚠️ Cannot fetch user from server, using cached data');
          
          // Если офлайн или ошибка сервера, используем кешированные данные
          if (storedUser) {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
          } else {
            // Если нет кешированных данных, разлогиниваем
            await storage.removeItem('token');
            await storage.removeItem('user');
            setToken(null);
          }
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const loginUser = async (userData, accessToken) => {
    await storage.setItem('token', accessToken);
    await storage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  };

  const logout = async () => {
    await storage.removeItem('token');
    await storage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const isAdmin = () => user?.role === 'admin';
  const isManager = () => user?.role === 'manager';
  const isAssistant = () => user?.role === 'assistant';
  const canManage = () => isAdmin() || isManager();

  // Quick user switch for testing (uses stored credentials)
  const switchUser = async (userData, accessToken) => {
    await storage.setItem('token', accessToken);
    await storage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    // Reload page to reset all state
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginUser, logout, isAdmin, isManager, isAssistant, canManage, switchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
