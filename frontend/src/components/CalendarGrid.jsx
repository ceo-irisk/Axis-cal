import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const EVENT_COLORS = {
  meeting: 'event-meeting',
  call: 'event-call',
  personal: 'event-personal',
  urgent: 'event-urgent',
  travel: 'event-travel',
  deep_work: 'event-deep-work',
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
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventStyle = (event) => {
    try {
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);
      const startHour = start.getHours() + start.getMinutes() / 60;
      const duration = (end - start) / 3600000;
      return { top: `${startHour * 60}px`, height: `${Math.max(duration * 60, 24)}px` };
    } catch { return { top: '0px', height: '60px' }; }
  };

  const getDayEvents = (day) => events.filter(e => e.start_time?.startsWith(format(day, 'yyyy-MM-dd')));

  return (
    <div className="card-glass overflow-hidden" data-testid="week-view">
      <div className="grid grid-cols-8 border-b border-border/30">
        <div className="p-3 text-center text-xs text-muted-foreground/70 font-mono"></div>
        {days.map(day => (
          <button key={day.toISOString()} onClick={() => onDateClick(day)} className={`p-3 text-center hover:bg-accent/30 transition-colors ${isSameDay(day, date) ? 'bg-accent' : ''}`}>
            <p className="text-xs text-muted-foreground">{format(day, 'EEE', { locale: ru })}</p>
            <p className={`text-lg font-medium ${isToday(day) && !isSameDay(day, date) ? 'text-violet-500' : ''} ${isToday(day) && isSameDay(day, date) ? 'text-foreground' : ''}`}>{format(day, 'd')}</p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 max-h-[calc(100vh-220px)] overflow-y-auto">
        <div className="border-r border-border/20">
          {hours.map(hour => <div key={hour} className="h-[60px] px-2 py-1 text-right text-xs text-muted-foreground/50 font-mono">{String(hour).padStart(2, '0')}:00</div>)}
        </div>
        {days.map(day => {
          const dayEvents = getDayEvents(day);
          return (
            <div key={day.toISOString()} className="relative border-r border-border/20">
              {hours.map(hour => <div key={hour} className="h-[60px] border-b border-border/20 hover:bg-accent/20" onDoubleClick={() => onCellDoubleClick(day, hour)} />)}
              {isToday(day) && <div className="current-time-line" style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60}px` }} />}
              {dayEvents.map(event => (
                <div key={event.id} onClick={() => onEventClick(event)} className={`absolute left-0.5 right-0.5 px-1.5 py-0.5 rounded text-xs cursor-pointer hover:opacity-90 ${EVENT_COLORS[event.event_type]} ${event.status === 'tentative' && 'event-tentative'}`} style={getEventStyle(event)} data-testid={`event-${event.id}`}>
                  <p className="font-medium truncate text-[11px]">{event.title}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DayView = ({ date, events, onEventClick, onCellDoubleClick }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayEvents = events.filter(e => e.start_time?.startsWith(format(date, 'yyyy-MM-dd')));

  const getEventStyle = (event) => {
    try {
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);
      const startHour = start.getHours() + start.getMinutes() / 60;
      const duration = (end - start) / 3600000;
      return { top: `${startHour * 60}px`, height: `${Math.max(duration * 60, 30)}px` };
    } catch { return { top: '0px', height: '60px' }; }
  };

  return (
    <div className="card-glass overflow-hidden" data-testid="day-view">
      <div className="p-4 border-b border-border/30">
        <h2 className="text-lg font-semibold">{format(date, 'EEEE, d MMMM', { locale: ru })}</h2>
        <p className="text-sm text-muted-foreground">{dayEvents.length} событий</p>
      </div>
      <div className="grid grid-cols-[60px_1fr] max-h-[calc(100vh-220px)] overflow-y-auto">
        <div className="border-r border-border/20">
          {hours.map(hour => <div key={hour} className="h-[60px] px-2 py-1 text-right text-xs text-muted-foreground/50 font-mono">{String(hour).padStart(2, '0')}:00</div>)}
        </div>
        <div className="relative">
          {hours.map(hour => <div key={hour} className="h-[60px] border-b border-border/20 hover:bg-accent/20" onDoubleClick={() => onCellDoubleClick(date, hour)} />)}
          {isToday(date) && <div className="current-time-line" style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60}px` }} />}
          {dayEvents.map(event => (
            <div key={event.id} onClick={() => onEventClick(event)} className={`absolute left-2 right-2 px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-90 ${EVENT_COLORS[event.event_type]} ${event.status === 'tentative' && 'event-tentative'}`} style={getEventStyle(event)} data-testid={`event-${event.id}`}>
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm truncate">{event.title}</p>
                <p className="text-xs font-mono opacity-70">{event.start_time?.slice(11, 16)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
