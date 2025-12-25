import { useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO,
  startOfDay,
  endOfDay,
  eachHourOfInterval,
  addHours
} from 'date-fns';
import { ru } from 'date-fns/locale';

const EVENT_COLORS = {
  meeting: 'bg-violet-500/20 border-l-violet-500 text-violet-300',
  call: 'bg-cyan-500/20 border-l-cyan-500 text-cyan-300',
  personal: 'bg-amber-500/20 border-l-amber-500 text-amber-300',
  urgent: 'bg-red-500/20 border-l-red-500 text-red-300',
  travel: 'bg-emerald-500/20 border-l-emerald-500 text-emerald-300',
  deep_work: 'bg-indigo-500/20 border-l-indigo-500 text-indigo-300',
};

export const CalendarGrid = ({ 
  currentDate, 
  selectedDate, 
  events, 
  overloadedDays,
  ratings,
  view,
  onDateClick, 
  onEventClick,
  loading 
}) => {
  if (view === 'day') {
    return (
      <DayView 
        date={selectedDate} 
        events={events} 
        onEventClick={onEventClick}
      />
    );
  }

  if (view === 'week') {
    return (
      <WeekView 
        date={selectedDate} 
        events={events} 
        onDateClick={onDateClick}
        onEventClick={onEventClick}
      />
    );
  }

  return (
    <MonthView 
      currentDate={currentDate}
      selectedDate={selectedDate}
      events={events}
      overloadedDays={overloadedDays}
      ratings={ratings}
      onDateClick={onDateClick}
      onEventClick={onEventClick}
      loading={loading}
    />
  );
};

const MonthView = ({ currentDate, selectedDate, events, overloadedDays, ratings, onDateClick, onEventClick, loading }) => {
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
    return events.filter(e => e.start_time?.startsWith(dateStr)).slice(0, 3);
  };

  const isOverloaded = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return overloadedDays.some(d => d.date === dateStr && d.is_overloaded);
  };

  const getDayRating = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return ratings[dateStr]?.rating;
  };

  return (
    <div className="card-glass overflow-hidden" data-testid="month-view">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-white/5">
        {weekDays.map(day => (
          <div key={day} className="px-4 py-3 text-center text-sm text-secondary-text font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
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
              className={`
                relative min-h-[120px] p-2 border-b border-r border-white/5 text-left transition-colors
                ${isCurrentMonth ? '' : 'opacity-40'}
                ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}
                ${overloaded ? 'day-overloaded' : ''}
              `}
              data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-2">
                <span className={`
                  inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                  ${isTodayDate ? 'bg-white text-black' : ''}
                  ${isSelected && !isTodayDate ? 'ring-1 ring-white/30' : ''}
                `}>
                  {format(day, 'd')}
                </span>
                {rating && (
                  <span className="text-xs text-amber-400">★{rating}</span>
                )}
              </div>

              {/* Events */}
              <div className="space-y-1">
                {dayEvents.map((event, eventIdx) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={`
                      px-2 py-1 rounded text-xs truncate border-l-2 cursor-pointer
                      transition-opacity hover:opacity-80
                      ${EVENT_COLORS[event.event_type] || EVENT_COLORS.meeting}
                      ${event.status === 'tentative' ? 'event-tentative' : ''}
                    `}
                    data-testid={`event-${event.id}`}
                  >
                    {event.title}
                  </div>
                ))}
                {events.filter(e => e.start_time?.startsWith(format(day, 'yyyy-MM-dd'))).length > 3 && (
                  <p className="text-xs text-secondary-text px-2">
                    +{events.filter(e => e.start_time?.startsWith(format(day, 'yyyy-MM-dd'))).length - 3} ещё
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const WeekView = ({ date, events, onDateClick, onEventClick }) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventStyle = (event, dayDate) => {
    try {
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);
      const startHour = start.getHours() + start.getMinutes() / 60;
      const endHour = end.getHours() + end.getMinutes() / 60;
      const duration = endHour - startHour;
      
      return {
        top: `${startHour * 60}px`,
        height: `${Math.max(duration * 60, 30)}px`,
      };
    } catch {
      return { top: '0px', height: '60px' };
    }
  };

  const getDayEvents = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return events.filter(e => e.start_time?.startsWith(dateStr));
  };

  return (
    <div className="card-glass overflow-hidden" data-testid="week-view">
      {/* Header */}
      <div className="grid grid-cols-8 border-b border-white/5">
        <div className="p-3 text-center text-sm text-secondary-text">
          <span className="font-mono">GMT+3</span>
        </div>
        {days.map(day => (
          <button
            key={day.toISOString()}
            onClick={() => onDateClick(day)}
            className={`p-3 text-center hover:bg-white/5 transition-colors ${isToday(day) ? 'bg-white/5' : ''}`}
          >
            <p className="text-xs text-secondary-text">{format(day, 'EEE', { locale: ru })}</p>
            <p className={`text-lg font-medium ${isToday(day) ? 'text-white' : ''}`}>{format(day, 'd')}</p>
          </button>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-8 max-h-[600px] overflow-y-auto">
        {/* Time column */}
        <div className="border-r border-white/5">
          {hours.map(hour => (
            <div key={hour} className="h-[60px] px-2 py-1 text-right text-xs text-secondary-text font-mono">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map(day => {
          const dayEvents = getDayEvents(day);
          return (
            <div key={day.toISOString()} className="relative border-r border-white/5">
              {hours.map(hour => (
                <div key={hour} className="h-[60px] border-b border-white/5" />
              ))}
              
              {/* Current time indicator */}
              {isToday(day) && (
                <div 
                  className="current-time-line"
                  style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60}px` }}
                />
              )}

              {/* Events */}
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={`
                    absolute left-1 right-1 px-2 py-1 rounded cursor-pointer
                    border-l-2 overflow-hidden transition-opacity hover:opacity-80
                    ${EVENT_COLORS[event.event_type] || EVENT_COLORS.meeting}
                    ${event.status === 'tentative' ? 'event-tentative' : ''}
                  `}
                  style={getEventStyle(event, day)}
                  data-testid={`event-${event.id}`}
                >
                  <p className="text-xs font-medium truncate">{event.title}</p>
                  <p className="text-xs opacity-70 font-mono">
                    {event.start_time?.slice(11, 16)}
                  </p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DayView = ({ date, events, onEventClick }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayEvents = events.filter(e => e.start_time?.startsWith(dateStr));

  const getEventStyle = (event) => {
    try {
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);
      const startHour = start.getHours() + start.getMinutes() / 60;
      const endHour = end.getHours() + end.getMinutes() / 60;
      const duration = endHour - startHour;
      
      return {
        top: `${startHour * 80}px`,
        height: `${Math.max(duration * 80, 40)}px`,
      };
    } catch {
      return { top: '0px', height: '80px' };
    }
  };

  return (
    <div className="card-glass overflow-hidden" data-testid="day-view">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-lg font-semibold">
          {format(date, 'EEEE, d MMMM yyyy', { locale: ru })}
        </h2>
        <p className="text-sm text-secondary-text mt-1">
          {dayEvents.length} событий
        </p>
      </div>

      <div className="grid grid-cols-[80px_1fr] max-h-[600px] overflow-y-auto">
        {/* Time column */}
        <div className="border-r border-white/5">
          {hours.map(hour => (
            <div key={hour} className="h-[80px] px-3 py-2 text-right text-sm text-secondary-text font-mono">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Events area */}
        <div className="relative">
          {hours.map(hour => (
            <div key={hour} className="h-[80px] border-b border-white/5" />
          ))}

          {/* Current time indicator */}
          {isToday(date) && (
            <div 
              className="current-time-line"
              style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 80}px` }}
            />
          )}

          {/* Events */}
          {dayEvents.map(event => (
            <div
              key={event.id}
              onClick={() => onEventClick(event)}
              className={`
                absolute left-2 right-2 px-4 py-2 rounded-xl cursor-pointer
                border-l-4 transition-opacity hover:opacity-80
                ${EVENT_COLORS[event.event_type] || EVENT_COLORS.meeting}
                ${event.status === 'tentative' ? 'event-tentative' : ''}
              `}
              style={getEventStyle(event)}
              data-testid={`event-${event.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{event.title}</p>
                  {event.description && (
                    <p className="text-sm opacity-70 truncate">{event.description}</p>
                  )}
                </div>
                <p className="text-sm font-mono flex-shrink-0">
                  {event.start_time?.slice(11, 16)} - {event.end_time?.slice(11, 16)}
                </p>
              </div>
              {event.location && (
                <p className="text-xs opacity-60 mt-1">{event.location}</p>
              )}
              <div className="flex gap-2 mt-2">
                <span className={`badge badge-${event.event_type}`}>
                  {event.event_type === 'meeting' ? 'Встреча' : 
                   event.event_type === 'call' ? 'Звонок' :
                   event.event_type === 'personal' ? 'Личное' :
                   event.event_type === 'urgent' ? 'Срочно' :
                   event.event_type === 'travel' ? 'Поездка' : 'Работа'}
                </span>
                {event.status === 'tentative' && (
                  <span className="badge badge-tentative">Предварительно</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
