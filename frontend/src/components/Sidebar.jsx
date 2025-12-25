import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { Calendar, LayoutGrid, Settings, Users, LogOut, CalendarDays, FileText, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { useState } from 'react';

export const Sidebar = ({ isOpen, onClose, currentView, onViewChange }) => {
  const { user, logout, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: Calendar, label: 'Календарь', testId: 'nav-calendar' },
    { to: '/templates', icon: FileText, label: 'Шаблоны', testId: 'nav-templates' },
    { to: '/settings', icon: Settings, label: 'Настройки', testId: 'nav-settings' },
  ];

  if (isAdmin()) {
    navItems.push({ to: '/admin', icon: Users, label: 'Админ-панель', testId: 'nav-admin' });
  }

  const viewItems = [
    { view: 'month', icon: LayoutGrid, label: 'Месяц' },
    { view: 'week', icon: CalendarDays, label: 'Неделя' },
    { view: 'day', icon: Calendar, label: 'День' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      <aside 
        className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? '!w-20' : 'w-[280px]'} transition-all duration-300`}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-secondary)] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[var(--primary-text)]" strokeWidth={1.5} />
              </div>
              {!collapsed && (
                <div className="animate-fade-in">
                  <h2 className="font-semibold text-sm text-[var(--primary-text)]">Executive</h2>
                  <p className="text-xs text-[var(--secondary-text)]">Calendar</p>
                </div>
              )}
            </div>
          </div>

          {/* View switcher */}
          {onViewChange && !collapsed && (
            <div className="px-4 py-4 border-b border-[var(--border)]">
              <p className="text-xs text-[var(--secondary-text)] mb-3 px-2">Вид</p>
              <div className="space-y-1">
                {viewItems.map(item => (
                  <button
                    key={item.view}
                    onClick={() => onViewChange(item.view)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                      currentView === item.view 
                        ? 'bg-[var(--accent-secondary)] text-[var(--primary-text)] font-medium' 
                        : 'text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--accent-secondary)]'
                    }`}
                    data-testid={`view-${item.view}`}
                  >
                    <item.icon className="w-4 h-4" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4">
            <p className={`text-xs text-[var(--secondary-text)] mb-3 px-2 ${collapsed ? 'hidden' : ''}`}>Навигация</p>
            <div className="space-y-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive 
                        ? 'bg-[var(--accent-secondary)] text-[var(--primary-text)] font-medium' 
                        : 'text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--accent-secondary)]'
                    }`
                  }
                  data-testid={item.testId}
                >
                  <item.icon className="w-5 h-5" strokeWidth={1.5} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Theme toggle */}
          <div className="px-4 pb-2">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--accent-secondary)]"
              data-testid="theme-toggle"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-5 h-5" strokeWidth={1.5} />
                  {!collapsed && <span>Светлая тема</span>}
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5" strokeWidth={1.5} />
                  {!collapsed && <span>Тёмная тема</span>}
                </>
              )}
            </button>
          </div>

          {/* User section */}
          <div className="p-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--accent-secondary)]">
              <div className="w-9 h-9 rounded-full bg-[var(--border-strong)] flex items-center justify-center text-sm font-medium text-[var(--primary-text)]">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-[var(--primary-text)]">{user?.name}</p>
                  <p className="text-xs text-[var(--secondary-text)] truncate">
                    {user?.role === 'admin' ? 'Администратор' : user?.role === 'manager' ? 'Руководитель' : 'Помощник'}
                  </p>
                </div>
              )}
              <button 
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-[var(--border)] transition-colors"
                title="Выйти"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 text-[var(--secondary-text)]" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--accent-secondary)] transition-colors hidden lg:flex shadow-sm"
            data-testid="collapse-sidebar"
          >
            {collapsed ? (
              <ChevronRight className="w-3 h-3 text-[var(--primary-text)]" />
            ) : (
              <ChevronLeft className="w-3 h-3 text-[var(--primary-text)]" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
