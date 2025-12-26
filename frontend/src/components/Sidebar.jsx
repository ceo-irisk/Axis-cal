import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useState, useEffect } from 'react';
import { getCalendars, addCalendar, deleteCalendar } from '../lib/api';
import { Sun, Moon, LogOut, Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronRight, PanelLeftClose, PanelLeft } from 'lucide-react';
import { toast } from 'sonner';

const CALENDAR_COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#14b8a6'
];

export const Sidebar = ({ isOpen, onClose, onCalendarsChange, collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [calendars, setCalendars] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [newCalColor, setNewCalColor] = useState('#8b5cf6');
  const [hiddenCalendars, setHiddenCalendars] = useState(new Set());
  const [myCalendarsExpanded, setMyCalendarsExpanded] = useState(true);
  const [externalCalendarsExpanded, setExternalCalendarsExpanded] = useState(true);

  useEffect(() => {
    fetchCalendars();
  }, []);

  const fetchCalendars = async () => {
    try {
      const res = await getCalendars();
      setCalendars(res.data || []);
      onCalendarsChange?.(res.data || []);
    } catch (e) { console.error(e); }
  };

  const handleAddCalendar = async () => {
    if (!newCalName.trim()) return;
    try {
      await addCalendar(newCalName, 'custom', newCalColor);
      setNewCalName('');
      setShowAddForm(false);
      fetchCalendars();
      toast.success('Календарь создан');
    } catch (e) { toast.error('Ошибка создания'); }
  };

  const handleDeleteCalendar = async (id) => {
    if (!confirm('Удалить календарь?')) return;
    try {
      await deleteCalendar(id);
      fetchCalendars();
      toast.success('Календарь удалён');
    } catch (e) { toast.error('Ошибка удаления'); }
  };

  const toggleCalendarVisibility = (id) => {
    setHiddenCalendars(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Разделяем календари на "мои" (custom) и "внешние" (google, yandex и т.д.)
  const myCalendars = calendars.filter(c => c.provider === 'custom');
  const externalCalendars = calendars.filter(c => c.provider !== 'custom');

  const handleLogout = () => { logout(); navigate('/login'); };
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`} data-testid="sidebar">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                {!collapsed && (
                  <div>
                    <h2 className="font-semibold text-sm">Axis</h2>
                    <p className="text-xs text-muted-foreground">Calendar</p>
                  </div>
                )}
              </div>
              {onToggleCollapse && (
                <button 
                  onClick={onToggleCollapse} 
                  className="p-1.5 rounded-lg hover:bg-accent hidden lg:flex"
                  title={collapsed ? 'Развернуть' : 'Свернуть'}
                  data-testid="toggle-sidebar"
                >
                  {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Calendars section */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Мои календари */}
            <button onClick={() => setMyCalendarsExpanded(!myCalendarsExpanded)} className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 hover:text-foreground">
              {!collapsed && <span>Мои календари</span>}
              {!collapsed && (myCalendarsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
            </button>

            {myCalendarsExpanded && !collapsed && (
              <div className="space-y-1 mb-6">
                {/* Default calendar */}
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/50 group">
                  <div className="w-3 h-3 rounded-full bg-violet-500" />
                  <span className="text-sm flex-1">Основной</span>
                  <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </div>

                {myCalendars.map(cal => (
                  <div key={cal.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/50 group" data-testid={`sidebar-cal-${cal.id}`}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color }} />
                    <span className={`text-sm flex-1 ${hiddenCalendars.has(cal.id) ? 'line-through text-muted-foreground' : ''}`}>{cal.name}</span>
                    <button onClick={() => toggleCalendarVisibility(cal.id)} className="opacity-0 group-hover:opacity-100">
                      {hiddenCalendars.has(cal.id) ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <button onClick={() => handleDeleteCalendar(cal.id)} className="opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}

                {/* Add calendar form */}
                {showAddForm ? (
                  <div className="p-3 rounded-lg bg-accent/50 space-y-3 mt-2">
                    <input
                      type="text"
                      value={newCalName}
                      onChange={(e) => setNewCalName(e.target.value)}
                      placeholder="Название календаря"
                      className="w-full input-glass text-sm"
                      autoFocus
                      data-testid="new-calendar-name"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {CALENDAR_COLORS.map(c => (
                        <button key={c} onClick={() => setNewCalColor(c)} className={`w-6 h-6 rounded-full ${newCalColor === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : ''}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddForm(false)} className="flex-1 btn-secondary text-xs py-1.5">Отмена</button>
                      <button onClick={handleAddCalendar} className="flex-1 btn-primary text-xs py-1.5" data-testid="save-new-calendar">Создать</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50" data-testid="add-calendar-btn">
                    <Plus className="w-4 h-4" />
                    Добавить календарь
                  </button>
                )}
              </div>
            )}

            {/* Внешние календари */}
            {!collapsed && (
              <>
                <button onClick={() => setExternalCalendarsExpanded(!externalCalendarsExpanded)} className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 hover:text-foreground">
                  <span>Внешние календари</span>
                  {externalCalendarsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {externalCalendarsExpanded && (
                  <div className="space-y-1">
                    {externalCalendars.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2 py-2">Нет подключённых календарей</p>
                    ) : (
                      externalCalendars.map(cal => (
                        <div key={cal.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/50 group">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color }} />
                          <span className={`text-sm flex-1 ${hiddenCalendars.has(cal.id) ? 'line-through text-muted-foreground' : ''}`}>{cal.name}</span>
                          <button onClick={() => toggleCalendarVisibility(cal.id)} className="opacity-0 group-hover:opacity-100">
                            {hiddenCalendars.has(cal.id) ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        </div>
                      ))
                    )}
                    <NavLink 
                      to="/settings" 
                      className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    >
                      <Plus className="w-4 h-4" />
                      Подключить
                    </NavLink>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-2">
            <NavLink to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50" data-testid="nav-settings">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Настройки
            </NavLink>

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
                <p className="text-xs text-muted-foreground truncate">{user?.role === 'admin' ? 'Админ' : user?.role === 'manager' ? 'Руководитель' : 'Помощник'}</p>
              </div>
              <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-background" title="Выйти" data-testid="logout-button">
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
