import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useState, useEffect } from 'react';
import { 
  getCalendars, addCalendar, deleteCalendar,
  getEventTypes, createEventType, updateEventType, deleteEventType,
  getEventStatuses, createEventStatus, updateEventStatus, deleteEventStatus,
  getTemplates, createTemplate, updateTemplate, deleteTemplate, applyTemplate
} from '../lib/api';
import { 
  Sun, Moon, LogOut, Plus, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight,
  Calendar, LayoutGrid, Settings, Star, AlertTriangle, Clock, MapPin, FileText,
  Users, Layout as LayoutIcon, Square, CheckCircle2, Zap, Video, Book, Edit2, Play, ArrowLeft, Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

// Helper to format event time in local timezone
const formatEventTime = (isoString) => {
  try {
    const date = new Date(isoString);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch {
    return isoString?.slice(11, 16) || '00:00';
  }
};

// Event icons component
const EventIcons = ({ event }) => {
  const icons = [];
  if (event.is_blocked) icons.push(<Square key="blocked" className="w-3 h-3 text-red-500 fill-red-500" />);
  if (event.is_completed) icons.push(<CheckCircle2 key="completed" className="w-3 h-3 text-green-500" />);
  if (event.is_urgent) icons.push(<Zap key="urgent" className="w-3 h-3 text-amber-500 fill-amber-500" />);
  if (event.is_video_call) icons.push(<Video key="video" className="w-3 h-3 text-blue-500" />);
  if (icons.length === 0) return null;
  return <div className="flex items-center gap-0.5">{icons}</div>;
};

const CALENDAR_COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#14b8a6'
];

// Tab identifiers
const TABS = {
  EVENTS: 'events',
  CALENDARS: 'calendars', 
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings'
};

// Settings sub-tabs
const SETTINGS_TABS = {
  USERS: 'users',
  TEMPLATES: 'templates',
  EXTERNAL_CALENDARS: 'external_calendars',
  DICTIONARIES: 'dictionaries',
  PROFILE: 'profile'
};

export const Sidebar = ({ 
  isOpen, 
  onClose, 
  onCalendarsChange,
  selectedDate,
  onDateSelect,
  events = [],
  rating,
  violations,
  onRateDay,
  onOpenSurvey,
  onEventClick,
  onCreateEvent,
  onShowUsers,
  onShowCalendar,
  mainView
}) => {
  const { user, logout, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [calendars, setCalendars] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [newCalColor, setNewCalColor] = useState('#8b5cf6');
  const [hiddenCalendars, setHiddenCalendars] = useState(new Set());
  const [activeTab, setActiveTab] = useState(TABS.EVENTS);
  const [settingsTab, setSettingsTab] = useState(SETTINGS_TABS.TEMPLATES);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [hoveredStar, setHoveredStar] = useState(0);
  const [ratingNotes, setRatingNotes] = useState('');
  
  // Dictionaries state
  const [eventTypes, setEventTypes] = useState([]);
  const [eventStatuses, setEventStatuses] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  // Edit modals
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState(null);
  const [applyDate, setApplyDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchCalendars = async () => {
    try {
      const res = await getCalendars();
      setCalendars(res.data || []);
      onCalendarsChange?.(res.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchDictionaries = async () => {
    try {
      const [typesRes, statusesRes, templatesRes] = await Promise.all([
        getEventTypes(),
        getEventStatuses(),
        getTemplates()
      ]);
      setEventTypes(typesRes.data || []);
      setEventStatuses(statusesRes.data || []);
      setTemplates(templatesRes.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchCalendars();
    fetchDictionaries();
  }, []);

  // Event Types handlers
  const handleSaveEventType = async (data) => {
    try {
      if (editingType?.id && !editingType.id.startsWith('default-')) {
        await updateEventType(editingType.id, data.name, data.label, data.color, data.order || 0);
        toast.success('Тип события обновлён');
      } else {
        await createEventType(data.name, data.label, data.color);
        toast.success('Тип события создан');
      }
      setShowTypeModal(false);
      setEditingType(null);
      fetchDictionaries();
    } catch (e) { toast.error('Ошибка сохранения'); }
  };

  const handleDeleteEventType = async (id) => {
    if (id.startsWith('default-')) {
      toast.error('Нельзя удалить стандартный тип');
      return;
    }
    if (!confirm('Удалить тип события?')) return;
    try {
      await deleteEventType(id);
      toast.success('Тип события удалён');
      fetchDictionaries();
    } catch (e) { toast.error('Ошибка удаления'); }
  };

  // Event Statuses handlers
  const handleSaveEventStatus = async (data) => {
    try {
      if (editingStatus?.id && !editingStatus.id.startsWith('default-')) {
        await updateEventStatus(editingStatus.id, data.name, data.label, data.color, data.order || 0);
        toast.success('Статус события обновлён');
      } else {
        await createEventStatus(data.name, data.label, data.color);
        toast.success('Статус события создан');
      }
      setShowStatusModal(false);
      setEditingStatus(null);
      fetchDictionaries();
    } catch (e) { toast.error('Ошибка сохранения'); }
  };

  const handleDeleteEventStatus = async (id) => {
    if (id.startsWith('default-')) {
      toast.error('Нельзя удалить стандартный статус');
      return;
    }
    if (!confirm('Удалить статус события?')) return;
    try {
      await deleteEventStatus(id);
      toast.success('Статус события удалён');
      fetchDictionaries();
    } catch (e) { toast.error('Ошибка удаления'); }
  };

  // Templates handlers
  const handleSaveTemplate = async (data) => {
    try {
      if (editingTemplate?.id) {
        await updateTemplate(editingTemplate.id, data);
        toast.success('Шаблон обновлён');
      } else {
        await createTemplate(data);
        toast.success('Шаблон создан');
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      fetchDictionaries();
    } catch (e) { toast.error('Ошибка сохранения'); }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Удалить шаблон?')) return;
    try {
      await deleteTemplate(id);
      toast.success('Шаблон удалён');
      fetchDictionaries();
    } catch (e) { toast.error('Ошибка удаления'); }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateForApply || !applyDate) return;
    try {
      const result = await applyTemplate(selectedTemplateForApply.id, applyDate);
      toast.success(`Создано ${result.data.created_events?.length || 0} событий`);
      setShowApplyModal(false);
      setSelectedTemplateForApply(null);
    } catch (e) { toast.error('Ошибка применения шаблона'); }
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

  const myCalendars = calendars.filter(c => c.provider === 'custom');
  const externalCalendars = calendars.filter(c => c.provider !== 'custom');

  const handleLogout = () => { logout(); navigate('/login'); };
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // Mini calendar helpers
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Понедельник
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  // Day names starting from Monday
  const weekDayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const handleRate = (stars) => onRateDay?.(stars, ratingNotes);

  // Разделяем события на all-day и обычные
  const allDayEvents = events.filter(e => e.is_all_day);
  const timedEvents = events.filter(e => !e.is_all_day);

  // Calculate total event hours for dashboard (исключаем all-day события)
  const totalMinutes = timedEvents.reduce((acc, event) => {
    try {
      return acc + (new Date(event.end_time) - new Date(event.start_time)) / 60000;
    } catch { return acc; }
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = Math.round(totalMinutes % 60);

  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const isTodayDate = dateStr === format(new Date(), 'yyyy-MM-dd');

  // Check which days have events for mini calendar dots
  const getEventsForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(e => e.start_time?.startsWith(dayStr));
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} data-testid="sidebar">
        <div className="flex flex-col h-full">
          
          {/* Header - User info + Add Event button */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={handleLogout} className="p-1 rounded-lg hover:bg-accent" title="Выйти" data-testid="logout-button">
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-medium text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.role === 'admin' ? 'Админ' : user?.role === 'manager' ? 'Руководитель' : 'Помощник'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onCreateEvent} 
                className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-700 flex items-center justify-center text-white"
                title="Создать событие"
                data-testid="create-event-button"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mini Calendar */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                <span className="text-violet-500">{format(calendarMonth, 'LLLL', { locale: ru })}</span>
                {' '}
                <span className="text-muted-foreground">{format(calendarMonth, 'yyyy')}</span>
              </h2>
              <div className="flex gap-1">
                <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-1 rounded hover:bg-accent">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-1 rounded hover:bg-accent">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekDayNames.map(day => (
                <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, calendarMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isSameDay(day, new Date());
                const dayEvents = getEventsForDay(day);
                
                return (
                  <button
                    key={idx}
                    onClick={() => onDateSelect?.(day)}
                    className={`
                      relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors
                      ${!isCurrentMonth ? 'text-muted-foreground/50' : ''}
                      ${isSelected ? 'bg-violet-600 text-white' : 'hover:bg-accent'}
                      ${isTodayDate && !isSelected ? 'text-violet-500 font-bold' : ''}
                    `}
                    data-testid={`mini-cal-day-${format(day, 'yyyy-MM-dd')}`}
                  >
                    {format(day, 'd')}
                    {/* Event dots */}
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-0.5 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((_, i) => (
                          <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-violet-500'}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {[
              { id: TABS.EVENTS, icon: Calendar, label: 'События' },
              { id: TABS.CALENDARS, icon: LayoutGrid, label: 'Календари' },
              { id: TABS.DASHBOARD, icon: Star, label: 'Дашборд' },
              { id: TABS.SETTINGS, icon: Settings, label: 'Настройки' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs transition-colors ${
                  activeTab === tab.id 
                    ? 'text-violet-500 border-b-2 border-violet-500 bg-accent/50' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            
            {/* Events Tab */}
            {activeTab === TABS.EVENTS && (
              <div className="space-y-4">
                {selectedDate && (
                  <div className="mb-4">
                    <p className="text-sm font-medium">{format(selectedDate, 'd MMMM, EEEE', { locale: ru })}</p>
                  </div>
                )}
                
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Нет событий на этот день</p>
                ) : (
                  <div className="space-y-3">
                    {/* All-day events section */}
                    {allDayEvents.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Весь день</p>
                        {allDayEvents.map((event) => {
                          const isUnconfirmed = event.status === 'tentative' || event.is_unconfirmed;
                          return (
                            <button 
                              key={event.id} 
                              onClick={() => onEventClick?.(event)} 
                              className={`w-full text-left p-3 rounded-xl transition-colors ${
                                isUnconfirmed 
                                  ? 'border-2 border-dashed border-violet-500 bg-violet-500/5 hover:bg-violet-500/10'
                                  : 'bg-accent/50 hover:bg-accent border-l-4 border-violet-500'
                              }`}
                              data-testid={`sidebar-event-${event.id}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-sm truncate">{event.title}</p>
                                <EventIcons event={event} />
                              </div>
                            </button>
                          );
                        })}
                        {timedEvents.length > 0 && (
                          <div className="border-b border-border/50 my-3" />
                        )}
                      </div>
                    )}
                    
                    {/* Timed events section */}
                    {timedEvents.length > 0 && (
                      <div className="space-y-2">
                        {allDayEvents.length > 0 && (
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">События</p>
                        )}
                        {timedEvents.map((event) => {
                          const isUnconfirmed = event.status === 'tentative' || event.is_unconfirmed;
                          return (
                            <button 
                              key={event.id} 
                              onClick={() => onEventClick?.(event)} 
                              className={`w-full text-left p-3 rounded-xl transition-colors ${
                                isUnconfirmed 
                                  ? 'border-2 border-dashed border-violet-500 bg-violet-500/5 hover:bg-violet-500/10'
                                  : 'bg-accent hover:bg-border'
                              }`}
                              data-testid={`sidebar-event-${event.id}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${isUnconfirmed ? 'border border-violet-500' : 'bg-violet-500'}`} />
                                  <p className="font-medium text-sm truncate">{event.title}</p>
                                </div>
                                <EventIcons event={event} />
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground ml-4">
                                <span className="flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3" />
                                  {formatEventTime(event.start_time)}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="w-3 h-3" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Calendars Tab */}
            {activeTab === TABS.CALENDARS && (
              <div className="space-y-4">
                {/* My Calendars */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Мои календари</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/50 group">
                      <div className="w-3 h-3 rounded-full bg-violet-500" />
                      <span className="text-sm flex-1">Основной</span>
                      <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                    
                    {myCalendars.map(cal => (
                      <div key={cal.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/50 group">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color }} />
                        <span className={`text-sm flex-1 ${hiddenCalendars.has(cal.id) ? 'line-through text-muted-foreground' : ''}`}>
                          {cal.name}
                        </span>
                        <button onClick={() => toggleCalendarVisibility(cal.id)} className="opacity-0 group-hover:opacity-100">
                          {hiddenCalendars.has(cal.id) ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <button onClick={() => handleDeleteCalendar(cal.id)} className="opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                    
                    {showAddForm ? (
                      <div className="p-3 rounded-lg bg-accent/50 space-y-3 mt-2">
                        <input
                          type="text"
                          value={newCalName}
                          onChange={(e) => setNewCalName(e.target.value)}
                          placeholder="Название календаря"
                          className="w-full input-glass text-sm"
                          autoFocus
                        />
                        <div className="flex gap-1 flex-wrap">
                          {CALENDAR_COLORS.map(c => (
                            <button 
                              key={c} 
                              onClick={() => setNewCalColor(c)} 
                              className={`w-6 h-6 rounded-full ${newCalColor === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : ''}`} 
                              style={{ backgroundColor: c }} 
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowAddForm(false)} className="flex-1 btn-secondary text-xs py-1.5">Отмена</button>
                          <button onClick={handleAddCalendar} className="flex-1 btn-primary text-xs py-1.5">Создать</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50">
                        <Plus className="w-4 h-4" />
                        Добавить календарь
                      </button>
                    )}
                  </div>
                </div>

                {/* External Calendars */}
                <div className="pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Внешние календари</p>
                  <div className="space-y-1">
                    {externalCalendars.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2 py-2">Нет подключённых календарей</p>
                    ) : (
                      externalCalendars.map(cal => (
                        <div key={cal.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/50 group">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color }} />
                          <span className="text-sm flex-1">{cal.name}</span>
                          <button onClick={() => toggleCalendarVisibility(cal.id)} className="opacity-0 group-hover:opacity-100">
                            {hiddenCalendars.has(cal.id) ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        </div>
                      ))
                    )}
                    <button 
                      onClick={() => setActiveTab(TABS.SETTINGS)}
                      className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    >
                      <Plus className="w-4 h-4" />
                      Подключить
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard Tab */}
            {activeTab === TABS.DASHBOARD && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-accent">
                    <p className="text-2xl font-semibold">{events.length}</p>
                    <p className="text-xs text-muted-foreground">Событий</p>
                  </div>
                  <div className="p-4 rounded-xl bg-accent">
                    <p className="text-2xl font-semibold font-mono">{totalHours}:{String(remainingMinutes).padStart(2, '0')}</p>
                    <p className="text-xs text-muted-foreground">Часов</p>
                  </div>
                </div>

                {/* Violations */}
                {violations?.violations?.length > 0 && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <h3 className="text-sm font-medium text-red-500">Нарушения правил</h3>
                    </div>
                    {violations.violations.map((v, idx) => (
                      <p key={idx} className="text-xs text-red-600 dark:text-red-400">{v.message}</p>
                    ))}
                  </div>
                )}

                {/* Day Rating */}
                <div className="p-4 rounded-xl bg-accent">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Оценка дня</h3>
                    {rating?.rating && <span className="text-xs text-muted-foreground">Оценено: {rating.rating}/5</span>}
                  </div>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        onMouseEnter={() => setHoveredStar(star)} 
                        onMouseLeave={() => setHoveredStar(0)} 
                        onClick={() => handleRate(star)} 
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-6 h-6 ${star <= (hoveredStar || rating?.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    value={ratingNotes} 
                    onChange={(e) => setRatingNotes(e.target.value)} 
                    placeholder="Заметка к оценке..." 
                    className="w-full input-glass text-sm" 
                  />
                </div>

                {/* End Day Button */}
                {isTodayDate && (
                  <button onClick={onOpenSurvey} className="w-full btn-secondary flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Завершить день
                  </button>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === TABS.SETTINGS && (
              <div className="space-y-4">
                {/* Settings Sub-tabs */}
                <div className="flex flex-wrap gap-1 border-b border-border pb-2">
                  {isAdmin?.() && (
                    <button 
                      onClick={() => setSettingsTab(SETTINGS_TABS.USERS)} 
                      className={`px-3 py-1.5 rounded-md text-xs transition-colors ${settingsTab === SETTINGS_TABS.USERS ? 'bg-violet-500 text-white' : 'text-muted-foreground hover:bg-accent'}`}
                    >
                      Пользователи
                    </button>
                  )}
                  <button 
                    onClick={() => setSettingsTab(SETTINGS_TABS.TEMPLATES)} 
                    className={`px-3 py-1.5 rounded-md text-xs transition-colors ${settingsTab === SETTINGS_TABS.TEMPLATES ? 'bg-violet-500 text-white' : 'text-muted-foreground hover:bg-accent'}`}
                  >
                    Шаблоны
                  </button>
                  <button 
                    onClick={() => setSettingsTab(SETTINGS_TABS.DICTIONARIES)} 
                    className={`px-3 py-1.5 rounded-md text-xs transition-colors ${settingsTab === SETTINGS_TABS.DICTIONARIES ? 'bg-violet-500 text-white' : 'text-muted-foreground hover:bg-accent'}`}
                  >
                    Справочники
                  </button>
                  <button 
                    onClick={() => setSettingsTab(SETTINGS_TABS.EXTERNAL_CALENDARS)} 
                    className={`px-3 py-1.5 rounded-md text-xs transition-colors ${settingsTab === SETTINGS_TABS.EXTERNAL_CALENDARS ? 'bg-violet-500 text-white' : 'text-muted-foreground hover:bg-accent'}`}
                  >
                    Календари
                  </button>
                  <button 
                    onClick={() => setSettingsTab(SETTINGS_TABS.PROFILE)} 
                    className={`px-3 py-1.5 rounded-md text-xs transition-colors ${settingsTab === SETTINGS_TABS.PROFILE ? 'bg-violet-500 text-white' : 'text-muted-foreground hover:bg-accent'}`}
                  >
                    Профиль
                  </button>
                </div>

                {/* Users Sub-tab */}
                {settingsTab === SETTINGS_TABS.USERS && isAdmin?.() && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">Управление пользователями</p>
                    <button onClick={() => navigate('/settings/users')} className="btn-primary text-sm">
                      Открыть
                    </button>
                  </div>
                )}

                {/* Templates Sub-tab */}
                {settingsTab === SETTINGS_TABS.TEMPLATES && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Шаблоны дней</h3>
                      <button 
                        onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-accent"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {templates.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">Нет шаблонов</p>
                    ) : (
                      <div className="space-y-2">
                        {templates.map(template => (
                          <div key={template.id} className="p-3 rounded-lg bg-accent/50 hover:bg-accent group">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{template.name}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => { setSelectedTemplateForApply(template); setShowApplyModal(true); }}
                                  className="p-1 rounded hover:bg-violet-500/20" title="Применить"
                                >
                                  <Play className="w-3.5 h-3.5 text-violet-500" />
                                </button>
                                <button 
                                  onClick={() => { setEditingTemplate(template); setShowTemplateModal(true); }}
                                  className="p-1 rounded hover:bg-background" title="Редактировать"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="p-1 rounded hover:bg-red-500/20" title="Удалить"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {template.events?.length || 0} событий • {template.template_type === 'week' ? 'Неделя' : 'День'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Dictionaries Sub-tab */}
                {settingsTab === SETTINGS_TABS.DICTIONARIES && (
                  <div className="space-y-4">
                    {/* Event Types */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium">Типы событий</h3>
                        <button 
                          onClick={() => { setEditingType(null); setShowTypeModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-accent"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {eventTypes.map(type => (
                          <div key={type.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 group">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: type.color }} />
                            <span className="flex-1 text-sm">{type.label}</span>
                            <code className="text-xs text-muted-foreground">{type.name}</code>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                              <button onClick={() => { setEditingType(type); setShowTypeModal(true); }} className="p-1 rounded hover:bg-background">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteEventType(type.id)} className="p-1 rounded hover:bg-red-500/20">
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      {/* Event Statuses */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium">Статусы событий</h3>
                        <button 
                          onClick={() => { setEditingStatus(null); setShowStatusModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-accent"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {eventStatuses.map(status => (
                          <div key={status.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 group">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: status.color }} />
                            <span className="flex-1 text-sm">{status.label}</span>
                            <code className="text-xs text-muted-foreground">{status.name}</code>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                              <button onClick={() => { setEditingStatus(status); setShowStatusModal(true); }} className="p-1 rounded hover:bg-background">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteEventStatus(status.id)} className="p-1 rounded hover:bg-red-500/20">
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* External Calendars Sub-tab */}
                {settingsTab === SETTINGS_TABS.EXTERNAL_CALENDARS && (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">Подключение внешних календарей</p>
                    <p className="text-xs text-muted-foreground">Google, Yandex, Apple Calendar</p>
                    <p className="text-xs text-amber-500 mt-2">Скоро</p>
                  </div>
                )}

                {/* Profile Sub-tab */}
                {settingsTab === SETTINGS_TABS.PROFILE && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-accent/50">
                      <p className="text-sm font-medium">{user?.name || 'Пользователь'}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">Роль: {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}</p>
                    </div>
                    
                    <button 
                      onClick={toggleTheme} 
                      className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    >
                      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                      {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                    </button>
                    
                    <button 
                      onClick={logout}
                      className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm text-red-500 hover:bg-red-500/10"
                    >
                      <LogOut className="w-5 h-5" />
                      Выйти
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Event Type Modal */}
      <Dialog open={showTypeModal} onOpenChange={setShowTypeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? 'Редактировать тип' : 'Новый тип события'}</DialogTitle>
          </DialogHeader>
          <EventTypeForm 
            initialData={editingType} 
            onSave={handleSaveEventType}
            onCancel={() => { setShowTypeModal(false); setEditingType(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Event Status Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStatus ? 'Редактировать статус' : 'Новый статус события'}</DialogTitle>
          </DialogHeader>
          <EventStatusForm 
            initialData={editingStatus} 
            onSave={handleSaveEventStatus}
            onCancel={() => { setShowStatusModal(false); setEditingStatus(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}</DialogTitle>
          </DialogHeader>
          <TemplateForm 
            initialData={editingTemplate}
            eventTypes={eventTypes}
            onSave={handleSaveTemplate}
            onCancel={() => { setShowTemplateModal(false); setEditingTemplate(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Apply Template Modal */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Применить шаблон</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">Шаблон: <strong>{selectedTemplateForApply?.name}</strong></p>
            <div>
              <Label>Дата применения</Label>
              <Input 
                type="date" 
                value={applyDate} 
                onChange={(e) => setApplyDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyModal(false)}>Отмена</Button>
            <Button onClick={handleApplyTemplate}>Применить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ==================== FORM COMPONENTS ====================

const EventTypeForm = ({ initialData, onSave, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [label, setLabel] = useState(initialData?.label || '');
  const [color, setColor] = useState(initialData?.color || '#8b5cf6');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !label.trim()) return;
    onSave({ name: name.trim(), label: label.trim(), color, order: initialData?.order || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Код (латиницей)</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="meeting" className="mt-1" />
      </div>
      <div>
        <Label>Название</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Встреча" className="mt-1" />
      </div>
      <div>
        <Label>Цвет</Label>
        <div className="flex gap-2 mt-1">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
          <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </DialogFooter>
    </form>
  );
};

const EventStatusForm = ({ initialData, onSave, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [label, setLabel] = useState(initialData?.label || '');
  const [color, setColor] = useState(initialData?.color || '#10b981');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !label.trim()) return;
    onSave({ name: name.trim(), label: label.trim(), color, order: initialData?.order || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Код (латиницей)</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="confirmed" className="mt-1" />
      </div>
      <div>
        <Label>Название</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Подтверждено" className="mt-1" />
      </div>
      <div>
        <Label>Цвет</Label>
        <div className="flex gap-2 mt-1">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
          <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </DialogFooter>
    </form>
  );
};

const TemplateForm = ({ initialData, eventTypes, onSave, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [templateType, setTemplateType] = useState(initialData?.template_type || 'day');
  const [events, setEvents] = useState(initialData?.events || []);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventIdx, setEditingEventIdx] = useState(null);

  const handleAddEvent = (eventData) => {
    if (editingEventIdx !== null) {
      const updated = [...events];
      updated[editingEventIdx] = eventData;
      setEvents(updated);
      setEditingEventIdx(null);
    } else {
      setEvents([...events, eventData]);
    }
    setShowEventForm(false);
  };

  const handleEditEvent = (idx) => {
    setEditingEventIdx(idx);
    setShowEventForm(true);
  };

  const handleDeleteEvent = (idx) => {
    setEvents(events.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), template_type: templateType, events });
  };

  if (showEventForm) {
    return (
      <TemplateEventForm 
        initialData={editingEventIdx !== null ? events[editingEventIdx] : null}
        eventTypes={eventTypes}
        templateType={templateType}
        onSave={handleAddEvent}
        onCancel={() => { setShowEventForm(false); setEditingEventIdx(null); }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Название шаблона</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Рабочий день" className="mt-1" />
      </div>
      <div>
        <Label>Тип шаблона</Label>
        <Select value={templateType} onValueChange={setTemplateType}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">День</SelectItem>
            <SelectItem value="week">Неделя</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>События ({events.length})</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowEventForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Добавить
          </Button>
        </div>
        
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center border rounded-lg">Нет событий</p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {events.map((event, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-accent/50 group">
                <div className="flex-1">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(event.start_hour).padStart(2, '0')}:{String(event.start_minute || 0).padStart(2, '0')} - 
                    {String(event.end_hour).padStart(2, '0')}:{String(event.end_minute || 0).padStart(2, '0')}
                    {templateType === 'week' && ` • День ${event.day_of_week + 1}`}
                  </p>
                </div>
                <button type="button" onClick={() => handleEditEvent(idx)} className="p-1 rounded hover:bg-background opacity-0 group-hover:opacity-100">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => handleDeleteEvent(idx)} className="p-1 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </DialogFooter>
    </form>
  );
};

const TemplateEventForm = ({ initialData, eventTypes, templateType, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [eventType, setEventType] = useState(initialData?.event_type || 'meeting');
  const [startHour, setStartHour] = useState(initialData?.start_hour ?? 9);
  const [startMinute, setStartMinute] = useState(initialData?.start_minute ?? 0);
  const [endHour, setEndHour] = useState(initialData?.end_hour ?? 10);
  const [endMinute, setEndMinute] = useState(initialData?.end_minute ?? 0);
  const [dayOfWeek, setDayOfWeek] = useState(initialData?.day_of_week ?? 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description,
      event_type: eventType,
      start_hour: parseInt(startHour),
      start_minute: parseInt(startMinute),
      end_hour: parseInt(endHour),
      end_minute: parseInt(endMinute),
      day_of_week: parseInt(dayOfWeek)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-accent">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-medium">{initialData ? 'Редактировать событие' : 'Новое событие'}</h3>
      </div>

      <div>
        <Label>Название</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Утренняя встреча" className="mt-1" />
      </div>
      
      <div>
        <Label>Описание</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание события" className="mt-1" />
      </div>

      <div>
        <Label>Тип события</Label>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {eventTypes.map(type => (
              <SelectItem key={type.name} value={type.name}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: type.color }} />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {templateType === 'week' && (
        <div>
          <Label>День недели</Label>
          <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Понедельник</SelectItem>
              <SelectItem value="1">Вторник</SelectItem>
              <SelectItem value="2">Среда</SelectItem>
              <SelectItem value="3">Четверг</SelectItem>
              <SelectItem value="4">Пятница</SelectItem>
              <SelectItem value="5">Суббота</SelectItem>
              <SelectItem value="6">Воскресенье</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Начало</Label>
          <div className="flex gap-1 mt-1">
            <Input type="number" min="0" max="23" value={startHour} onChange={(e) => setStartHour(e.target.value)} className="w-16" />
            <span className="flex items-center">:</span>
            <Input type="number" min="0" max="59" step="5" value={startMinute} onChange={(e) => setStartMinute(e.target.value)} className="w-16" />
          </div>
        </div>
        <div>
          <Label>Конец</Label>
          <div className="flex gap-1 mt-1">
            <Input type="number" min="0" max="23" value={endHour} onChange={(e) => setEndHour(e.target.value)} className="w-16" />
            <span className="flex items-center">:</span>
            <Input type="number" min="0" max="59" step="5" value={endMinute} onChange={(e) => setEndMinute(e.target.value)} className="w-16" />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Назад</Button>
        <Button type="submit">Сохранить событие</Button>
      </DialogFooter>
    </form>
  );
};

export default Sidebar;
