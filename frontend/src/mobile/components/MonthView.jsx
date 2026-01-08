import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const MonthView = ({ 
  currentMonth, 
  onMonthChange, 
  onDaySelect,
  selectedDate,
  events = [],
  getEventTypeColor 
}) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return isSameDay(eventDate, day);
    });
  };

  return (
    <div className="flex flex-col h-full pb-20">
      {/* Month header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
        <button 
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-accent"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <h2 className="text-lg font-semibold">
          <span className="text-[#085C53]">{format(currentMonth, 'LLLL', { locale: ru })}</span>
          {' '}
          <span className="text-muted-foreground">{format(currentMonth, 'yyyy')}</span>
        </h2>

        <button 
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-accent"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto p-4">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDayNames.map(day => (
            <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isSameDay(day, new Date());
            const dayEvents = getEventsForDay(day);
            
            return (
              <button
                key={idx}
                onClick={() => onDaySelect(day)}
                className={`
                  relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors
                  ${
                    !isCurrentMonth ? 'text-muted-foreground/50' : ''
                  }
                  ${
                    isSelected 
                      ? 'bg-[#074a44] text-white font-bold' 
                      : isTodayDate
                      ? 'text-[#085C53] font-bold border-2 border-[#085C53]'
                      : 'hover:bg-accent'
                  }
                `}
              >
                {format(day, 'd')}
                {/* Event dots */}
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => {
                      const eventColor = getEventTypeColor(event);
                      return (
                        <div 
                          key={i} 
                          className="w-1 h-1 rounded-full"
                          style={{ 
                            backgroundColor: isSelected ? 'white' : eventColor 
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
