import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO, addMinutes, setHours, setMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronDown, Square, CheckCircle2, Zap, Video, Globe, Repeat } from 'lucide-react';
import { TIMEZONES, getTimezoneById, utcToLocal, formatTime, formatDate } from '../lib/timezones';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

// Helper to parse ISO time and get local hours/minutes with timezone shift
const getLocalTime = (isoString, timezoneShift = 0) => {
  try {
    const date = new Date(isoString);
    const shiftedDate = new Date(date.getTime() + timezoneShift * 60 * 60 * 1000);
    return {
      hours: shiftedDate.getHours(),
      minutes: shiftedDate.getMinutes(),
      formatted: `${String(shiftedDate.getHours()).padStart(2, '0')}:${String(shiftedDate.getMinutes()).padStart(2, '0')}`,
      original: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    };
  } catch {
    return { hours: 0, minutes: 0, formatted: '00:00', original: '00:00' };
  }
};

// Get dynamic event styles based on status and type color
const getEventDynamicStyle = (event, eventTypes = []) => {
  // "Занято" events - special styling
  if (event.is_busy) {
    return {
      background: '#6b7280',
      color: '#ffffff',
      border: 'none',
      opacity: 0.7
    };
  }
  
  const type = event.event_type || 'meeting';
  
  // Find the event type config for color
  const eventTypeConfig = eventTypes?.find(et => et.name === type);
  const color = eventTypeConfig?.color || '#085C53';
  
  // Apply styles based on status
  if (event.status === 'template') {
    // Template: solid border, transparent background
    return {
      border: `2px solid ${color}`,
      background: 'transparent',
      color: color
    };
  }
  
  if (event.status === 'tentative') {
    // Tentative: dashed border, transparent background
    return {
      border: `2px dashed ${color}`,
      background: 'transparent',
      color: color
    };
  }
  
  // Confirmed: left border + light fill
  return {
    borderLeft: `3px solid ${color}`,
    background: `${color}15`, // 15 = ~8% opacity in hex
    color: color
  };
};

// Event status icons
const EventIcons = ({ event }) => {
  const icons = [];
  
  // Recurrence icon for all recurring events
  if (event.recurrence_type && event.recurrence_type !== 'none') {
    icons.push(<Repeat key="recurring" className="w-3 h-3 text-[#085C53]" />);
  }
  
  if (event.is_blocked) icons.push(<Square key="blocked" className="w-3 h-3 text-red-500 fill-red-500" />);
  if (event.is_completed) icons.push(<CheckCircle2 key="completed" className="w-3 h-3 text-green-500" />);
  if (event.is_urgent) icons.push(<Zap key="urgent" className="w-3 h-3 text-amber-500 fill-amber-500" />);
  if (event.is_video_call) icons.push(<Video key="video" className="w-3 h-3 text-blue-500" />);
  
  if (icons.length === 0) return null;
  return <div className="flex items-center gap-0.5">{icons}</div>;
};

// Template selector dropdown
const TemplateSelector = ({ day, templates, appliedTemplates, onApplyTemplate, onRemoveTemplate }) => {
  const [open, setOpen] = useState(false);
  
  const dateStr = format(day, 'yyyy-MM-dd');
  const appliedTemplate = appliedTemplates?.find(at => at.date === dateStr);
  const hasTemplate = !!appliedTemplate;
  
  const handleSelect = (template) => {
    if (template && onApplyTemplate) {
      onApplyTemplate(template.id, day);
    }
    setOpen(false);
  };
  
  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemoveTemplate) {
      onRemoveTemplate(day);
    }
    setOpen(false);
  };
  
  return (
    <div className="relative">
      <button 
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`p-1 rounded transition-all ${
          hasTemplate 
            ? 'text-[#085C53] hover:bg-accent/50' 
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 opacity-0 group-hover:opacity-100'
        }`}
        title={hasTemplate ? 'Шаблон применен' : 'Выбрать шаблон'}
      >
        <ChevronDown className={`w-3.5 h-3.5 ${hasTemplate ? 'fill-[#085C53]' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
            {hasTemplate && (
              <>
                <button 
                  className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent text-red-500 flex items-center gap-2" 
                  onClick={handleRemove}
                >
                  <span>✕</span> Убрать шаблон
                </button>
                <div className="border-t border-border my-1" />
              </>
            )}
            {templates && templates.length > 0 ? (
              templates.map(template => (
                <button 
                  key={template.id}
                  className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent" 
                  onClick={() => handleSelect(template)}
                >
                  {template.name}
                </button>
              ))
            ) : (
              <div className="px-3 py-1.5 text-xs text-muted-foreground">Нет шаблонов</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export const CalendarGrid = ({ currentDate, selectedDate, events, calendars, templates, appliedTemplates = [], overloadedDays, ratings, view, onDateClick, onCellDoubleClick, onEventClick, onEventUpdate, onApplyTemplate, onRemoveTemplate, onEventDelete, selectedEventIds, onEventSelect, loading, selectedTimezone, onTimezoneChange, eventTypes = [] }) => {
  
  // Конвертируем события из UTC в выбранный timezone
  const eventsInTimezone = useMemo(() => {
    return events.map(event => {
      // Если у события есть start_time и timezone
      if (event.start_time && event.timezone) {
        try {
          // Конвертируем UTC время в selectedTimezone
          const startLocal = utcToLocal(event.start_time, selectedTimezone);
          const endLocal = event.end_time ? utcToLocal(event.end_time, selectedTimezone) : startLocal;
          
          // Получаем исходное время в timezone события (для отображения)
          const startOriginal = utcToLocal(event.start_time, event.timezone);
          const originalTz = getTimezoneById(event.timezone);
          const currentTz = getTimezoneById(selectedTimezone);
          
          // Показываем исходное время только если timezone отличается
          const showOriginalTime = event.timezone !== selectedTimezone;
          
          return {
            ...event,
            _localStartTime: startLocal,
            _localEndTime: endLocal,
            _displayStartDate: formatDate(startLocal),
            _displayStartTime: formatTime(startLocal),
            _displayEndTime: formatTime(endLocal),
            _originalStartTime: showOriginalTime ? formatTime(startOriginal) : null,
            _originalTimezone: showOriginalTime ? originalTz : null,
            _timezoneOffset: currentTz.offset - originalTz.offset,
          };
        } catch (e) {
          console.error('Error converting event timezone:', e, event);
          // Fallback - используем исходное время
          return event;
        }
      }
      // Старый формат без timezone
      return event;
    });
  }, [events, selectedTimezone]);

  if (view === 'day') return <DayView date={selectedDate} events={eventsInTimezone} templates={templates} appliedTemplates={appliedTemplates} onEventClick={onEventClick} onCellDoubleClick={onCellDoubleClick} onEventUpdate={onEventUpdate} onApplyTemplate={onApplyTemplate} onRemoveTemplate={onRemoveTemplate} selectedEventIds={selectedEventIds} onEventSelect={onEventSelect} selectedTimezone={selectedTimezone} onTimezoneChange={onTimezoneChange} eventTypes={eventTypes} />;
  if (view === 'week') return <WeekView date={selectedDate} events={eventsInTimezone} templates={templates} appliedTemplates={appliedTemplates} onDateClick={onDateClick} onEventClick={onEventClick} onCellDoubleClick={onCellDoubleClick} onEventUpdate={onEventUpdate} onApplyTemplate={onApplyTemplate} onRemoveTemplate={onRemoveTemplate} selectedEventIds={selectedEventIds} onEventSelect={onEventSelect} selectedTimezone={selectedTimezone} onTimezoneChange={onTimezoneChange} eventTypes={eventTypes} />;
  return <MonthView currentDate={currentDate} selectedDate={selectedDate} events={eventsInTimezone} overloadedDays={overloadedDays} ratings={ratings} onDateClick={onDateClick} onCellDoubleClick={onCellDoubleClick} onEventClick={onEventClick} selectedEventIds={selectedEventIds} onEventSelect={onEventSelect} eventTypes={eventTypes} />;
};

const MonthView = ({ currentDate, selectedDate, events, overloadedDays, ratings, onDateClick, onCellDoubleClick, onEventClick, selectedEventIds, onEventSelect, eventTypes }) => {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const getDayEvents = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => {
      const eventDateStr = e._displayStartDate || (e.start_time ? e.start_time.substring(0, 10) : null);
      return eventDateStr === dateStr;
    }).slice(0, 3);
  };
  const isOverloaded = (date) => overloadedDays.some(d => d.date === format(date, 'yyyy-MM-dd') && d.is_overloaded);
  const getDayRating = (date) => ratings[format(date, 'yyyy-MM-dd')]?.rating;

  return (
    <div className="card-glass" data-testid="month-view">
      <div className="grid grid-cols-7 border-b border-border/50">
        {weekDays.map(day => <div key={day} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = getDayEvents(day);
          const overloaded = isOverloaded(day);
          const rating = getDayRating(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={idx}
              onClick={() => onDateClick(day)}
              onDoubleClick={() => onCellDoubleClick(day, 9)}
              className={`relative min-h-[110px] p-2 border-b border-r border-border/30 text-left transition-colors
                ${!isCurrentMonth && 'opacity-40'}
                ${isSelected ? 'bg-accent' : 'hover:bg-accent/30'}
                ${overloaded && 'day-overloaded'}`}
              data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm
                  ${isTodayDate && isSelected ? 'bg-foreground text-background font-semibold' : ''}
                  ${isTodayDate && !isSelected ? 'bg-foreground/20 text-foreground font-medium' : ''}
                  ${isSelected && !isTodayDate ? 'bg-foreground text-background font-semibold' : ''}`}>
                  {format(day, 'd')}
                </span>
                {rating && <span className="text-xs text-amber-500">★{rating}</span>}
              </div>
              <div className="space-y-1">
                {dayEvents.map((event) => {
                  const dynamicStyle = getEventDynamicStyle(event, eventTypes);
                  const isSelected = selectedEventIds?.includes(event.id);
                  return (
                    <div 
                      key={event.id} 
                      onClick={(e) => { e.stopPropagation(); onEventSelect?.(event.id, e.shiftKey); }} 
                      onDoubleClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      className={`px-2 py-0.5 rounded cursor-pointer hover:opacity-80 ${isSelected ? 'ring-2 ring-[#085C53] ring-offset-1' : ''}`}
                      style={dynamicStyle || {}}
                      data-testid={`event-${event.id}`}
                      title={event.title}
                    >
                      <div className="text-xs font-medium truncate leading-tight">
                        {event.title}
                      </div>
                    </div>
                  );
                })}
                {(() => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayEventsCount = events.filter(e => {
                    const eventDateStr = e._displayStartDate || (e.start_time ? e.start_time.substring(0, 10) : null);
                    return eventDateStr === dateStr;
                  }).length;
                  return dayEventsCount > 3 && (
                    <p className="text-xs text-muted-foreground px-2">+{dayEventsCount - 3}</p>
                  );
                })()}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Timezone selector component - compact version
const TimezoneSelector = ({ selectedTimezone, onTimezoneChange }) => {
  const selectedTz = getTimezoneById(selectedTimezone);
  
  return (
    <Select value={selectedTimezone} onValueChange={onTimezoneChange}>
      <SelectTrigger className="w-full h-7 text-xs gap-1">
        <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <span className="truncate text-[10px]">{selectedTz?.label || 'UTC'}</span>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {TIMEZONES.map(tz => (
          <SelectItem key={tz.id} value={tz.id} className="text-xs">
            {tz.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};


const WeekView = ({ date, events, templates, appliedTemplates, onDateClick, onEventClick, onCellDoubleClick, onEventUpdate, onApplyTemplate, onRemoveTemplate, selectedEventIds, onEventSelect, selectedTimezone, onTimezoneChange, eventTypes }) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0:00 - 23:00 (все 24 часа)
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const gridRef = useRef(null);
  
  // Auto-scroll to 5:00 on mount
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = 5 * 60; // 5 hours * 60px per hour
    }
  }, []);
  
  // Drag state
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null);
  const [dragPreviewTime, setDragPreviewTime] = useState(null); // { start: 'HH:MM', end: 'HH:MM' }

  const getEventStyle = (event) => {
    try {
      // Используем локальное время если доступно, иначе парсим UTC
      const start = event._localStartTime || new Date(event.start_time);
      const end = event._localEndTime || new Date(event.end_time);
      
      // ВАЖНО: используем getUTCHours/getUTCMinutes, так как _localStartTime уже содержит скорректированное время
      const shiftedStartHour = start.getUTCHours() + start.getUTCMinutes() / 60;
      const duration = (end - start) / 3600000;
      const topOffset = shiftedStartHour * 60;
      return { 
        top: `${topOffset}px`, 
        height: `${Math.max(duration * 60, 24)}px` 
      };
    } catch { return { top: '0px', height: '60px' }; }
  };

  const getDayEvents = (day) => {
    return events.filter(e => {
      const dateStr = format(day, 'yyyy-MM-dd');
      // Используем _displayStartDate для фильтрации
      const eventDateStr = e._displayStartDate || (e.start_time ? e.start_time.substring(0, 10) : null);
      return eventDateStr === dateStr && !e.is_all_day;
    });
  };

  // Calculate horizontal positions for overlapping events
  const getOverlapStyle = (event, dayEvents) => {
    try {
      // ВАЖНО: Используем _localStartTime и _localEndTime для правильного определения наложения
      const eventStart = event._localStartTime ? event._localStartTime.getTime() : new Date(event.start_time).getTime();
      const eventEnd = event._localEndTime ? event._localEndTime.getTime() : new Date(event.end_time).getTime();
      
      // Find all events that overlap with this one
      const overlapping = dayEvents.filter(e => {
        const eStart = e._localStartTime ? e._localStartTime.getTime() : new Date(e.start_time).getTime();
        const eEnd = e._localEndTime ? e._localEndTime.getTime() : new Date(e.end_time).getTime();
        return (eStart < eventEnd && eEnd > eventStart);
      });
      
      // Sort overlapping events deterministically:
      // 1. By start time (ascending)
      // 2. By end time (ascending) - shorter events first
      // 3. By title (alphabetically)
      // 4. By id (alphabetically) as last resort
      overlapping.sort((a, b) => {
        const aStart = a._localStartTime ? a._localStartTime.getTime() : new Date(a.start_time).getTime();
        const bStart = b._localStartTime ? b._localStartTime.getTime() : new Date(b.start_time).getTime();
        if (aStart !== bStart) return aStart - bStart;
        
        const aEnd = a._localEndTime ? a._localEndTime.getTime() : new Date(a.end_time).getTime();
        const bEnd = b._localEndTime ? b._localEndTime.getTime() : new Date(b.end_time).getTime();
        if (aEnd !== bEnd) return aEnd - bEnd;
        
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        if (aTitle !== bTitle) return aTitle.localeCompare(bTitle);
        
        return (a.id || '').localeCompare(b.id || '');
      });
      
      // Find this event's position in the overlapping group
      const position = overlapping.findIndex(e => e.id === event.id);
      const total = overlapping.length;
      
      if (total <= 1) {
        return { left: '2px', right: '2px', width: 'auto' };
      }
      
      // Calculate width and position (leave small gap between events)
      const widthPercent = (100 / total) - 1;
      const leftPercent = position * (100 / total);
      
      return { 
        left: `${leftPercent}%`, 
        width: `${widthPercent}%`,
        right: 'auto'
      };
    } catch {
      return { left: '2px', right: '2px', width: 'auto' };
    }
  };

  const getAllDayEvents = (day) => {
    return events.filter(e => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const eventDateStr = e._displayStartDate || (e.start_time ? e.start_time.substring(0, 10) : null);
      return eventDateStr === dateStr && e.is_all_day;
    });
  };

  const getEventDuration = (event) => {
    try {
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);
      return (end - start) / 3600000;
    } catch { return 1; }
  };

  const isLongEvent = (event) => getEventDuration(event) >= 1;

  // Drag handlers
  const handleDragStart = (e, event) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedEvent(event);
    setDragPreviewTime(null);
  };
  
  const handleDrag = (e) => {
    if (!draggedEvent || !gridRef.current) return;
    
    // Get grid position
    const gridRect = gridRef.current.getBoundingClientRect();
    const mouseY = e.clientY - gridRect.top;
    
    if (mouseY < 0) return; // Mouse outside grid
    
    // Calculate hour and minute from Y position
    const cellHeight = 60;
    const totalHours = mouseY / cellHeight;
    const hour = Math.floor(totalHours);
    const minutesFraction = (totalHours - hour) * 60;
    const roundedMinutes = Math.round(minutesFraction / 10) * 10; // 10-min snap
    
    // Calculate duration
    const start = new Date(draggedEvent.start_time);
    const end = new Date(draggedEvent.end_time);
    const durationMs = end - start;
    
    // Preview time
    const previewStart = new Date();
    previewStart.setHours(hour, Math.min(roundedMinutes, 50), 0, 0);
    const previewEnd = new Date(previewStart.getTime() + durationMs);
    
    setDragPreviewTime({
      start: `${String(previewStart.getHours()).padStart(2, '0')}:${String(previewStart.getMinutes()).padStart(2, '0')}`,
      end: `${String(previewEnd.getHours()).padStart(2, '0')}:${String(previewEnd.getMinutes()).padStart(2, '0')}`
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedEvent) return;
    
    // Calculate preview time during drag
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const cellHeight = 60;
    const totalMinutes = Math.floor((offsetY / cellHeight) * 60);
    const roundedMinutes = Math.round(totalMinutes / 10) * 10; // 10-minute snap
    
    const hour = parseInt(e.currentTarget.getAttribute('data-hour') || '0');
    const previewStartHour = hour;
    const previewStartMinute = Math.min(roundedMinutes, 50);
    
    // Calculate duration
    const start = new Date(draggedEvent.start_time);
    const end = new Date(draggedEvent.end_time);
    const durationMs = end - start;
    
    // Preview end time
    const previewStart = new Date();
    previewStart.setHours(previewStartHour, previewStartMinute, 0, 0);
    const previewEnd = new Date(previewStart.getTime() + durationMs);
    
    setDragPreviewTime({
      start: `${String(previewStart.getHours()).padStart(2, '0')}:${String(previewStart.getMinutes()).padStart(2, '0')}`,
      end: `${String(previewEnd.getHours()).padStart(2, '0')}:${String(previewEnd.getMinutes()).padStart(2, '0')}`
    });
  };

  const handleDrop = (e, day, hour) => {
    e.preventDefault();
    if (!draggedEvent || !onEventUpdate) return;
    
    // Получаем точную позицию мыши внутри ячейки
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const cellHeight = 60; // высота ячейки в px (1 час = 60px)
    
    // Вычисляем минуты с точностью до 10 минут
    const totalMinutes = Math.floor((offsetY / cellHeight) * 60);
    const roundedMinutes = Math.round(totalMinutes / 10) * 10; // округление до 10 минут
    
    const start = parseISO(draggedEvent.start_time);
    const end = parseISO(draggedEvent.end_time);
    const duration = end - start;
    
    // Создаём новое время начала с учётом минут
    const newStart = setMinutes(setHours(day, hour), Math.min(roundedMinutes, 50));
    const newEnd = new Date(newStart.getTime() + duration);
    
    onEventUpdate({
      ...draggedEvent,
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString()
    });
    
    setDraggedEvent(null);
    setDragPreviewTime(null);
  };

  // Resize handlers
  const handleResizeStart = (e, event, day) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startY = e.clientY;
    // ВАЖНО: Используем _localStartTime и _localEndTime для корректного вычисления длительности
    const eventStart = event._localStartTime || new Date(event.start_time);
    const eventEnd = event._localEndTime || new Date(event.end_time);
    const originalDuration = (eventEnd - eventStart) / 60000; // minutes
    
    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaMinutes = Math.round(deltaY / 60 * 60); // 60px = 1 hour = 60 minutes
      const newDuration = Math.max(15, originalDuration + deltaMinutes); // minimum 15 minutes
      
      // Visual feedback - update the event element height
      const eventEl = document.querySelector(`[data-testid="event-${event.id}"]`);
      if (eventEl) {
        eventEl.style.height = `${Math.max(newDuration, 15)}px`;
      }
    };
    
    const handleMouseUp = (upEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (!onEventUpdate) return;
      
      const deltaY = upEvent.clientY - startY;
      const deltaMinutes = Math.round(deltaY / 60 * 60);
      const newDuration = Math.max(15, originalDuration + deltaMinutes);
      
      const newEnd = new Date(eventStart.getTime() + newDuration * 60000);
      
      onEventUpdate({
        ...event,
        start_time: event.start_time,
        end_time: newEnd.toISOString()
      });
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Column widths as constants for consistency
  const COL_LEFT = 'w-[50px]';
  const COL_RIGHT = 'w-[140px]';
  const SCROLLBAR_WIDTH = 'w-[8px]'; // Reserve space for scrollbar

  return (
    <div className="card-glass overflow-hidden" data-testid="week-view">
      {/* Header with day names and dates */}
      <div className="flex">
        {/* Left spacer for time column */}
        <div className={`flex-shrink-0 ${COL_LEFT} p-2 text-center text-[10px] text-muted-foreground border-b border-r border-border/30`}></div>
        
        {/* Day headers */}
        <div className="flex-1 grid border-b border-border/30" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map((day, idx) => (
            <div 
              key={day.toISOString()} 
              className={`group border-r border-border/30 overflow-hidden ${isSameDay(day, date) ? 'bg-[#085C53]/10' : ''}`}
            >
              {/* Day header - centered, fixed layout */}
              <div className="p-2 text-center relative">
                <button 
                  onClick={() => onDateClick(day)} 
                  className="hover:bg-accent/30 rounded px-2 py-0.5 transition-colors inline-block"
                >
                  <p className="text-xs text-muted-foreground uppercase">{dayNames[idx]}</p>
                  <p className={`text-lg font-semibold ${isToday(day) ? 'text-[#085C53]' : ''}`}>
                    {format(day, 'd')}
                  </p>
                </button>
                {/* Template selector - always visible if template applied, otherwise on hover */}
                <div className="absolute top-1 right-1">
                  <TemplateSelector day={day} templates={templates} appliedTemplates={appliedTemplates} onApplyTemplate={onApplyTemplate} onRemoveTemplate={onRemoveTemplate} />
                </div>
              </div>
              
              {/* All-day events row */}
              <div className="h-[48px] px-1 pb-1 space-y-0.5 overflow-y-auto">
                {getAllDayEvents(day).map(event => {
                  const dynamicStyle = getEventDynamicStyle(event, eventTypes);
                  const isSelected = selectedEventIds?.includes(event.id);
                  return (
                    <div 
                      key={event.id}
                      onClick={(e) => onEventSelect?.(event.id, e.shiftKey)}
                      onDoubleClick={(e) => onEventClick(event)}
                      className={`px-2 py-0.5 rounded cursor-pointer hover:opacity-80 w-full ${isSelected ? 'ring-2 ring-[#085C53] ring-offset-1' : ''}`}
                      style={{...dynamicStyle, maxWidth: '100%', overflow: 'hidden'}}
                      title={event.title}
                    >
                      <div className="text-[10px] font-medium truncate leading-tight">
                        {event.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Timezone selector - right side */}
        <div className={`flex-shrink-0 ${COL_RIGHT} p-1 border-b border-l border-border/30 flex items-center justify-center`}>
          <TimezoneSelector selectedTimezone={selectedTimezone} onTimezoneChange={onTimezoneChange} />
        </div>
        
        {/* Scrollbar placeholder to match grid scrollbar */}
        <div className={`flex-shrink-0 ${SCROLLBAR_WIDTH} border-b border-border/30`}></div>
      </div>

      {/* Time grid */}
      <div 
        ref={gridRef}
        className="flex h-[calc(100vh-220px)] overflow-y-scroll" 
      >
        {/* Left time column */}
        <div className={`flex-shrink-0 ${COL_LEFT} border-r border-border/20`}>
          {hours.map(hour => (
            <div key={hour} className="h-[60px] px-1 flex items-start pt-1 justify-end text-[10px] text-muted-foreground/60 font-mono">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex-1 grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map((day, dayIdx) => {
            const dayEvents = getDayEvents(day);
            const isTodayCol = isToday(day);
            const isSelectedCol = isSameDay(day, date);
            
            return (
              <div 
                key={day.toISOString()} 
                className={`relative border-r border-border/20 ${isSelectedCol ? 'bg-[#085C53]/5' : ''}`}
              >
                {/* Hour cells */}
                {hours.map(hour => (
                  <div 
                    key={hour} 
                    data-hour={hour}
                    className="h-[60px] border-b border-dashed border-border/20 hover:bg-accent/10" 
                    onClick={() => onDateClick?.(day)}
                    onDoubleClick={() => onCellDoubleClick(day, hour)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day, hour)}
                  />
                ))}
                
                {/* Current time line */}
                {isTodayCol && (
                  <div 
                    className="absolute left-0 right-0 border-t-2 border-[#085C53] z-10 pointer-events-none" 
                    style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60}px` }}
                  >
                    <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-[#085C53]" />
                  </div>
                )}

                {/* Events */}
                {dayEvents.map(event => {
                  const duration = getEventDuration(event);
                  const isLong = duration >= 1;
                  const eventStartTime = event._displayStartTime || formatTime(new Date(event.start_time));
                  const eventEndTime = event._displayEndTime || formatTime(new Date(event.end_time));
                  const dynamicStyle = getEventDynamicStyle(event, eventTypes);
                  const overlapStyle = getOverlapStyle(event, dayEvents);
                  const isSelected = selectedEventIds?.includes(event.id);
                  
                  // Формируем отображение времени: начало - конец
                  let timeDisplayText = `${eventStartTime} - ${eventEndTime}`;
                  if (event._originalStartTime && event._originalTimezone) {
                    const offset = event._timezoneOffset >= 0 ? `+${event._timezoneOffset}` : event._timezoneOffset;
                    timeDisplayText = `${eventStartTime} - ${eventEndTime} (${event._originalStartTime} ${offset})`;
                  }
                  
                  return (
                    <div 
                      key={event.id} 
                      draggable={!event.is_busy}
                      onDragStart={(e) => !event.is_busy && handleDragStart(e, event)}
                      onDrag={handleDrag}
                      onClick={(e) => { e.stopPropagation(); if (!event.is_busy) onEventSelect?.(event.id, e.shiftKey); }}
                      onDoubleClick={(e) => { e.stopPropagation(); if (!event.is_busy) onEventClick(event); }}
                      className={`
                        absolute px-1 py-1 rounded-md text-xs ${event.is_busy ? 'cursor-default' : 'cursor-move'}
                        hover:opacity-90 transition-all overflow-hidden group
                        ${isSelected ? 'ring-2 ring-[#085C53] ring-offset-1 z-20' : ''}
                        ${draggedEvent?.id === event.id ? 'opacity-50 scale-95' : ''}
                      `} 
                      style={{
                        ...getEventStyle(event), 
                        ...overlapStyle, 
                        ...(dynamicStyle || {}),
                        pointerEvents: draggedEvent && draggedEvent.id !== event.id ? 'none' : 'auto'
                      }} 
                      data-testid={`event-${event.id}`}
                      title={`${event.title} (${eventStartTime} - ${eventEndTime})`}
                    >
                      <div className="flex items-start justify-between gap-1 h-full">
                        <div className="flex-1 min-w-0 flex flex-col">
                          {/* Показываем preview время при drag or обычное время */}
                          {duration >= 1 && (
                            <span className="text-[10px] font-mono opacity-70 truncate">
                              {draggedEvent?.id === event.id && dragPreviewTime 
                                ? `${dragPreviewTime.start} - ${dragPreviewTime.end}` 
                                : timeDisplayText}
                            </span>
                          )}
                          {/* Для коротких событий - показываем preview если dragged */}
                          {duration < 1 && draggedEvent?.id === event.id && dragPreviewTime && (
                            <span className="text-[10px] font-mono opacity-70 truncate">
                              {dragPreviewTime.start} - {dragPreviewTime.end}
                            </span>
                          )}
                          {/* Название события */}
                          <span 
                            className={`font-medium leading-tight ${isLong ? 'text-[11px]' : 'text-[10px]'}`}
                            style={{ 
                              wordBreak: duration < 1 ? 'break-word' : 'normal',
                              overflowWrap: duration < 1 ? 'break-word' : 'normal'
                            }}
                          >
                            {event.title}
                          </span>
                        </div>
                        <EventIcons event={event} />
                      </div>
                      {/* Resize handle - hide for busy events */}
                      {!event.is_busy && (
                        <div 
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-b"
                          onMouseDown={(e) => handleResizeStart(e, event, day)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Right time column - fixed width */}
        {/* Right time column */}
        <div className={`flex-shrink-0 ${COL_RIGHT} border-l border-border/20`}>
          {hours.map(hour => (
            <div key={hour} className="h-[60px] px-1 flex items-start pt-1 justify-start text-[10px] text-muted-foreground/60 font-mono">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DayView = ({ date, events, templates, appliedTemplates, onEventClick, onCellDoubleClick, onEventUpdate, onApplyTemplate, onRemoveTemplate, selectedEventIds, onEventSelect, selectedTimezone, onTimezoneChange, eventTypes }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i); // Все 24 часа
  
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayEvents = events.filter(e => {
    const eventDateStr = e._displayStartDate || (e.start_time ? e.start_time.substring(0, 10) : null);
    return eventDateStr === dateStr && !e.is_all_day;
  });
  const allDayEvents = events.filter(e => {
    const eventDateStr = e._displayStartDate || (e.start_time ? e.start_time.substring(0, 10) : null);
    return eventDateStr === dateStr && e.is_all_day;
  });
  
  const [draggedEvent, setDraggedEvent] = useState(null);

  const getEventStyle = (event) => {
    try {
      // Используем локальное время если доступно
      const start = event._localStartTime || new Date(event.start_time);
      const end = event._localEndTime || new Date(event.end_time);
      
      // ВАЖНО: используем getUTCHours/getUTCMinutes, так как _localStartTime уже содержит скорректированное время
      const shiftedStartHour = start.getUTCHours() + start.getUTCMinutes() / 60;
      const duration = (end - start) / 3600000;
      const topOffset = shiftedStartHour * 60;
      return { top: `${topOffset}px`, height: `${Math.max(duration * 60, 30)}px` };
    } catch { return { top: '0px', height: '60px' }; }
  };

  // Calculate horizontal positions for overlapping events
  const getOverlapStyle = (event) => {
    try {
      // ВАЖНО: Используем _localStartTime и _localEndTime для правильного определения наложения
      const eventStart = event._localStartTime ? event._localStartTime.getTime() : new Date(event.start_time).getTime();
      const eventEnd = event._localEndTime ? event._localEndTime.getTime() : new Date(event.end_time).getTime();
      
      // Find all events that overlap with this one
      const overlapping = dayEvents.filter(e => {
        const eStart = e._localStartTime ? e._localStartTime.getTime() : new Date(e.start_time).getTime();
        const eEnd = e._localEndTime ? e._localEndTime.getTime() : new Date(e.end_time).getTime();
        return (eStart < eventEnd && eEnd > eventStart);
      });
      
      // Sort overlapping events deterministically:
      // 1. By start time (ascending)
      // 2. By end time (ascending) - shorter events first
      // 3. By title (alphabetically)
      // 4. By id (alphabetically) as last resort
      overlapping.sort((a, b) => {
        const aStart = a._localStartTime ? a._localStartTime.getTime() : new Date(a.start_time).getTime();
        const bStart = b._localStartTime ? b._localStartTime.getTime() : new Date(b.start_time).getTime();
        if (aStart !== bStart) return aStart - bStart;
        
        const aEnd = a._localEndTime ? a._localEndTime.getTime() : new Date(a.end_time).getTime();
        const bEnd = b._localEndTime ? b._localEndTime.getTime() : new Date(b.end_time).getTime();
        if (aEnd !== bEnd) return aEnd - bEnd;
        
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        if (aTitle !== bTitle) return aTitle.localeCompare(bTitle);
        
        return (a.id || '').localeCompare(b.id || '');
      });
      
      const position = overlapping.findIndex(e => e.id === event.id);
      const total = overlapping.length;
      
      if (total <= 1) {
        return { left: '8px', right: '8px', width: 'auto' };
      }
      
      const widthPercent = (100 / total) - 2;
      const leftPercent = position * (100 / total) + 1;
      
      return { 
        left: `${leftPercent}%`, 
        width: `${widthPercent}%`,
        right: 'auto'
      };
    } catch {
      return { left: '8px', right: '8px', width: 'auto' };
    }
  };

  const getEventDuration = (event) => {
    try {
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);
      return (end - start) / 3600000;
    } catch { return 1; }
  };

  const handleDragStart = (e, event) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedEvent(event);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, hour) => {
    e.preventDefault();
    if (!draggedEvent || !onEventUpdate) return;
    
    // Получаем точную позицию мыши внутри ячейки
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const cellHeight = 60; // высота ячейки в px (1 час = 60px)
    
    // Вычисляем минуты с точностью до 5 минут для более плавного UX
    const totalMinutes = Math.floor((offsetY / cellHeight) * 60);
    const roundedMinutes = Math.round(totalMinutes / 5) * 5; // округление до 5 минут
    
    const start = parseISO(draggedEvent.start_time);
    const end = parseISO(draggedEvent.end_time);
    const duration = end - start;
    
    // Создаём новое время начала с учётом минут
    const newStart = setMinutes(setHours(date, hour), Math.min(roundedMinutes, 55));
    const newEnd = new Date(newStart.getTime() + duration);
    
    onEventUpdate({
      ...draggedEvent,
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString()
    });
    
    setDraggedEvent(null);
  };

  return (
    <div className="card-glass overflow-hidden" data-testid="day-view">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{format(date, 'EEEE, d MMMM', { locale: ru })}</h2>
            <p className="text-sm text-muted-foreground">{dayEvents.length + allDayEvents.length} событий</p>
          </div>
          <TemplateSelector day={date} templates={templates} appliedTemplates={appliedTemplates} onApplyTemplate={onApplyTemplate} onRemoveTemplate={onRemoveTemplate} />
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="px-4 py-2 border-b border-border/30 bg-accent/20">
          <p className="text-xs text-muted-foreground mb-2">События дня</p>
          <div className="space-y-1">
            {allDayEvents.map(event => {
              const dynamicStyle = getEventDynamicStyle(event, eventTypes);
              const isSelected = selectedEventIds?.includes(event.id);
              return (
                <div 
                  key={event.id}
                  onClick={(e) => onEventSelect?.(event.id, e.shiftKey)}
                  onDoubleClick={(e) => onEventClick(event)}
                  className={`px-3 py-1.5 rounded text-sm cursor-pointer hover:opacity-80 ${isSelected ? 'ring-2 ring-[#085C53] ring-offset-1' : ''}`}
                  style={dynamicStyle || {}}
                >
                  <div className="flex items-center justify-between">
                    <span>{event.title}</span>
                    <EventIcons event={event} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="grid grid-cols-[50px_1fr_50px] max-h-[calc(100vh-260px)] overflow-y-auto">
        {/* Left time column */}
        <div className="border-r border-border/20">
          {hours.map(hour => (
            <div key={hour} className="h-[60px] px-1 flex items-start pt-1 justify-end text-[10px] text-muted-foreground/60 font-mono">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Events area */}
        <div className="relative">
          {hours.map(hour => (
            <div 
              key={hour} 
              className="h-[60px] border-b border-dashed border-border/20 hover:bg-accent/10" 
              onDoubleClick={() => onCellDoubleClick(date, hour)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, hour)}
            />
          ))}
          
          {/* Current time line */}
          {isToday(date) && (
            <div 
              className="absolute left-0 right-0 border-t-2 border-[#085C53] z-10 pointer-events-none" 
              style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60}px` }}
            >
              <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-[#085C53]" />
            </div>
          )}

          {/* Events */}
          {dayEvents.map(event => {
            const duration = getEventDuration(event);
            const isLong = duration >= 1;
            const eventTimeDisplay = event._displayStartTime || formatTime(new Date(event.start_time));
            const dynamicStyle = getEventDynamicStyle(event, eventTypes);
            const overlapStyle = getOverlapStyle(event);
            const isSelected = selectedEventIds?.includes(event.id);
            
            // Формируем отображение времени с исходным timezone если отличается
            let timeDisplayText = eventTimeDisplay;
            if (event._originalStartTime && event._originalTimezone) {
              const offset = event._timezoneOffset >= 0 ? `+${event._timezoneOffset}` : event._timezoneOffset;
              timeDisplayText = `${eventTimeDisplay} (${event._originalStartTime} ${offset})`;
            }
            
            return (
              <div 
                key={event.id}
                draggable={!event.is_busy}
                onDragStart={(e) => !event.is_busy && handleDragStart(e, event)}
                onDrag={handleDrag}
                onClick={(e) => { e.stopPropagation(); if (!event.is_busy) onEventSelect?.(event.id, e.shiftKey); }}
                onDoubleClick={(e) => { e.stopPropagation(); if (!event.is_busy) onEventClick(event); }}
                className={`
                  absolute px-2 py-1.5 rounded-lg ${event.is_busy ? 'cursor-default' : 'cursor-move'}
                  hover:opacity-90 transition-all group
                  ${isSelected ? 'ring-2 ring-[#085C53] ring-offset-1 z-20' : ''}
                  ${draggedEvent?.id === event.id ? 'opacity-50 scale-95' : ''}
                `}
                style={{
                  ...getEventStyle(event), 
                  ...overlapStyle, 
                  ...(dynamicStyle || {}),
                  pointerEvents: draggedEvent && draggedEvent.id !== event.id ? 'none' : 'auto'
                }} 
                data-testid={`event-${event.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-mono opacity-70 truncate">
                      {timeDisplayText}
                    </span>
                    <span className="font-medium text-sm truncate">{event.title}</span>
                  </div>
                  <EventIcons event={event} />
                </div>
                {/* Resize handle - hide for busy events */}
                {!event.is_busy && (
                  <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-b" />
                )}
              </div>
            );
          })}
        </div>

        {/* Right time column */}
        <div className="border-l border-border/20">
          {hours.map(hour => (
            <div key={hour} className="h-[60px] px-1 flex items-start pt-1 justify-start text-[10px] text-muted-foreground/60 font-mono">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
