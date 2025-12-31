import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronDown, Square, CheckCircle2, Zap, Video } from 'lucide-react';

const EVENT_COLORS = {
  meeting: 'event-meeting',
  call: 'event-call',
  personal: 'event-personal',
  urgent: 'event-urgent',
  travel: 'event-travel',
  deep_work: 'event-deep-work',
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
const TemplateSelector = ({ day, onSelect }) => {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative">
      <button 
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Выбрать шаблон"
      >
        <span className="text-[10px]">Шаблон</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
          <button className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent">Рабочий день</button>
          <button className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent">Выходной</button>
          <button className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent">Отпуск</button>
          <button className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent text-muted-foreground">Нет шаблона</button>
        </div>
      )}
    </div>
  );
};

export const CalendarGrid = ({ currentDate, selectedDate, events, calendars, overloadedDays, ratings, view, onDateClick, onCellDoubleClick, onEventClick, loading }) => {
  if (view === 'day') return <DayView date={selectedDate} events={events} onEventClick={onEventClick} onCellDoubleClick={onCellDoubleClick} />;
  if (view === 'week') return <WeekView date={selectedDate} events={events} onDateClick={onDateClick} onEventClick={onEventClick} onCellDoubleClick={onCellDoubleClick} />;
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

const WeekView = ({ date, events, onDateClick, onEventClick, onCellDoubleClick }) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Понедельник первый
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7:00 - 19:00

  // Day name abbreviations
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getEventStyle = (event) => {
    try {
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);
      const startHour = start.getHours() + start.getMinutes() / 60;
      const duration = (end - start) / 3600000;
      // Offset from 7:00 (start of visible hours)
      const topOffset = (startHour - 7) * 60;
      return { 
        top: `${Math.max(topOffset, 0)}px`, 
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
      return (end - start) / 3600000; // в часах
    } catch { return 1; }
  };

  const isLongEvent = (event) => getEventDuration(event) >= 1;

  return (
    <div className="card-glass overflow-hidden" data-testid="week-view">
      {/* Header with day names and dates */}
      <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr) 60px' }}>
        {/* Left time column header */}
        <div className="p-2 text-center text-[10px] text-muted-foreground border-b border-r border-border/30"></div>
        
        {/* Day headers */}
        {days.map(day => (
          <div 
            key={day.toISOString()} 
            className={`group border-b border-r border-border/30 ${isSameDay(day, date) ? 'bg-accent/30' : ''}`}
          >
            <div className="flex items-start justify-between p-2">
              {/* Left: Day name and date */}
              <button 
                onClick={() => onDateClick(day)} 
                className="text-left hover:bg-accent/30 rounded px-1 -ml-1 transition-colors"
              >
                <p className="text-xs text-muted-foreground uppercase">{format(day, 'EEE', { locale: ru })}</p>
                <p className={`text-lg font-semibold ${isToday(day) ? 'text-violet-500' : ''}`}>
                  {format(day, 'd')}
                </p>
              </button>
              
              {/* Right: Template selector */}
              <TemplateSelector day={day} />
            </div>
            
            {/* All-day events row */}
            <div className="min-h-[28px] px-1 pb-1 space-y-0.5">
              {getAllDayEvents(day).map(event => (
                <div 
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={`px-2 py-0.5 rounded text-[10px] truncate cursor-pointer hover:opacity-80 ${EVENT_COLORS[event.event_type] || 'event-meeting'} ${event.status === 'tentative' && 'event-tentative'}`}
                >
                  {event.title}
                </div>
              ))}
              {/* Info link placeholder */}
              <button className="text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                Инфа о шаблоне
              </button>
            </div>
          </div>
        ))}
        
        {/* Right time column header */}
        <div className="p-2 text-center text-[10px] text-muted-foreground border-b border-border/30"></div>
      </div>

      {/* Time grid */}
      <div 
        className="grid max-h-[calc(100vh-280px)] overflow-y-auto" 
        style={{ gridTemplateColumns: '60px repeat(7, 1fr) 60px' }}
      >
        {/* Left time column */}
        <div className="border-r border-border/20">
          {hours.map(hour => (
            <div key={hour} className="h-[60px] px-2 flex items-start pt-1 justify-end text-[10px] text-muted-foreground/50 font-mono">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map(day => {
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
                />
              ))}
              
              {/* Current time line */}
              {isTodayCol && (
                <div 
                  className="absolute left-0 right-0 border-t-2 border-violet-500 z-10" 
                  style={{ top: `${(new Date().getHours() - 7 + new Date().getMinutes() / 60) * 60}px` }}
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
                
                return (
                  <div 
                    key={event.id} 
                    onClick={() => onEventClick(event)} 
                    className={`
                      absolute left-0.5 right-0.5 px-2 py-1 rounded-md text-xs cursor-pointer 
                      hover:opacity-90 transition-opacity overflow-hidden
                      ${isTemplate 
                        ? 'bg-transparent border-2 border-violet-400 text-violet-600 dark:text-violet-300' 
                        : isUnconfirmed 
                          ? 'border-2 border-dashed ' + EVENT_COLORS[event.event_type]
                          : EVENT_COLORS[event.event_type]
                      }
                    `} 
                    style={getEventStyle(event)} 
                    data-testid={`event-${event.id}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        {isLong && (
                          <span className="text-[10px] font-mono opacity-70 mr-1">
                            {event.start_time?.slice(11, 16)}
                          </span>
                        )}
                        <span className={`font-medium ${isLong ? 'text-[11px]' : 'text-[10px]'} truncate`}>
                          {event.title}
                        </span>
                      </div>
                      <EventIcons event={event} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Right time column */}
        <div className="border-l border-border/20">
          {hours.map(hour => (
            <div key={hour} className="h-[60px] px-2 flex items-start pt-1 justify-start text-[10px] text-muted-foreground/50 font-mono">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DayView = ({ date, events, onEventClick, onCellDoubleClick }) => {
  const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7:00 - 19:00
  const dayEvents = events.filter(e => e.start_time?.startsWith(format(date, 'yyyy-MM-dd')) && !e.is_all_day);
  const allDayEvents = events.filter(e => e.start_time?.startsWith(format(date, 'yyyy-MM-dd')) && e.is_all_day);

  const getEventStyle = (event) => {
    try {
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);
      const startHour = start.getHours() + start.getMinutes() / 60;
      const duration = (end - start) / 3600000;
      const topOffset = (startHour - 7) * 60;
      return { top: `${Math.max(topOffset, 0)}px`, height: `${Math.max(duration * 60, 30)}px` };
    } catch { return { top: '0px', height: '60px' }; }
  };

  const getEventDuration = (event) => {
    try {
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);
      return (end - start) / 3600000;
    } catch { return 1; }
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
          <TemplateSelector day={date} />
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="px-4 py-2 border-b border-border/30 bg-accent/20">
          <p className="text-xs text-muted-foreground mb-2">События дня</p>
          <div className="space-y-1">
            {allDayEvents.map(event => (
              <div 
                key={event.id}
                onClick={() => onEventClick(event)}
                className={`px-3 py-1.5 rounded text-sm cursor-pointer hover:opacity-80 ${EVENT_COLORS[event.event_type]}`}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="grid grid-cols-[60px_1fr_60px] max-h-[calc(100vh-280px)] overflow-y-auto">
        {/* Left time column */}
        <div className="border-r border-border/20">
          {hours.map(hour => (
            <div key={hour} className="h-[60px] px-2 flex items-start pt-1 justify-end text-[10px] text-muted-foreground/50 font-mono">
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
            />
          ))}
          
          {/* Current time line */}
          {isToday(date) && (
            <div 
              className="absolute left-0 right-0 border-t-2 border-violet-500 z-10" 
              style={{ top: `${(new Date().getHours() - 7 + new Date().getMinutes() / 60) * 60}px` }}
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
            
            return (
              <div 
                key={event.id} 
                onClick={() => onEventClick(event)} 
                className={`
                  absolute left-2 right-2 px-3 py-1.5 rounded-lg cursor-pointer 
                  hover:opacity-90 transition-opacity
                  ${isTemplate 
                    ? 'bg-transparent border-2 border-violet-400 text-violet-600 dark:text-violet-300' 
                    : isUnconfirmed 
                      ? 'border-2 border-dashed ' + EVENT_COLORS[event.event_type]
                      : EVENT_COLORS[event.event_type]
                  }
                `}
                style={getEventStyle(event)} 
                data-testid={`event-${event.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isLong && (
                      <span className="text-xs font-mono opacity-70">
                        {event.start_time?.slice(11, 16)}
                      </span>
                    )}
                    <span className="font-medium text-sm truncate">{event.title}</span>
                  </div>
                  <EventIcons event={event} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right time column */}
        <div className="border-l border-border/20">
          {hours.map(hour => (
            <div key={hour} className="h-[60px] px-2 flex items-start pt-1 justify-start text-[10px] text-muted-foreground/50 font-mono">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
