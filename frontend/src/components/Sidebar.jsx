import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useState, useEffect } from 'react';
import {
  getCalendars, addCalendar, deleteCalendar,
  getEventTypes, createEventType, updateEventType, deleteEventType,
  getEventStatuses, createEventStatus, updateEventStatus, deleteEventStatus,
  getTemplates, createTemplate, updateTemplate, deleteTemplate, applyTemplate,
  getCustomTimezones, createCustomTimezone, updateCustomTimezone, deleteCustomTimezone,
  getICSSubscriptions, createICSSubscription, deleteICSSubscription,
  getSubscriptions, createSubscription, deleteSubscription, getUsers
} from '../lib/api';
import { 
  Sun, Moon, LogOut, Plus, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Calendar, LayoutGrid, Settings, Star, AlertTriangle, Clock, MapPin, FileText,
  Users, Layout as LayoutIcon, Square, CheckCircle2, Zap, Video, Book, Edit2, Play, ArrowLeft, Palette, GripVertical, Globe, Link, ExternalLink,
  // Calendar icons
  CalendarDays, BookOpen, Lock, Briefcase, Home, Target, Plane, Heart, Coffee, Dumbbell, GraduationCap, ShoppingCart, Mail, Phone, Settings2
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
import CalendarPermissionsModal from './CalendarPermissionsModal';

// Available calendar icons
const CALENDAR_ICONS = {
  'calendar': Calendar,
  'book-open': BookOpen,
  'lock': Lock,
  'briefcase': Briefcase,
  'home': Home,
  'target': Target,
  'plane': Plane,
  'heart': Heart,
  'coffee': Coffee,
  'dumbbell': Dumbbell,
  'graduation-cap': GraduationCap,
  'shopping-cart': ShoppingCart,
  'mail': Mail,
  'phone': Phone,
  'settings': Settings2,
};

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
  '#085C53', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#14b8a6'
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
  MY_CALENDARS: 'my_calendars',
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
  mainView,
  onCustomTimezonesChange,
  onEventTypesChange,
  viewingUserId,
  onViewingUserChange,
  onHiddenCalendarsChange
}) => {
  const { user, logout, isAdmin, switchUser } = useAuth();
  const { theme, setTheme } = useTheme();
  
  // Get event type color
  const getEventTypeColor = (event) => {
    const eventType = eventTypes.find(et => et.name === event.event_type);
    return eventType?.color || '#085C53';
  };
  
  const [calendars, setCalendars] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [newCalIcon, setNewCalIcon] = useState('calendar');
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedCalendarForPermissions, setSelectedCalendarForPermissions] = useState(null);
  const [hiddenCalendars, setHiddenCalendars] = useState(new Set());
  const [activeTab, setActiveTab] = useState(TABS.EVENTS);
  const [settingsTab, setSettingsTab] = useState(SETTINGS_TABS.TEMPLATES);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [hoveredStar, setHoveredStar] = useState(0);
  const [ratingNotes, setRatingNotes] = useState('');
  
  // Subscriptions
  const [subscriptions, setSubscriptions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [selectedUserForSub, setSelectedUserForSub] = useState('');
  
  // User switcher dropdown state
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  
  // Dictionaries state
  const [eventTypes, setEventTypes] = useState([]);
  const [eventStatuses, setEventStatuses] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  // Edit modals
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [showICSModal, setShowICSModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingTimezone, setEditingTimezone] = useState(null);  // NEW
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState(null);
  const [applyDate, setApplyDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customTimezones, setCustomTimezones] = useState([]);
  const [icsSubscriptions, setIcsSubscriptions] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await getCalendars();
        setCalendars(res.data || []);
        onCalendarsChange?.(res.data || []);
      } catch (e) { console.error(e); }
      
      try {
        const [typesRes, statusesRes, templatesRes, timezonesRes, icsRes, subsRes, usersRes] = await Promise.all([
          getEventTypes(),
          getEventStatuses(),
          getTemplates(),
          getCustomTimezones(),
          getICSSubscriptions(),
          getSubscriptions(),
          getUsers().catch(() => ({ data: [] }))
        ]);
        setEventTypes(typesRes.data || []);
        setEventStatuses(statusesRes.data || []);
        setTemplates(templatesRes.data || []);
        setCustomTimezones(timezonesRes.data || []);
        setIcsSubscriptions(icsRes.data || []);
        setSubscriptions(subsRes.data || []);
        setAllUsers(usersRes.data || []);
        onCustomTimezonesChange?.(timezonesRes.data || []);
        onEventTypesChange?.(typesRes.data || []);
      } catch (e) { console.error(e); }
    };
    loadData();
  }, [onCalendarsChange, onCustomTimezonesChange, onEventTypesChange]);

  const fetchCalendars = async () => {
    try {
      const res = await getCalendars();
      setCalendars(res.data || []);
      onCalendarsChange?.(res.data || []);
    } catch (e) { console.error(e); }
  };

  // Subscriptions handlers
  const handleAddSubscription = async () => {
    if (!selectedUserForSub) return;
    try {
      await createSubscription(selectedUserForSub);
      setSelectedUserForSub('');
      setShowAddSubscription(false);
      // Reload subscriptions
      const subsRes = await getSubscriptions();
      setSubscriptions(subsRes.data || []);
    } catch (e) { toast.error('Ошибка подписки'); }
  };

  const handleDeleteSubscription = async (targetUserId) => {
    try {
      await deleteSubscription(targetUserId);
      const subsRes = await getSubscriptions();
      setSubscriptions(subsRes.data || []);
      // Reset viewing if was viewing this user
      if (viewingUserId === targetUserId) {
        onViewingUserChange?.(null);
      }
    } catch (e) { toast.error('Ошибка отписки'); }
  };

  const fetchDictionaries = async () => {
    try {
      const [typesRes, statusesRes, templatesRes, timezonesRes, icsRes] = await Promise.all([
        getEventTypes(),
        getEventStatuses(),
        getTemplates(),
        getCustomTimezones(),
        getICSSubscriptions()
      ]);
      setEventTypes(typesRes.data || []);
      setEventStatuses(statusesRes.data || []);
      setTemplates(templatesRes.data || []);
      setCustomTimezones(timezonesRes.data || []);
      setIcsSubscriptions(icsRes.data || []);
      onCustomTimezonesChange?.(timezonesRes.data || []);
      onEventTypesChange?.(typesRes.data || []);
    } catch (e) { console.error(e); }
  };

  // Custom Timezones handlers
  const handleSaveTimezone = async (data) => {
    try {
      if (editingTimezone) {
        // Update existing timezone
        await updateCustomTimezone(editingTimezone.id, data.name, data.offset);
      } else {
        // Create new timezone
        await createCustomTimezone(data.name, data.offset);
      }
      setShowTimezoneModal(false);
      setEditingTimezone(null);
      fetchDictionaries();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Ошибка сохранения');
    }
  };

  const handleDeleteTimezone = async (id) => {
    try {
      await deleteCustomTimezone(id);
      toast.success('Часовой пояс удалён');
      fetchDictionaries();
    } catch (e) { toast.error('Ошибка удаления'); }
  };

  // ICS Subscriptions handlers
  const handleSaveICSSubscription = async (data) => {
    try {
      await createICSSubscription(data);
      toast.success('Календарь подключён');
      setShowICSModal(false);
      fetchDictionaries();
    } catch (e) { 
      toast.error(e.response?.data?.detail || 'Ошибка подключения календаря'); 
    }
  };

  const handleDeleteICSSubscription = async (id) => {
    try {
      await deleteICSSubscription(id);
      fetchDictionaries();
    } catch (e) { toast.error('Ошибка удаления'); }
  };

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
      } else {
        await createEventStatus(data.name, data.label, data.color);
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
    try {
      await deleteEventStatus(id);
      fetchDictionaries();
    } catch (e) { toast.error('Ошибка удаления'); }
  };

  // Reorder handlers
  const handleMoveType = async (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= eventTypes.length) return;
    
    const newTypes = [...eventTypes];
    const temp = newTypes[index];
    newTypes[index] = newTypes[newIndex];
    newTypes[newIndex] = temp;
    
    // Update order values
    try {
      await updateEventType(newTypes[index].id, { ...newTypes[index], order: index });
      await updateEventType(newTypes[newIndex].id, { ...newTypes[newIndex], order: newIndex });
      fetchDictionaries();
    } catch (e) { toast.error('Ошибка изменения порядка'); }
  };

  const handleMoveStatus = async (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= eventStatuses.length) return;
    
    const newStatuses = [...eventStatuses];
    const temp = newStatuses[index];
    newStatuses[index] = newStatuses[newIndex];
    newStatuses[newIndex] = temp;
    
    // Update order values
    try {
      await updateEventStatus(newStatuses[index].id, newStatuses[index].name, newStatuses[index].label, newStatuses[index].color, index);
      await updateEventStatus(newStatuses[newIndex].id, newStatuses[newIndex].name, newStatuses[newIndex].label, newStatuses[newIndex].color, newIndex);
      fetchDictionaries();
    } catch (e) { toast.error('Ошибка изменения порядка'); }
  };

  // Templates handlers
  const handleSaveTemplate = async (data) => {
    try {
      if (editingTemplate?.id) {
        await updateTemplate(editingTemplate.id, data);
      } else {
        await createTemplate(data);
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      fetchDictionaries();
    } catch (e) { toast.error('Ошибка сохранения'); }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await deleteTemplate(id);
      fetchDictionaries();
    } catch (e) { toast.error('Ошибка удаления'); }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateForApply || !applyDate) return;
    try {
      await applyTemplate(selectedTemplateForApply.id, applyDate);
      setShowApplyModal(false);
      setSelectedTemplateForApply(null);
    } catch (e) { toast.error('Ошибка применения шаблона'); }
  };

  const handleAddCalendar = async () => {
    if (!newCalName.trim()) return;
    try {
      await addCalendar(newCalName.trim(), newCalIcon);
      setNewCalName('');
      setNewCalIcon('calendar');
      setShowAddForm(false);
      fetchCalendars();
    } catch (e) { toast.error('Ошибка создания'); }
  };

  const handleDeleteCalendar = async (id) => {
    try {
      await deleteCalendar(id);
      fetchCalendars();
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

  // Notify parent about hidden calendars changes
  useEffect(() => {
    onHiddenCalendarsChange?.(hiddenCalendars);
  }, [hiddenCalendars, onHiddenCalendarsChange]);

  const myCalendars = calendars.filter(c => !c.owner); // Own calendars
  const sharedCalendars = calendars.filter(c => c.owner); // Calendars shared with me
  const externalCalendars = calendars.filter(c => c.provider !== 'custom');

  const handleLogout = () => { logout(); };
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
              <div className="flex items-center gap-3 flex-1 min-w-0 relative user-switcher-container">
                <button onClick={handleLogout} className="p-1 rounded-lg hover:bg-accent flex-shrink-0" title="Выйти" data-testid="logout-button">
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                </button>
                
                {/* User Info - Clickable for dropdown */}
                <button 
                  onClick={() => setShowUserSwitcher(!showUserSwitcher)}
                  className="flex items-center gap-3 flex-1 min-w-0 hover:bg-accent/50 rounded-lg p-2 transition-colors"
                  title="Быстрая смена пользователя"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#085C53] to-[#074a44] flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.role === 'admin' ? 'Админ' : 'Пользователь'}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${showUserSwitcher ? 'rotate-180' : ''}`} />
                </button>
                
                {/* User Switcher Dropdown */}
                {showUserSwitcher && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    <div className="p-2">
                      <div className="text-xs text-muted-foreground px-3 py-2 font-medium">
                        Переключиться на:
                      </div>
                      {allUsers.filter(u => u.id !== user?.id).map(u => (
                        <button
                          key={u.id}
                          onClick={async () => {
                            setShowUserSwitcher(false);
                            try {
                              const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  email: u.email,
                                  password: u.email === 'admin@example.com' ? 'admin123' : 
                                           u.email === 'admin@company.com' ? 'admin123' :
                                           u.email === 'user@company.com' ? 'user123' : 'password123'
                                })
                              });
                              
                              if (response.ok) {
                                const data = await response.json();
                                switchUser(data.user, data.access_token);
                              } else {
                                toast.error('Не удалось переключиться');
                              }
                            } catch (error) {
                              console.error('Switch error:', error);
                              toast.error('Ошибка при смене пользователя');
                            }
                          }}
                          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#085C53] to-[#074a44] flex items-center justify-center text-xs font-medium text-white">
                              {u.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="text-left">
                              <div className="font-medium">{u.name}</div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            u.role === 'admin' ? 'bg-blue-500/20 text-blue-500' : 'bg-gray-500/20 text-gray-500'
                          }`}>
                            {u.role === 'admin' ? 'Админ' : 'Юзер'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={onCreateEvent} 
                className="w-8 h-8 rounded-lg bg-[#074a44] hover:bg-[#063d38] flex items-center justify-center text-white flex-shrink-0"
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
                <span className="text-[#085C53]">{format(calendarMonth, 'LLLL', { locale: ru })}</span>
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
                      ${isSelected ? 'bg-[#074a44] text-white' : 'hover:bg-accent'}
                      ${isTodayDate && !isSelected ? 'text-[#085C53] font-bold' : ''}
                    `}
                    data-testid={`mini-cal-day-${format(day, 'yyyy-MM-dd')}`}
                  >
                    {format(day, 'd')}
                    {/* Event dots */}
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-0.5 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((_, i) => (
                          <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#085C53]'}`} />
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
                    ? 'text-[#085C53] border-b-2 border-[#085C53] bg-accent/50' 
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
                          const isUnconfirmed = event.status === 'tentative';
                          const isTemplate = event.status === 'template';
                          const eventColor = getEventTypeColor(event);
                          return (
                            <button 
                              key={event.id} 
                              onClick={() => onEventClick?.(event)} 
                              className={`w-full text-left p-3 rounded-xl transition-colors ${
                                isUnconfirmed 
                                  ? 'border-2 border-dashed bg-transparent hover:bg-accent/10'
                                  : 'bg-accent/50 hover:bg-accent'
                              }`}
                              style={isUnconfirmed ? { borderColor: eventColor } : { borderLeft: `4px solid ${eventColor}` }}
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
                          const isUnconfirmed = event.status === 'tentative';
                          const isTemplate = event.status === 'template';
                          const eventColor = getEventTypeColor(event);
                          return (
                            <button 
                              key={event.id} 
                              onClick={() => onEventClick?.(event)} 
                              className={`w-full text-left p-3 rounded-xl transition-colors ${
                                isUnconfirmed 
                                  ? 'border-2 border-dashed bg-transparent hover:bg-accent/10'
                                  : 'bg-accent hover:bg-border'
                              }`}
                              style={isUnconfirmed ? { borderColor: eventColor } : {}}
                              data-testid={`sidebar-event-${event.id}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className={`w-2 h-2 rounded-full ${isUnconfirmed ? 'border' : ''}`} 
                                    style={{ 
                                      backgroundColor: isUnconfirmed ? 'transparent' : (event.is_busy ? '#6b7280' : eventColor),
                                      borderColor: isUnconfirmed ? eventColor : 'transparent'
                                    }}
                                  />
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

            {/* Calendars Tab - Show all user calendars */}
            {activeTab === TABS.CALENDARS && (
              <div className="space-y-4">
                {/* My calendars */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Мои календари</p>
                    <button
                      onClick={() => { setShowAddForm(true); setActiveTab(TABS.CALENDARS); }}
                      className="p-1 rounded-lg hover:bg-accent"
                      title="Создать календарь"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {myCalendars.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Нет календарей</p>
                  ) : (
                    <div className="space-y-1">
                      {myCalendars.map(cal => {
                        const IconComponent = CALENDAR_ICONS[cal.icon] || Calendar;
                        const isHidden = hiddenCalendars.has(cal.id);
                        
                        return (
                          <div key={cal.id} className="flex items-center gap-2 px-2 py-2 rounded-lg transition-colors hover:bg-accent/50 group">
                            <button
                              onClick={() => toggleCalendarVisibility(cal.id)}
                              className="flex-shrink-0"
                            >
                              {isHidden ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <IconComponent className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className={`text-sm flex-1 min-w-0 truncate ${isHidden ? 'line-through text-muted-foreground' : ''}`}>
                              {cal.name}
                              {cal.is_default && <span className="text-xs text-muted-foreground ml-1">({cal.is_public ? 'откр' : 'закр'})</span>}
                            </span>
                            <button
                              onClick={() => { setSelectedCalendarForPermissions(cal); setShowPermissionsModal(true); }}
                              className="p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100"
                              title="Настроить доступы"
                            >
                              <Users className="w-3.5 h-3.5 text-[#085C53]" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* Shared calendars - always show */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Доступные мне</p>
                  {sharedCalendars.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Нет расшаренных календарей</p>
                  ) : (
                    <div className="space-y-1">
                      {sharedCalendars.map(cal => {
                        const IconComponent = CALENDAR_ICONS[cal.icon] || Calendar;
                        const isHidden = hiddenCalendars.has(cal.id);
                        
                        return (
                          <div key={cal.id} className="flex items-center gap-2 px-2 py-2 rounded-lg transition-colors hover:bg-accent/50">
                            <button
                              onClick={() => toggleCalendarVisibility(cal.id)}
                              className="flex-shrink-0"
                            >
                              {isHidden ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <IconComponent className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className={`text-sm flex-1 min-w-0 truncate ${isHidden ? 'line-through text-muted-foreground' : ''}`}>
                              {cal.name}
                              {cal.owner && <span className="text-xs text-muted-foreground ml-1">({cal.owner.name})</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* External ICS calendars - always show */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Внешние календари</p>
                    <button
                      onClick={() => setShowICSModal(true)}
                      className="p-1 rounded-lg hover:bg-accent"
                      title="Добавить ICS календарь"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {icsSubscriptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Нет внешних календарей</p>
                  ) : (
                    <div className="space-y-1">
                      {icsSubscriptions.map(sub => {
                        const isHidden = hiddenCalendars.has(sub.id);
                        
                        return (
                          <div key={sub.id} className="flex items-center gap-2 px-2 py-2 rounded-lg transition-colors hover:bg-accent/50 group">
                            <button
                              onClick={() => toggleCalendarVisibility(sub.id)}
                              className="flex-shrink-0"
                            >
                              {isHidden ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className={`text-sm flex-1 min-w-0 truncate ${isHidden ? 'line-through text-muted-foreground' : ''}`}>
                              {sub.name}
                            </span>
                            <button
                              onClick={() => handleDeleteICSSubscription(sub.id)}
                              className="p-1 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                      className={`px-3 py-1.5 rounded-md text-xs transition-colors ${settingsTab === SETTINGS_TABS.USERS ? 'bg-[#085C53] text-white' : 'text-muted-foreground hover:bg-accent'}`}
                    >
                      Пользователи
                    </button>
                  )}
                  <button 
                    onClick={() => setSettingsTab(SETTINGS_TABS.TEMPLATES)} 
                    className={`px-3 py-1.5 rounded-md text-xs transition-colors ${settingsTab === SETTINGS_TABS.TEMPLATES ? 'bg-[#085C53] text-white' : 'text-muted-foreground hover:bg-accent'}`}
                  >
                    Шаблоны
                  </button>
                  <button 
                    onClick={() => setSettingsTab(SETTINGS_TABS.DICTIONARIES)} 
                    className={`px-3 py-1.5 rounded-md text-xs transition-colors ${settingsTab === SETTINGS_TABS.DICTIONARIES ? 'bg-[#085C53] text-white' : 'text-muted-foreground hover:bg-accent'}`}
                  >
                    Справочники
                  </button>
                  <button 
                    onClick={() => setSettingsTab(SETTINGS_TABS.PROFILE)} 
                    className={`px-3 py-1.5 rounded-md text-xs transition-colors ${settingsTab === SETTINGS_TABS.PROFILE ? 'bg-[#085C53] text-white' : 'text-muted-foreground hover:bg-accent'}`}
                  >
                    Профиль
                  </button>
                </div>

                {/* Users Sub-tab */}
                {settingsTab === SETTINGS_TABS.USERS && isAdmin?.() && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">Управление пользователями</p>
                    <button onClick={() => { onShowUsers?.(); setActiveTab(TABS.EVENTS); }} className="btn-primary text-sm">
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
                                  className="p-1 rounded hover:bg-[#085C53]/20" title="Применить"
                                >
                                  <Play className="w-3.5 h-3.5 text-[#085C53]" />
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
                              {template.events?.length || 0} событий
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
                        {eventTypes.map((type, index) => (
                          <div key={type.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 group">
                            {/* Reorder buttons */}
                            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100">
                              <button 
                                onClick={() => handleMoveType(index, 'up')}
                                disabled={index === 0}
                                className={`p-0.5 rounded hover:bg-background ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleMoveType(index, 'down')}
                                disabled={index === eventTypes.length - 1}
                                className={`p-0.5 rounded hover:bg-background ${index === eventTypes.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
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
                      {/* Event Flags - placeholder for future API */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium">Флаги событий</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Настройка флагов для событий (заблокировано, выполнено, срочно, видеозвонок)
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/30">
                          <Square className="w-4 h-4 text-red-500 fill-red-500" />
                          <span className="flex-1 text-sm">Заблокировано</span>
                          <span className="text-xs text-muted-foreground">is_blocked</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/30">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="flex-1 text-sm">Выполнено</span>
                          <span className="text-xs text-muted-foreground">is_completed</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/30">
                          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="flex-1 text-sm">Срочно</span>
                          <span className="text-xs text-muted-foreground">is_urgent</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/30">
                          <Video className="w-4 h-4 text-blue-500" />
                          <span className="flex-1 text-sm">Видеозвонок</span>
                          <span className="text-xs text-muted-foreground">is_video_call</span>
                        </div>
                      </div>
                      <p className="text-xs text-amber-500 mt-3 text-center">Редактирование флагов — скоро</p>
                    </div>

                    {/* Timezones */}
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium">Часовые пояса</h3>
                        {isAdmin?.() && (
                          <button 
                            onClick={() => { setEditingTimezone(null); setShowTimezoneModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-accent"
                            title="Добавить часовой пояс"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-3">
                        Часовые пояса доступные в календаре
                      </p>
                      
                      {/* All Timezones */}
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {customTimezones.map(tz => (
                          <div key={tz.id} className="flex items-center gap-2 p-2 rounded-lg bg-accent/50 hover:bg-accent group">
                            <Globe className="w-3.5 h-3.5 flex-shrink-0 text-[#085C53]" />
                            <span className="flex-1 text-sm">{tz.name}</span>
                            <code className="text-xs text-muted-foreground">{tz.offset}</code>
                            {isAdmin?.() && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                <button 
                                  onClick={() => { setEditingTimezone(tz); setShowTimezoneModal(true); }}
                                  className="p-1 rounded hover:bg-background"
                                  title="Редактировать"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTimezone(tz.id)} 
                                  className="p-1 rounded hover:bg-red-500/20"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
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

      {/* Add Calendar Form Modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый календарь</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input 
                value={newCalName}
                onChange={(e) => setNewCalName(e.target.value)}
                placeholder="Рабочий календарь"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Иконка</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {Object.entries(CALENDAR_ICONS).map(([key, IconComp]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNewCalIcon(key)}
                    className={`p-2.5 rounded-lg hover:bg-background transition-colors ${
                      newCalIcon === key ? 'bg-[#085C53] text-white' : 'bg-accent'
                    }`}
                    title={key}
                  >
                    <IconComp className="w-5 h-5 mx-auto" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Отмена</Button>
            <Button onClick={handleAddCalendar}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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

      {/* Timezone Modal */}
      <Dialog open={showTimezoneModal} onOpenChange={(open) => { setShowTimezoneModal(open); if (!open) setEditingTimezone(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTimezone ? 'Редактировать часовой пояс' : 'Новый часовой пояс'}</DialogTitle>
          </DialogHeader>
          <TimezoneForm 
            timezone={editingTimezone}
            onSave={handleSaveTimezone}
            onCancel={() => { setShowTimezoneModal(false); setEditingTimezone(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* ICS Subscription Modal */}
      <Dialog open={showICSModal} onOpenChange={setShowICSModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подключить внешний календарь</DialogTitle>
          </DialogHeader>
          <ICSSubscriptionForm 
            onSave={handleSaveICSSubscription}
            onCancel={() => setShowICSModal(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Calendar Permissions Modal */}
      {showPermissionsModal && selectedCalendarForPermissions && (
        <CalendarPermissionsModal
          calendar={selectedCalendarForPermissions}
          onClose={() => { setShowPermissionsModal(false); setSelectedCalendarForPermissions(null); }}
          onUpdate={() => fetchCalendars()}
        />
      )}
    </>
  );
};

// ==================== FORM COMPONENTS ====================

const ICSSubscriptionForm = ({ onSave, onCancel }) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim() || !name.trim()) return;
    setLoading(true);
    try {
      await onSave({ url: url.trim(), name: name.trim(), color });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Название календаря</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Apple Calendar" className="mt-1" />
      </div>
      <div>
        <Label>URL (.ics)</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="mt-1" />
        <p className="text-xs text-muted-foreground mt-1">Ссылка на публичный .ics файл календаря</p>
      </div>
      <div>
        <Label>Цвет</Label>
        <div className="flex gap-2 mt-1">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
          <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Отмена</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Подключение...' : 'Подключить'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const TimezoneForm = ({ timezone, onSave, onCancel }) => {
  const [name, setName] = useState(timezone?.name || '');
  const [offset, setOffset] = useState(timezone?.offset || '+0:00');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !offset.trim()) return;
    onSave({ name: name.trim(), offset: offset.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Название</Label>
        <Input 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Дубай (GMT+4)" 
          className="mt-1" 
        />
      </div>
      <div>
        <Label>Офсет (формат: +3:00 или -5:00)</Label>
        <Input 
          value={offset} 
          onChange={(e) => setOffset(e.target.value)} 
          placeholder="+3:00" 
          className="mt-1" 
        />
        <p className="text-xs text-muted-foreground mt-1">
          Примеры: +0:00, +3:00, -5:00, +5:30
        </p>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit">{timezone ? 'Сохранить' : 'Создать'}</Button>
      </DialogFooter>
    </form>
  );
};

const EventTypeForm = ({ initialData, onSave, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [label, setLabel] = useState(initialData?.label || '');
  const [color, setColor] = useState(initialData?.color || '#085C53');

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
  const [location, setLocation] = useState(initialData?.location || '');
  const [isBlocked, setIsBlocked] = useState(initialData?.is_blocked || false);
  const [isCompleted, setIsCompleted] = useState(initialData?.is_completed || false);
  const [isUrgent, setIsUrgent] = useState(initialData?.is_urgent || false);
  const [isVideoCall, setIsVideoCall] = useState(initialData?.is_video_call || false);

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
      day_of_week: parseInt(dayOfWeek),
      location,
      is_blocked: isBlocked,
      is_completed: isCompleted,
      is_urgent: isUrgent,
      is_video_call: isVideoCall
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

      {/* Location */}
      <div>
        <Label className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />Место
        </Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Офис / Zoom / etc" className="mt-1" />
      </div>

      {/* Event flags */}
      <div>
        <Label className="mb-2 block">Флаги события</Label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsBlocked(!isBlocked)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              isBlocked ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-accent hover:bg-accent/80'
            }`}
          >
            <Square className="w-3 h-3" />
            Заблокировано
          </button>
          <button
            type="button"
            onClick={() => setIsCompleted(!isCompleted)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              isCompleted ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-accent hover:bg-accent/80'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Выполнено
          </button>
          <button
            type="button"
            onClick={() => setIsUrgent(!isUrgent)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              isUrgent ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' : 'bg-accent hover:bg-accent/80'
            }`}
          >
            <Zap className="w-3 h-3" />
            Срочно
          </button>
          <button
            type="button"
            onClick={() => setIsVideoCall(!isVideoCall)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              isVideoCall ? 'bg-blue-500/20 text-blue-500 border border-blue-500/50' : 'bg-accent hover:bg-accent/80'
            }`}
          >
            <Video className="w-3 h-3" />
            Видеозвонок
          </button>
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
