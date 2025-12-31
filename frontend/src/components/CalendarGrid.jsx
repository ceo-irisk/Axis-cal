import { useMemo, useState, useRef } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO, addMinutes, setHours, setMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronDown, Square, CheckCircle2, Zap, Video } from 'lucide-react';

// Helper to parse ISO time and get local hours/minutes
const getLocalTime = (isoString) => {
  try {
    const date = new Date(isoString);
    return {
      hours: date.getHours(),
      minutes: date.getMinutes(),
      formatted: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    };
  } catch {
    return { hours: 0, minutes: 0, formatted: '00:00' };
  }
};

const EVENT_COLORS = {
  meeting: 'event-meeting',
  call: 'event-call',
  personal: 'event-personal',
  urgent: 'event-urgent',
  travel: 'event-travel',
  deep_work: 'event-deep-work',
};

// Unconfirmed event colors with dashed border
const UNCONFIRMED_EVENT_COLORS = {
  meeting: 'event-unconfirmed-meeting',
  call: 'event-unconfirmed-call',
  personal: 'event-unconfirmed-personal',
  urgent: 'event-unconfirmed-urgent',
  travel: 'event-unconfirmed-travel',
  deep_work: 'event-unconfirmed-deep-work',
};

// Event status icons
const EventIcons = ({ event }) => {
  const icons = [];
  
  if (event.is_blocked) icons.push(<Square key="blocked" className="w-3 h-3 text-red-500 fill-red-500" />);
  if (event.is_completed) icons.push(<CheckCircle2 key="completed" className="w-3 h-3 text-green-500" />);
  if (event.is_urgent) icons.push(<Zap key="urgent" className="w-3 h-3 text-amber-500 fill-amber-500" />);
  if (event.is_video_call || event.event_type === 'call') icons.push(<Video key="video" className="w-3 h-3 text-blue-500" />);
  
  if (icons.length === 0) return null;
  return <div className="flex items-center gap-0.5">{icons}</div>;
};

// Template selector dropdown
const TemplateSelector = ({ day, templates, onApplyTemplate }) => {
  const [open, setOpen] = useState(false);
  
  const handleSelect = (template) => {
    if (template && onApplyTemplate) {
      onApplyTemplate(template.id, day);
    }
    setOpen(false);
  };
  
  return (
    <div className="relative">
      <button 
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded opacity-0 group-hover:opacity-100 transition-all"
        title="Выбрать шаблон"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
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
            <div className="border-t border-border mt-1 pt-1">
              <button 
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent text-muted-foreground" 
                onClick={() => setOpen(false)}
              >
                Нет шаблона
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const CalendarGrid = ({ currentDate, selectedDate, events, calendars, templates, overloadedDays, ratings, view, onDateClick, onCellDoubleClick, onEventClick, onEventUpdate, onApplyTemplate, loading }) => {
  if (view === 'day') return <DayView date={selectedDate} events={events} templates={templates} onEventClick={onEventClick} onCellDoubleClick={onCellDoubleClick} onEventUpdate={onEventUpdate} onApplyTemplate={onApplyTemplate} />;
  if (view === 'week') return <WeekView date={selectedDate} events={events} templates={templates} onDateClick={onDateClick} onEventClick={onEventClick} onCellDoubleClick={onCellDoubleClick} onEventUpdate={onEventUpdate} onApplyTemplate={onApplyTemplate} />;
  return <MonthView currentDate={currentDate} selectedDate={selectedDate} events={events} overloadedDays={overloadedDays} ratings={ratings} onDateClick={onDateClick} onCellDoubleClick={onCellDoubleClick} onEventClick={onEventClick} />;
};

const MonthView = ({ currentDate, selectedDate, events, overloadedDays, ratings, onDateClick, onCellDoubleClick, onEventClick }) => {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const getDayEvents = (date) => events.filter(e => e.start_time?.startsWith(format(date, 'yyyy-MM-dd'))).slice(0, 3);
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
                {dayEvents.map((event) => (
                  <div key={event.id} onClick={(e) => { e.stopPropagation(); onEventClick(event); }} className={`px-2 py-0.5 rounded text-xs truncate cursor-pointer hover:opacity-80 ${EVENT_COLORS[event.event_type]} ${event.status === 'tentative' && 'event-tentative'}`} data-testid={`event-${event.id}`}>
                    {event.title}
                  </div>
                ))}
                {events.filter(e => e.start_time?.startsWith(format(day, 'yyyy-MM-dd'))).length > 3 && (
                  <p className="text-xs text-muted-foreground px-2">+{events.filter(e => e.start_time?.startsWith(format(day, 'yyyy-MM-dd'))).length - 3}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const WeekView = ({ date, events, templates, onDateClick, onEventClick, onCellDoubleClick, onEventUpdate, onApplyTemplate }) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0:00 - 23:00 (все 24 часа)
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  
  // Drag state
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null);
  const gridRef = useRef(null);

  const getEventStyle = (event) => {
    try {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      // Use local time for positioning
      const startHour = start.getHours() + start.getMinutes() / 60;
      const duration = (end - start) / 3600000;
      const topOffset = startHour * 60; // Position based on local time
      return { 
        top: `${topOffset}px`, 
        height: `${Math.max(duration * 60, 24)}px` 
      };
    } catch { return { top: '0px', height: '60px' }; }
  };

  const getDayEvents = (day) => {
    return events.filter(e => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return e.start_time?.startsWith(dateStr) && !e.is_all_day;
    });
  };

  // Calculate horizontal positions for overlapping events
  const getOverlapStyle = (event, dayEvents) => {
    try {
      const eventStart = new Date(event.start_time).getTime();
      const eventEnd = new Date(event.end_time).getTime();
      
      // Find all events that overlap with this one
      const overlapping = dayEvents.filter(e => {
        const eStart = new Date(e.start_time).getTime();
        const eEnd = new Date(e.end_time).getTime();
        return (eStart < eventEnd && eEnd > eventStart);
      });
      
      // Sort overlapping events by start time, then by id for consistency
      overlapping.sort((a, b) => {
        const aStart = new Date(a.start_time).getTime();
        const bStart = new Date(b.start_time).getTime();
        if (aStart !== bStart) return aStart - bStart;
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
      return e.start_time?.startsWith(dateStr) && e.is_all_day;
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
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, day, hour) => {
    e.preventDefault();
    if (!draggedEvent || !onEventUpdate) return;
    
    const start = parseISO(draggedEvent.start_time);
    const end = parseISO(draggedEvent.end_time);
    const duration = end - start;
    
    const newStart = setMinutes(setHours(day, hour), 0);
    const newEnd = new Date(newStart.getTime() + duration);
    
    onEventUpdate({
      ...draggedEvent,
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString()
    });
    
    setDraggedEvent(null);
  };

  // Resize handlers
  const handleResizeStart = (e, event, day) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startY = e.clientY;
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
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

  return (
    <div className="card-glass overflow-hidden" data-testid="week-view">
      {/* Header with day names and dates */}
      <div className="grid" style={{ gridTemplateColumns: '50px repeat(7, 1fr) 50px' }}>
        <div className="p-2 text-center text-[10px] text-muted-foreground border-b border-r border-border/30"></div>
        
        {days.map((day, idx) => (
          <div 
            key={day.toISOString()} 
            className={`group border-b border-r border-border/30 overflow-hidden ${isSameDay(day, date) ? 'bg-violet-500/10' : ''}`}
          >
            <div className="flex items-center justify-between p-2 gap-1">
              <button 
                onClick={() => onDateClick(day)} 
                className="text-left hover:bg-accent/30 rounded px-1 -ml-1 transition-colors flex-shrink-0"
              >
                <p className="text-xs text-muted-foreground uppercase">{dayNames[idx]}</p>
                <p className={`text-lg font-semibold ${isToday(day) ? 'text-violet-500' : ''}`}>
                  {format(day, 'd')}
                </p>
              </button>
              <div className="flex-shrink-0">
                <TemplateSelector day={day} templates={templates} onApplyTemplate={onApplyTemplate} />
              </div>
            </div>
            
            {/* All-day events row */}
            <div className="min-h-[24px] px-1 pb-1 space-y-0.5">
              {getAllDayEvents(day).map(event => {
                const isUnconfirmed = event.status === 'tentative' || event.is_unconfirmed;
                const eventColorClass = isUnconfirmed 
                  ? (UNCONFIRMED_EVENT_COLORS[event.event_type] || 'event-unconfirmed-meeting')
                  : (EVENT_COLORS[event.event_type] || 'event-meeting');
                return (
                  <div 
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={`px-2 py-0.5 rounded text-[10px] truncate cursor-pointer hover:opacity-80 ${eventColorClass}`}
                  >
                    {event.title}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="p-2 text-center text-[10px] text-muted-foreground border-b border-border/30"></div>
      </div>

      {/* Time grid */}
      <div 
        ref={gridRef}
        className="grid max-h-[calc(100vh-260px)] overflow-y-auto" 
        style={{ gridTemplateColumns: '50px repeat(7, 1fr) 50px' }}
      >
        {/* Left time column */}
        <div className="border-r border-border/20">
          {hours.map(hour => (
            <div key={hour} className="h-[60px] px-1 flex items-start pt-1 justify-end text-[10px] text-muted-foreground/60 font-mono">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, dayIdx) => {
          const dayEvents = getDayEvents(day);
          const isTodayCol = isToday(day);
          const isSelectedCol = isSameDay(day, date);
          
          return (
            <div 
              key={day.toISOString()} 
              className={`relative border-r border-border/20 ${isSelectedCol ? 'bg-violet-500/5' : ''}`}
            >
              {/* Hour cells */}
              {hours.map(hour => (
                <div 
                  key={hour} 
                  className="h-[60px] border-b border-dashed border-border/20 hover:bg-accent/10" 
                  onDoubleClick={() => onCellDoubleClick(day, hour)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day, hour)}
                />
              ))}
              
              {/* Current time line */}
              {isTodayCol && (
                <div 
                  className="absolute left-0 right-0 border-t-2 border-violet-500 z-10 pointer-events-none" 
                  style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60}px` }}
                >
                  <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-violet-500" />
                </div>
              )}

              {/* Events */}
              {dayEvents.map(event => {
                const duration = getEventDuration(event);
                const isLong = duration >= 1;
                const isUnconfirmed = event.status === 'tentative' || event.is_unconfirmed;
                const isTemplate = event.is_template_event;
                const eventTime = getLocalTime(event.start_time);
                const eventColorClass = isUnconfirmed 
                  ? (UNCONFIRMED_EVENT_COLORS[event.event_type] || 'event-unconfirmed-meeting')
                  : (EVENT_COLORS[event.event_type] || 'event-meeting');
                const overlapStyle = getOverlapStyle(event, dayEvents);
                
                return (
                  <div 
                    key={event.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, event)}
                    onClick={() => onEventClick(event)} 
                    className={`
                      absolute px-1 py-1 rounded-md text-xs cursor-pointer 
                      hover:opacity-90 transition-opacity overflow-hidden group
                      ${isTemplate 
                        ? 'bg-transparent border-2 border-violet-400 text-violet-600 dark:text-violet-300' 
                        : eventColorClass
                      }
                    `} 
                    style={{...getEventStyle(event), ...overlapStyle}} 
                    data-testid={`event-${event.id}`}
                  >
                    <div className="flex items-start justify-between gap-1 h-full">
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="text-[10px] font-mono opacity-70">
                          {eventTime.formatted}
                        </span>
                        <span className={`font-medium leading-tight ${isLong ? 'text-[11px]' : 'text-[10px]'}`}>
                          {event.title}
                        </span>
                      </div>
                      <EventIcons event={event} />
                    </div>
                    {/* Resize handle */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-b"
                      onMouseDown={(e) => handleResizeStart(e, event, day)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}

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

const DayView = ({ date, events, templates, onEventClick, onCellDoubleClick, onEventUpdate, onApplyTemplate }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i); // Все 24 часа
  const dayEvents = events.filter(e => e.start_time?.startsWith(format(date, 'yyyy-MM-dd')) && !e.is_all_day);
  const allDayEvents = events.filter(e => e.start_time?.startsWith(format(date, 'yyyy-MM-dd')) && e.is_all_day);
  
  const [draggedEvent, setDraggedEvent] = useState(null);

  const getEventStyle = (event) => {
    try {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      // Use local time for positioning
      const startHour = start.getHours() + start.getMinutes() / 60;
      const duration = (end - start) / 3600000;
      const topOffset = startHour * 60;
      return { top: `${topOffset}px`, height: `${Math.max(duration * 60, 30)}px` };
    } catch { return { top: '0px', height: '60px' }; }
  };

  // Calculate horizontal positions for overlapping events
  const getOverlapStyle = (event) => {
    try {
      const eventStart = new Date(event.start_time).getTime();
      const eventEnd = new Date(event.end_time).getTime();
      
      // Find all events that overlap with this one
      const overlapping = dayEvents.filter(e => {
        const eStart = new Date(e.start_time).getTime();
        const eEnd = new Date(e.end_time).getTime();
        return (eStart < eventEnd && eEnd > eventStart);
      });
      
      overlapping.sort((a, b) => {
        const aStart = new Date(a.start_time).getTime();
        const bStart = new Date(b.start_time).getTime();
        if (aStart !== bStart) return aStart - bStart;
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
    
    const start = parseISO(draggedEvent.start_time);
    const end = parseISO(draggedEvent.end_time);
    const duration = end - start;
    
    const newStart = setMinutes(setHours(date, hour), 0);
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
          <TemplateSelector day={date} templates={templates} onApplyTemplate={onApplyTemplate} />
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="px-4 py-2 border-b border-border/30 bg-accent/20">
          <p className="text-xs text-muted-foreground mb-2">События дня</p>
          <div className="space-y-1">
            {allDayEvents.map(event => {
              const isUnconfirmed = event.status === 'tentative' || event.is_unconfirmed;
              const eventColorClass = isUnconfirmed 
                ? (UNCONFIRMED_EVENT_COLORS[event.event_type] || 'event-unconfirmed-meeting')
                : (EVENT_COLORS[event.event_type] || 'event-meeting');
              return (
                <div 
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={`px-3 py-1.5 rounded text-sm cursor-pointer hover:opacity-80 ${eventColorClass}`}
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
              className="absolute left-0 right-0 border-t-2 border-violet-500 z-10 pointer-events-none" 
              style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60}px` }}
            >
              <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-violet-500" />
            </div>
          )}

          {/* Events */}
          {dayEvents.map(event => {
            const duration = getEventDuration(event);
            const isLong = duration >= 1;
            const isUnconfirmed = event.status === 'tentative' || event.is_unconfirmed;
            const isTemplate = event.is_template_event;
            const eventTime = getLocalTime(event.start_time);
            const eventColorClass = isUnconfirmed 
              ? (UNCONFIRMED_EVENT_COLORS[event.event_type] || 'event-unconfirmed-meeting')
              : (EVENT_COLORS[event.event_type] || 'event-meeting');
            const overlapStyle = getOverlapStyle(event);
            
            return (
              <div 
                key={event.id}
                draggable
                onDragStart={(e) => handleDragStart(e, event)}
                onClick={() => onEventClick(event)} 
                className={`
                  absolute px-2 py-1.5 rounded-lg cursor-pointer 
                  hover:opacity-90 transition-opacity group
                  ${isTemplate 
                    ? 'bg-transparent border-2 border-violet-400 text-violet-600 dark:text-violet-300' 
                    : eventColorClass
                  }
                `}
                style={{...getEventStyle(event), ...overlapStyle}} 
                data-testid={`event-${event.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-mono opacity-70">
                      {eventTime.formatted}
                    </span>
                    <span className="font-medium text-sm truncate">{event.title}</span>
                  </div>
                  <EventIcons event={event} />
                </div>
                {/* Resize handle */}
                <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-b" />
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
