import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Star, AlertTriangle, FileText, Clock, MapPin } from 'lucide-react';
import { useState } from 'react';

const EVENT_COLORS = {
  meeting: 'border-l-violet-500',
  call: 'border-l-cyan-500',
  personal: 'border-l-amber-500',
  urgent: 'border-l-red-500',
  travel: 'border-l-emerald-500',
  deep_work: 'border-l-indigo-500',
};

export const RightPanel = ({ 
  selectedDate, 
  events, 
  rating, 
  violations,
  onRateDay,
  onOpenSurvey,
  onEventClick
}) => {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [ratingNotes, setRatingNotes] = useState('');
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  const handleRate = (stars) => {
    onRateDay(stars, ratingNotes);
  };

  // Calculate total hours
  const totalMinutes = events.reduce((acc, event) => {
    try {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      return acc + (end - start) / 60000;
    } catch {
      return acc;
    }
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = Math.round(totalMinutes % 60);

  return (
    <aside className="right-panel" data-testid="right-panel">
      {/* Date header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--primary-text)]">
          {format(selectedDate, 'd MMMM', { locale: ru })}
        </h2>
        <p className="text-[var(--secondary-text)] text-sm">
          {format(selectedDate, 'EEEE', { locale: ru })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-[var(--accent-secondary)]">
          <p className="text-2xl font-semibold text-[var(--primary-text)]">{events.length}</p>
          <p className="text-xs text-[var(--secondary-text)]">Событий</p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--accent-secondary)]">
          <p className="text-2xl font-semibold font-mono text-[var(--primary-text)]">
            {totalHours}:{String(remainingMinutes).padStart(2, '0')}
          </p>
          <p className="text-xs text-[var(--secondary-text)]">Часов</p>
        </div>
      </div>

      {/* Rule violations */}
      {violations?.violations?.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20" data-testid="rule-violations">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-medium text-red-500">Нарушения правил</h3>
          </div>
          <div className="space-y-2">
            {violations.violations.map((v, idx) => (
              <p key={idx} className="text-xs text-red-600 dark:text-red-400">
                {v.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Day rating */}
      <div className="mb-6 p-4 rounded-xl bg-[var(--accent-secondary)]" data-testid="day-rating">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[var(--primary-text)]">Оценка дня</h3>
          {rating?.rating && (
            <span className="text-xs text-[var(--secondary-text)]">
              Оценено: {rating.rating}/5
            </span>
          )}
        </div>
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => handleRate(star)}
              className="p-1 transition-transform hover:scale-110"
              data-testid={`rating-star-${star}`}
            >
              <Star
                className={`w-6 h-6 ${
                  star <= (hoveredStar || rating?.rating || 0)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-[var(--secondary-text)]'
                }`}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
        <input
          type="text"
          value={ratingNotes}
          onChange={(e) => setRatingNotes(e.target.value)}
          placeholder="Заметка к оценке..."
          className="w-full input-glass text-sm"
          data-testid="rating-notes-input"
        />
      </div>

      {/* Events list */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3 text-[var(--primary-text)]">События дня</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-sm text-[var(--secondary-text)] py-4 text-center">
              Нет событий на этот день
            </p>
          ) : (
            events.map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className={`
                  w-full text-left p-3 rounded-xl bg-[var(--accent-secondary)] 
                  border-l-2 hover:bg-[var(--border)] transition-colors
                  ${EVENT_COLORS[event.event_type] || EVENT_COLORS.meeting}
                  ${event.status === 'tentative' ? 'opacity-70' : ''}
                `}
                data-testid={`right-panel-event-${event.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm truncate text-[var(--primary-text)]">{event.title}</p>
                  {event.status === 'tentative' && (
                    <span className="badge badge-tentative text-xs">?</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--secondary-text)]">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {event.start_time?.slice(11, 16)}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* End of day survey button */}
      {isToday && (
        <button
          onClick={onOpenSurvey}
          className="w-full btn-secondary flex items-center justify-center gap-2"
          data-testid="open-survey-button"
        >
          <FileText className="w-4 h-4" />
          Завершить день
        </button>
      )}
    </aside>
  );
};

export default RightPanel;
