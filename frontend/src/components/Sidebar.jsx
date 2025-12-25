import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Calendar, LayoutGrid, Settings, Users, LogOut, CalendarDays, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export const Sidebar = ({ isOpen, onClose, currentView, onViewChange }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

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
        className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'w-20' : 'w-[280px]'} transition-all duration-300`}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Calendar className="w-5 h-5" strokeWidth={1.5} />
              </div>
              {!collapsed && (
                <div className="animate-fade-in">
                  <h2 className="font-semibold text-sm">Executive</h2>
                  <p className="text-xs text-secondary-text">Calendar</p>
                </div>
              )}
            </div>
          </div>

          {/* View switcher */}
          {onViewChange && !collapsed && (
            <div className="px-4 py-4 border-b border-white/5">
              <p className="text-xs text-secondary-text mb-3 px-2">Вид</p>
              <div className="space-y-1">
                {viewItems.map(item => (
                  <button
                    key={item.view}
                    onClick={() => onViewChange(item.view)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                      currentView === item.view 
                        ? 'bg-white/10 text-white' 
                        : 'text-secondary-text hover:text-white hover:bg-white/5'
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
            <p className={`text-xs text-secondary-text mb-3 px-2 ${collapsed ? 'hidden' : ''}`}>Навигация</p>
            <div className="space-y-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive 
                        ? 'bg-white/10 text-white' 
                        : 'text-secondary-text hover:text-white hover:bg-white/5'
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

          {/* User section */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-secondary-text truncate">
                    {user?.role === 'admin' ? 'Администратор' : user?.role === 'manager' ? 'Руководитель' : 'Помощник'}
                  </p>
                </div>
              )}
              <button 
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Выйти"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 text-secondary-text" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors hidden lg:flex"
            data-testid="collapse-sidebar"
          >
            {collapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
