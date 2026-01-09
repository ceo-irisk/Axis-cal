import { Star, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export const MobileDashboard = ({ selectedDate, rating, violations, onRateDay }) => {
  return (
    <div className="p-4 space-y-6">
      {/* Rating Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Оценка дня</h3>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-sm text-muted-foreground mb-3">
            {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
          </p>
          <div className="flex gap-2 justify-center mb-3">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => onRateDay?.(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (rating || 0)
                      ? 'fill-[#085C53] text-[#085C53]'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating && (
            <p className="text-center text-sm font-medium">
              Оценка: {rating} из 5
            </p>
          )}
        </div>
      </div>

      {/* Violations Section */}
      {violations && violations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Нарушения правил</h3>
          <div className="space-y-2">
            {violations.map((violation, idx) => (
              <div
                key={idx}
                className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    {violation.rule_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {violation.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!violations || violations.length === 0) && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-3">
            <AlertTriangle className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            Нет нарушений правил
          </p>
        </div>
      )}
    </div>
  );
};
