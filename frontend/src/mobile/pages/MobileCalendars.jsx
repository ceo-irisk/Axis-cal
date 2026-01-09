import { Calendar, Eye, EyeOff } from 'lucide-react';
import { CALENDAR_ICONS } from '../../components/sidebar/constants';

export const MobileCalendars = ({ calendars = [], hiddenCalendars = new Set(), onToggleCalendar }) => {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-4">Мои календари</h2>
      </div>

      {calendars.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Нет календарей</p>
        </div>
      ) : (
        <div className="space-y-2">
          {calendars.map((cal) => {
            const Icon = CALENDAR_ICONS[cal.icon] || Calendar;
            const isHidden = hiddenCalendars.has(cal.id);

            return (
              <div
                key={cal.id}
                className="flex items-center justify-between p-4 rounded-xl bg-accent/50 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${cal.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: cal.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{cal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cal.event_count || 0} событий
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onToggleCalendar?.(cal.id)}
                  className="p-2 rounded-lg hover:bg-background transition-colors"
                >
                  {isHidden ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-[#085C53]" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
