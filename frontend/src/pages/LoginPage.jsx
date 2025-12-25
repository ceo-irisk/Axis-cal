import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { login } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginUser } = useAuth();

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
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="login-page">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_50%)]" />
      </div>
      
      <div className="relative w-full max-w-md animate-fade-in">
        <div className="glass-heavy rounded-3xl p-8 shadow-card">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 mb-4">
              <Calendar className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              Executive Calendar
            </h1>
            <p className="text-secondary-text text-sm">
              Вход в систему управления календарём
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-slide-up" data-testid="login-error">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-secondary-text">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-text" strokeWidth={1.5} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  required
                  className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl focus:border-white/20 focus:ring-0"
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-secondary-text">
                Пароль
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-text" strokeWidth={1.5} />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl focus:border-white/20 focus:ring-0"
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium transition-opacity"
              data-testid="login-submit-button"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Вход...
                </span>
              ) : (
                'Войти'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-secondary-text mt-6">
            Нет аккаунта? Обратитесь к администратору
          </p>
        </div>
      </div>
    </div>
  );
}
