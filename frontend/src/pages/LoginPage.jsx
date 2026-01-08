import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { login } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, Mail, AlertCircle, Sun, Moon } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password);
      loginUser(response.data.user, response.data.access_token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка входа. Проверьте данные.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]" data-testid="login-page">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-3 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-md hover:bg-[var(--accent-secondary)] transition-colors"
        data-testid="login-theme-toggle"
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-[var(--primary-text)]" />
        ) : (
          <Moon className="w-5 h-5 text-[var(--primary-text)]" />
        )}
      </button>
      
      <div className="relative w-full max-w-md animate-fade-in">
        <div className="card-glass rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 mb-4">
              <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M111.554 459.996L237.004 73.9961H274.949L400.387 459.996H354.328L256.018 153.538L155.081 459.996H111.554Z" fill="#B0B0B0"/>
                <path d="M317.402 294.189H256V312.189H317.402V294.189Z" fill="#B0B0B0"/>
                <path d="M256 330.689C271.188 330.689 283.5 318.377 283.5 303.189C283.5 288.001 271.188 275.689 256 275.689C240.812 275.689 228.5 288.001 228.5 303.189C228.5 318.377 240.812 330.689 256 330.689Z" fill="#085C53"/>
              </svg>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mb-2 text-[var(--primary-text)]">
              Axis
            </h1>
            <p className="text-[var(--secondary-text)] text-sm">
              Вход в систему
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm animate-slide-up" data-testid="login-error">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-[var(--secondary-text)]">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--secondary-text)]" strokeWidth={1.5} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  required
                  className="pl-10 h-12 bg-[var(--surface)] border-[var(--border-strong)] rounded-xl focus:border-[#085C53] focus:ring-0"
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-[var(--secondary-text)]">
                Пароль
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--secondary-text)]" strokeWidth={1.5} />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10 h-12 bg-[var(--surface)] border-[var(--border-strong)] rounded-xl focus:border-[#085C53] focus:ring-0"
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-[#085C53] text-white hover:bg-[#074a44] font-medium transition-opacity"
              data-testid="login-submit-button"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                  Вход...
                </span>
              ) : (
                'Войти'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-[var(--secondary-text)] mt-6">
            Нет аккаунта? Обратитесь к администратору
          </p>
        </div>
      </div>
    </div>
  );
}
