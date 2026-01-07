import { useState, useEffect, useMemo } from 'react';
import { format, addHours } from 'date-fns';
import { X, Trash2, Clock, MapPin, Users, FileText, Square, CheckCircle2, Zap, Video, CalendarDays, ChevronUp, ChevronDown, Repeat, Calendar, BookOpen, Lock, Briefcase, Home, Target, Plane, Heart, Coffee, Dumbbell, GraduationCap, ShoppingCart, Mail, Phone, Settings, XCircle, Edit } from 'lucide-react';  // ✨ NEW: Added XCircle, Edit
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { getEventFields, createRecurringException } from '../lib/api';  // ✨ NEW: Added createRecurringException
import { toast } from 'sonner';  // ✨ NEW: For notifications
import { getUserTimezone, localToUTC, utcToLocal, formatForInput, formatTime } from '../lib/timezones';

// Available calendar icons (same as in Sidebar)
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
  'settings': Settings,
};

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Подтверждено', description: 'Обычное событие' },
  { value: 'tentative', label: 'Не согласовано', description: 'Пунктирная рамка' },
  { value: 'template', label: 'Шаблонное событие', description: 'Из шаблона' },
];

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Не повторять' },
  { value: 'daily', label: 'Каждый день' },
  { value: 'workdays', label: 'Каждый рабочий день (Пн-Пт)' },
  { value: 'weekly', label: 'Каждую неделю' },
  { value: 'custom_days', label: 'Определенные дни' },
  { value: 'monthly', label: 'Каждый месяц' },
  { value: 'yearly', label: 'Каждый год' },
];

const WEEKDAYS = [
  { value: 'monday', label: 'Пн', fullLabel: 'Понедельник' },
  { value: 'tuesday', label: 'Вт', fullLabel: 'Вторник' },
  { value: 'wednesday', label: 'Ср', fullLabel: 'Среда' },
  { value: 'thursday', label: 'Чт', fullLabel: 'Четверг' },
  { value: 'friday', label: 'Пт', fullLabel: 'Пятница' },
  { value: 'saturday', label: 'Сб', fullLabel: 'Суббота' },
  { value: 'sunday', label: 'Вс', fullLabel: 'Воскресенье' },
];

// Time picker component
const TimePicker = ({ value, onChange, label }) => {
  const [hours, minutes] = value ? value.split(':').map(Number) : [9, 0];
  
  const updateTime = (newHours, newMinutes) => {
    const h = Math.max(0, Math.min(23, newHours));
    const m = Math.max(0, Math.min(59, newMinutes));
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const incrementHour = () => updateTime(hours + 1, minutes);
  const decrementHour = () => updateTime(hours - 1, minutes);
  const incrementMinute = () => updateTime(hours, minutes + 15 - (minutes % 15));
  const decrementMinute = () => updateTime(hours, minutes - 15 + (minutes % 15 === 0 ? 0 : 15 - (minutes % 15)));

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        {/* Hours */}
        <div className="flex flex-col items-center">
          <button type="button" onClick={incrementHour} className="p-0.5 hover:bg-accent rounded">
            <ChevronUp className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={String(hours).padStart(2, '0')}
            onChange={(e) => updateTime(parseInt(e.target.value) || 0, minutes)}
            className="w-10 h-8 text-center text-lg font-mono bg-accent rounded border-0 focus:ring-2 focus:ring-[#085C53]"
          />
          <button type="button" onClick={decrementHour} className="p-0.5 hover:bg-accent rounded">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <span className="text-xl font-bold text-muted-foreground">:</span>
        {/* Minutes */}
        <div className="flex flex-col items-center">
          <button type="button" onClick={incrementMinute} className="p-0.5 hover:bg-accent rounded">
            <ChevronUp className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={String(minutes).padStart(2, '0')}
            onChange={(e) => updateTime(hours, parseInt(e.target.value) || 0)}
            className="w-10 h-8 text-center text-lg font-mono bg-accent rounded border-0 focus:ring-2 focus:ring-[#085C53]"
          />
          <button type="button" onClick={decrementMinute} className="p-0.5 hover:bg-accent rounded">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const getInitialFormData = (event, defaultDate, defaultHour, calendars) => {
  const userTimezone = getUserTimezone();
  
  if (event) {
    let status = event.status || 'confirmed';
    
    // Parse ISO dates - события приходят в UTC, конвертируем в локальное время
    let startDateTime, endDateTime;
    
    if (event.start_time && event.timezone) {
      // Событие имеет timezone - конвертируем из UTC в локальный timezone
      startDateTime = utcToLocal(event.start_time, userTimezone);
      endDateTime = event.end_time ? utcToLocal(event.end_time, userTimezone) : startDateTime;
    } else {
      // Старый формат без timezone - используем как есть
      startDateTime = event.start_time ? new Date(event.start_time) : new Date();
      endDateTime = event.end_time ? new Date(event.end_time) : new Date();
    }
    
    // Parse recurrence end date if present
    let recurrence_end = '';
    if (event.recurrence_end_date) {
      const recEndDate = new Date(event.recurrence_end_date);
      recurrence_end = format(recEndDate, 'yyyy-MM-dd');
    }
    
    // Parse custom days if present
    let custom_days = [];
    if (event.recurrence_custom_days && Array.isArray(event.recurrence_custom_days)) {
      custom_days = event.recurrence_custom_days;
    }
    
    return {
      title: event.title || '',
      description: event.description || '',
      start_date: format(startDateTime, 'yyyy-MM-dd'),
      start_time_val: format(startDateTime, 'HH:mm'),
      end_date: format(endDateTime, 'yyyy-MM-dd'),
      end_time_val: format(endDateTime, 'HH:mm'),
      event_type: event.event_type || 'meeting',
      status: status,
      location: event.location || '',
      attendees: event.attendees || [],
      custom_fields: event.custom_fields || {},
      calendar_id: event.calendar_id || '',
      is_all_day: event.is_all_day || false,
      is_blocked: event.is_blocked || false,
      is_completed: event.is_completed || false,
      is_urgent: event.is_urgent || false,
      is_video_call: event.is_video_call || false,
      recurrence_type: event.recurrence_type || 'none',
      recurrence_end_date: recurrence_end,
      recurrence_custom_days: custom_days,
      timezone: event.timezone || userTimezone, // Сохраняем timezone события
    };
  }
  
  const startDate = defaultDate || new Date();
  const dateStr = format(startDate, 'yyyy-MM-dd');
  const startHour = defaultHour ?? 9;
  
  // Find "Открытый" calendar or use first available
  const defaultCalendar = calendars.find(c => c.name === 'Открытый') || calendars[0];
  
  return {
    title: '',
    description: '',
    start_date: dateStr,
    start_time_val: `${String(startHour).padStart(2, '0')}:00`,
    end_date: dateStr,
    end_time_val: `${String(startHour + 1).padStart(2, '0')}:00`,
    event_type: 'meeting',
    status: 'confirmed',
    location: '',
    attendees: [],
    custom_fields: {},
    calendar_id: defaultCalendar?.id || '',
    is_all_day: false,
    is_blocked: false,
    is_completed: false,
    is_urgent: false,
    is_video_call: false,
    recurrence_type: 'none',
    recurrence_end_date: '',
    recurrence_custom_days: [],
    timezone: userTimezone, // Timezone пользователя для новых событий
  };
};

export const EventModal = ({
  event, 
  defaultDate, 
  defaultHour, 
  calendars = [], 
  eventTypes = [], 
  onSave, 
  onDelete, 
  onClose,
  isRecurringInstance = false,  // ✨ NEW: Flag for recurring instance
  recurringParentId = null,     // ✨ NEW: Parent ID for recurring instances  
  instanceDate = null           // ✨ NEW: Date of this instance (YYYY-MM-DD)
}) => {
  const [customFields, setCustomFields] = useState([]);
  
  const initialData = useMemo(
    () => getInitialFormData(event, defaultDate, defaultHour, calendars),
    [event, defaultDate, defaultHour, calendars]
  );
  
  const [formData, setFormData] = useState(initialData);
  const [attendeeInput, setAttendeeInput] = useState('');

  // Update form when event changes
  useEffect(() => {
    setFormData(getInitialFormData(event, defaultDate, defaultHour, calendars));
  }, [event, defaultDate, defaultHour, calendars]);

  useEffect(() => {
    getEventFields().then(res => setCustomFields(res.data?.fields || [])).catch(console.error);
  }, []);
  
  // Use provided eventTypes or fallback to hardcoded defaults
  const availableEventTypes = eventTypes.length > 0 ? eventTypes : [
    { name: 'meeting', label: 'Встреча', color: '#8b5cf6' },
    { name: 'call', label: 'Звонок', color: '#06b6d4' },
    { name: 'personal', label: 'Личное', color: '#f59e0b' },
    { name: 'urgent', label: 'Срочно', color: '#ef4444' },
    { name: 'travel', label: 'Поездка', color: '#10b981' },
    { name: 'deep_work', label: 'Глубокая работа', color: '#6366f1' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const userTimezone = formData.timezone || getUserTimezone();
    
    // Combine date and time into local datetime string
    const localStartStr = `${formData.start_date}T${formData.start_time_val}`;
    const localEndStr = `${formData.end_date}T${formData.end_time_val}`;
    
    // Convert local time to UTC
    const startDateTimeUTC = localToUTC(localStartStr, userTimezone);
    const endDateTimeUTC = localToUTC(localEndStr, userTimezone);
    
    // Prepare recurrence end date
    let recurrenceEndDate = null;
    if (formData.recurrence_type !== 'none' && formData.recurrence_end_date) {
      recurrenceEndDate = `${formData.recurrence_end_date}T23:59:59`;
    }
    
    onSave({
      ...formData,
      start_time: startDateTimeStr,
      end_time: endDateTimeStr,
      status: formData.status,
      recurrence_type: formData.recurrence_type,
      recurrence_end_date: recurrenceEndDate,
      recurrence_custom_days: formData.recurrence_type === 'custom_days' ? formData.recurrence_custom_days : null,
    });
  };

  const handleAddAttendee = () => {
    if (attendeeInput.trim() && !formData.attendees.includes(attendeeInput.trim())) {
      setFormData({ ...formData, attendees: [...formData.attendees, attendeeInput.trim()] });
      setAttendeeInput('');
    }
  };

  const handleRemoveAttendee = (email) => {
    setFormData({ ...formData, attendees: formData.attendees.filter(a => a !== email) });
  };

  const toggleFlag = (flag) => {
    setFormData({ ...formData, [flag]: !formData[flag] });
  };

  // ✨ NEW: Handle recurring instance actions
  const handleRecurringAction = async (action) => {
    if (!recurringParentId || !instanceDate) {
      toast.error('Не удалось определить экземпляр события');
      return;
    }

    try {
      if (action === 'cancel') {
        // Cancel this instance
        await createRecurringException({
          parent_event_id: recurringParentId,
          exception_date: instanceDate,
          action: 'cancel',
          note: 'Отменено пользователем'
        });
        
        toast.success('Экземпляр отменен');
        onClose();
        // Trigger refresh
        if (onSave) {
          onSave(null);
        }
      } else if (action === 'modify') {
        // Modify only this instance
        const modifiedFields = {};
        
        // Collect changed fields
        if (formData.title !== event?.title) modifiedFields.title = formData.title;
        if (formData.description !== event?.description) modifiedFields.description = formData.description;
        if (formData.location !== event?.location) modifiedFields.location = formData.location;
        if (formData.event_type !== event?.event_type) modifiedFields.event_type = formData.event_type;
        if (formData.status !== event?.status) modifiedFields.status = formData.status;
        if (formData.is_urgent !== event?.is_urgent) modifiedFields.is_urgent = formData.is_urgent;
        if (formData.is_blocked !== event?.is_blocked) modifiedFields.is_blocked = formData.is_blocked;
        if (formData.is_completed !== event?.is_completed) modifiedFields.is_completed = formData.is_completed;
        if (formData.is_video_call !== event?.is_video_call) modifiedFields.is_video_call = formData.is_video_call;
        
        if (Object.keys(modifiedFields).length === 0) {
          toast.error('Нет изменений для сохранения');
          return;
        }

        await createRecurringException({
          parent_event_id: recurringParentId,
          exception_date: instanceDate,
          action: 'modify',
          modified_fields: modifiedFields,
          note: 'Изменен только этот экземпляр'
        });
        
        toast.success('Экземпляр изменен');
        onClose();
        // Trigger refresh
        if (onSave) {
          onSave(null);
        }
      }
    } catch (error) {
      console.error('Failed to create exception:', error);
      toast.error('Не удалось создать исключение');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="event-modal-overlay">
      <div 
        className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()} 
        data-testid="event-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold">{event ? 'Редактировать событие' : 'Новое событие'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent" data-testid="close-event-modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Title */}
          <div>
            <Input 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
              placeholder="Название события" 
              required 
              className="text-lg font-medium border-0 border-b border-border rounded-none px-0 focus-visible:ring-0" 
              data-testid="event-title-input" 
            />
          </div>

          {/* Type and Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Тип</Label>
              <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                <SelectTrigger data-testid="event-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  {availableEventTypes.map(type => (
                    <SelectItem key={type.name} value={type.name}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Статус</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger data-testid="event-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex flex-col">
                        <span>{s.label}</span>
                        <span className="text-xs text-muted-foreground">{s.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calendar */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Календарь</Label>
            {event?.is_ics_event ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/50">
                <span className="text-sm text-muted-foreground">📅 {event.subscription_name || 'Внешний календарь'}</span>
              </div>
            ) : (
              <Select value={formData.calendar_id || ''} onValueChange={(v) => setFormData({ ...formData, calendar_id: v })}>
                <SelectTrigger data-testid="event-calendar-select">
                  <SelectValue placeholder="Выберите календарь" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  {calendars.map(cal => {
                    const IconComponent = CALENDAR_ICONS[cal.icon] || Calendar;
                    return (
                      <SelectItem key={cal.id} value={cal.id}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-3.5 h-3.5" />
                          {cal.name}
                          {cal.is_shared && <span className="text-xs text-muted-foreground">({cal.permission_level})</span>}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* ✨ NEW: Template Source (только для событий из шаблона) */}
          {event && event.template_id && event.template_name && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Создано из шаблона</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 border border-border/50">
                <ChevronDown className="w-4 h-4 text-[#085C53] fill-[#085C53]" />
                <span className="text-sm font-medium text-[#085C53]">{event.template_name}</span>
                <span className="text-xs text-muted-foreground ml-auto">Шаблон</span>
              </div>
            </div>
          )}

          {/* All day toggle */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-accent/50">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Весь день</span>
            </div>
            <Switch 
              checked={formData.is_all_day} 
              onCheckedChange={(checked) => setFormData({ ...formData, is_all_day: checked })}
              data-testid="event-all-day-switch"
            />
          </div>

          {/* Date and Time - hidden if all day */}
          {!formData.is_all_day && (
            <div className="space-y-4">
              {/* Date row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Дата начала</Label>
                  <Input 
                    type="date" 
                    value={formData.start_date} 
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value, end_date: e.target.value })} 
                    required 
                    data-testid="event-start-date" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Дата окончания</Label>
                  <Input 
                    type="date" 
                    value={formData.end_date} 
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} 
                    required 
                    data-testid="event-end-date" 
                  />
                </div>
              </div>
              
              {/* Time row with improved time picker */}
              <div className="flex items-end gap-6 justify-center p-4 rounded-xl bg-accent/30">
                <TimePicker 
                  label="Начало" 
                  value={formData.start_time_val} 
                  onChange={(val) => setFormData({ ...formData, start_time_val: val })} 
                />
                <span className="text-lg text-muted-foreground mb-4">→</span>
                <TimePicker 
                  label="Конец" 
                  value={formData.end_time_val} 
                  onChange={(val) => setFormData({ ...formData, end_time_val: val })} 
                />
              </div>
            </div>
          )}

          {/* Event flags/icons */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Флаги события</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleFlag('is_blocked')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  formData.is_blocked ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-accent hover:bg-accent/80'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                Заблокировано
              </button>
              <button
                type="button"
                onClick={() => toggleFlag('is_completed')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  formData.is_completed ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-accent hover:bg-accent/80'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Выполнено
              </button>
              <button
                type="button"
                onClick={() => toggleFlag('is_urgent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  formData.is_urgent ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' : 'bg-accent hover:bg-accent/80'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Срочно
              </button>
              <button
                type="button"
                onClick={() => toggleFlag('is_video_call')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  formData.is_video_call ? 'bg-blue-500/20 text-blue-500 border border-blue-500/50' : 'bg-accent hover:bg-accent/80'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                Видеозвонок
              </button>
            </div>
          </div>

          {/* Recurring event settings */}
          <div className="p-4 rounded-xl bg-accent/30 space-y-3">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Повторение</Label>
            </div>
            <Select 
              value={formData.recurrence_type} 
              onValueChange={(v) => setFormData({ ...formData, recurrence_type: v })}
            >
              <SelectTrigger data-testid="recurrence-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {RECURRENCE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Custom days selector */}
            {formData.recurrence_type === 'custom_days' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Выберите дни недели
                </Label>
                <div className="flex gap-1.5">
                  {WEEKDAYS.map(day => {
                    const isSelected = formData.recurrence_custom_days?.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          const currentDays = formData.recurrence_custom_days || [];
                          const newDays = isSelected
                            ? currentDays.filter(d => d !== day.value)
                            : [...currentDays, day.value];
                          setFormData({ ...formData, recurrence_custom_days: newDays });
                        }}
                        className={`flex-1 py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-[#085C53] text-white border-2 border-[#085C53]'
                            : 'bg-accent text-muted-foreground border-2 border-border hover:border-[#085C53]/50'
                        }`}
                        title={day.fullLabel}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Выберите один или несколько дней для повторения
                </p>
              </div>
            )}
            
            {formData.recurrence_type !== 'none' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Повторять до (необязательно)
                </Label>
                <Input 
                  type="date" 
                  value={formData.recurrence_end_date} 
                  onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                  placeholder="Без ограничений"
                  data-testid="recurrence-end-date"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Оставьте пустым для бесконечного повторения
                </p>
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
              <MapPin className="w-3 h-3" />Место
            </Label>
            <Input 
              value={formData.location} 
              onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
              placeholder="Офис / Zoom / etc" 
              data-testid="event-location-input" 
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
              <FileText className="w-3 h-3" />Описание
            </Label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
              placeholder="Дополнительная информация..." 
              rows={2} 
              className="resize-none" 
              data-testid="event-description-input" 
            />
          </div>

          {/* Attendees */}
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
              <Users className="w-3 h-3" />Участники
            </Label>
            <div className="flex gap-2">
              <Input 
                value={attendeeInput} 
                onChange={(e) => setAttendeeInput(e.target.value)} 
                placeholder="Email участника" 
                className="flex-1" 
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())} 
                data-testid="event-attendee-input" 
              />
              <Button type="button" onClick={handleAddAttendee} variant="secondary" size="sm">+</Button>
            </div>
            {formData.attendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.attendees.map(email => (
                  <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-xs">
                    {email}
                    <button type="button" onClick={() => handleRemoveAttendee(email)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            {/* ✨ NEW: Recurring Instance Actions */}
            {isRecurringInstance && recurringParentId && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecurringAction('cancel')}
                  className="text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Отменить этот экземпляр
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecurringAction('modify')}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Изменить только этот
                </Button>
              </div>
            )}
            
            {event && !isRecurringInstance && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onDelete(event.id)} 
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10" 
                data-testid="delete-event-button"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </Button>
            )}
            {event && isRecurringInstance && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onDelete(recurringParentId)} 
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10" 
                data-testid="delete-event-button"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить всю серию
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
              <Button type="submit" className="btn-primary" data-testid="save-event-button">
                {event ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
