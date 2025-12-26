import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { Users, Layout, Calendar, User, Sun, Moon, LogOut, ArrowLeft, Settings } from 'lucide-react';

export const SettingsSidebar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const navLinkClass = ({ isActive }) => 
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
      isActive 
        ? 'bg-accent text-foreground font-medium' 
        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
    }`;

  return (
    <aside className="w-[260px] bg-card border-r border-border h-screen fixed left-0 top-0 z-50 flex flex-col">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-5 border-b border-border">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Назад к календарю</span>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Настройки
          </p>
          
          <nav className="space-y-1">
            {isAdmin() && (
              <NavLink to="/settings/users" className={navLinkClass} data-testid="settings-nav-users">
                <Users className="w-5 h-5" />
                Пользователи
              </NavLink>
            )}

            <NavLink to="/settings/templates" className={navLinkClass} data-testid="settings-nav-templates">
              <Layout className="w-5 h-5" />
              Шаблоны
            </NavLink>

            <NavLink to="/settings/calendars" className={navLinkClass} data-testid="settings-nav-calendars">
              <Calendar className="w-5 h-5" />
              Внешние календари
            </NavLink>

            <NavLink to="/settings/profile" className={navLinkClass} data-testid="settings-nav-profile">
              <User className="w-5 h-5" />
              Профиль
            </NavLink>
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <button onClick={toggleTheme} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50" data-testid="theme-toggle">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          </button>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-medium text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.role === 'admin' ? 'Админ' : user?.role === 'manager' ? 'Руководитель' : 'Помощник'}
              </p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-background" title="Выйти" data-testid="logout-button">
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SettingsSidebar;
