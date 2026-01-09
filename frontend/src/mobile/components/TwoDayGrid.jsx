import { useState, useRef } from 'react';
import { format, addDays, subDays, startOfDay, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const TwoDayGrid = ({ 
  currentDate, 
  onDateChange, 
  events = [], 
  onEventClick,
  onCreateEvent,
  getEventTypeColor 
}) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const containerRef = useRef(null);

  const minSwipeDistance = 80;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !touchStartY) return;
    
    const distanceX = touchStart - touchEnd;
    const distanceY = touchStartY - (touchEnd || touchStart);
    
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY) * 2;
    
    if (isHorizontalSwipe) {
      const isLeftSwipe = distanceX > minSwipeDistance;
      const isRightSwipe = distanceX < -minSwipeDistance;

      if (isLeftSwipe || isRightSwipe) {
        if (isLeftSwipe) {
          try {
            onDateChange(addDays(currentDate, 2));
          } catch (e) {
            console.error('Date change error:', e);
          }
        }
        if (isRightSwipe) {
          try {
            onDateChange(subDays(currentDate, 2));
          } catch (e) {
            console.error('Date change error:', e);
          }
        }
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
    setTouchStartY(null);
  };

  let day1, day2, days;
  try {
    day1 = startOfDay(currentDate);
    day2 = addDays(day1, 1);
    days = [day1, day2];
  } catch (e) {
    console.error('Date calculation error:', e);
    day1 = new Date(currentDate);
    day2 = new Date(currentDate);
    day2.setDate(day2.getDate() + 1);
    days = [day1, day2];
  }

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return isSameDay(eventDate, day);
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <>
      {/* Header with navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <button 
          onClick={() => onDateChange(subDays(currentDate, 2))}
          className="p-2 rounded-lg hover:bg-accent"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex gap-6">
          {days.map(day => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toString()} className="text-center">
                <div className="text-xs text-muted-foreground uppercase mb-1">
                  {format(day, 'EEE', { locale: ru })}
                </div>
                <div className={`text-2xl font-bold ${isToday ? 'text-green-500' : ''}`}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={() => onDateChange(addDays(currentDate, 2))}
          className="p-2 rounded-lg hover:bg-accent"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Two-day grid with swipe support */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch', paddingBottom: '80px' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="grid grid-cols-[auto_1fr_1fr] gap-px bg-border">
          {/* Time column */}
          <div className="bg-background">
            {hours.map(hour => (
              <div key={hour} className="h-16 px-2 py-1 text-xs text-muted-foreground border-b border-border flex items-start">
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            
            return (
              <div key={day.toString()} className="bg-background relative">
                {/* Time slots */}
                <div className="relative">
                  {hours.map(hour => (
                    <div 
                      key={hour} 
                      className="h-16 border-b border-border hover:bg-accent/30 cursor-pointer transition-colors"
                      onClick={() => onCreateEvent(day, hour)}
                    />
                  ))}

                  {/* Events overlay */}
                  {dayEvents.map(event => {
                    const startTime = new Date(event.start_time);
                    const endTime = new Date(event.end_time);
                    const startHour = startTime.getHours();
                    const startMinute = startTime.getMinutes();
                    const duration = (endTime - startTime) / (1000 * 60);
                    
                    const top = (startHour + startMinute / 60) * 64;
                    const height = (duration / 60) * 64;
                    const eventColor = getEventTypeColor(event);

                    const isUnconfirmed = event.status === 'tentative';
                    const isTemplate = event.status === 'template';

                    return (
                      <button
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className={`absolute left-1 right-1 rounded-lg px-2 py-1 text-left overflow-hidden ${
                          isUnconfirmed || isTemplate
                            ? 'border-2 bg-transparent'
                            : 'shadow-sm'
                        } ${
                          isTemplate ? 'border-solid' : isUnconfirmed ? 'border-dashed' : ''
                        }`}
                        style={{
                          top: `${top}px`,
                          height: `${Math.max(height, 32)}px`,
                          ...(isUnconfirmed || isTemplate
                            ? { borderColor: eventColor }
                            : { 
                                backgroundColor: `${eventColor}20`,
                                borderLeft: `4px solid ${eventColor}`
                              })
                        }}
                      >
                        <div className="text-xs font-medium truncate">{event.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
