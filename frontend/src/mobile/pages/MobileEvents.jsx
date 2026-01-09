import { EventIcons } from '../../components/sidebar/EventIcons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export const MobileEvents = ({ selectedDate, events, onEventClick, getEventTypeColor }) => {
  // Separate all-day and timed events
  const allDayEvents = events.filter(e => e.all_day);
  const timedEvents = events.filter(e => !e.all_day).sort(
    (a, b) => new Date(a.start_time) - new Date(b.start_time)
  );

  return (
    <div className="p-4 space-y-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">
          {format(selectedDate, 'd MMMM, EEEE', { locale: ru })}
        </h2>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Нет событий на этот день</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* All-day events */}
          {allDayEvents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Весь день
              </p>
              {allDayEvents.map((event) => {
                const isUnconfirmed = event.status === 'tentative';
                const isTemplate = event.status === 'template';
                const eventColor = getEventTypeColor(event);
                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className={`w-full text-left p-4 rounded-xl transition-colors ${
                      isUnconfirmed || isTemplate
                        ? 'border-2 bg-transparent'
                        : 'bg-accent/50 hover:bg-accent'
                    } ${
                      isTemplate ? 'border-solid' : isUnconfirmed ? 'border-dashed' : ''
                    }`}
                    style={
                      isUnconfirmed || isTemplate
                        ? { borderColor: eventColor }
                        : { borderLeft: `4px solid ${eventColor}` }
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{event.title}</p>
                      <EventIcons event={event} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Timed events */}
          {timedEvents.length > 0 && (
            <div className="space-y-2">
              {allDayEvents.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  События
                </p>
              )}
              {timedEvents.map((event) => {
                const isUnconfirmed = event.status === 'tentative';
                const isTemplate = event.status === 'template';
                const eventColor = getEventTypeColor(event);
                const startTime = new Date(event.start_time);
                const endTime = new Date(event.end_time);

                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className={`w-full text-left p-4 rounded-xl transition-colors ${
                      isUnconfirmed || isTemplate
                        ? 'border-2 bg-transparent'
                        : 'bg-accent hover:bg-border'
                    } ${
                      isTemplate ? 'border-solid' : isUnconfirmed ? 'border-dashed' : ''
                    }`}
                    style={
                      isUnconfirmed || isTemplate
                        ? { borderColor: eventColor }
                        : { borderLeft: `4px solid ${eventColor}` }
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                        </p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📍 {event.location}
                          </p>
                        )}
                      </div>
                      <EventIcons event={event} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
