import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { Toaster } from './components/ui/sonner';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';
import LoginPage from './pages/LoginPage';
import CalendarPage from './pages/CalendarPage';
import NotFoundPage from './pages/NotFoundPage';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import './App.css';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route - redirects to home if already logged in
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      {/* 404 page for all other routes */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Определяем, запущено ли приложение как нативное
    setIsNative(Capacitor.isNativePlatform());
    
    // Логируем платформу для отладки
    console.log('🔍 Platform:', Capacitor.getPlatform());
    console.log('🔍 Is Native:', Capacitor.isNativePlatform());
  }, []);

  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster 
            position="top-right"
            toastOptions={{
              className: 'glass',
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
