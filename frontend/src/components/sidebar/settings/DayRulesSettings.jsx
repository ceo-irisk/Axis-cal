import { Plus, Edit2, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export const DayRulesSettings = ({ 
  rules, 
  onAdd, 
  onEdit, 
  onDelete, 
  onToggle 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Правила дня</h3>
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            e.preventDefault(); 
            onAdd(); 
          }}
          className="p-1.5 rounded-lg hover:bg-accent"
          type="button"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      {rules.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Нет правил</p>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div key={rule.id} className="p-3 rounded-lg bg-accent/50 hover:bg-accent group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-sm">{rule.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Значение: <span className="font-mono">{rule.value}</span>
                    {rule.rule_type === 'max_meetings' && ' встреч'}
                    {rule.rule_type === 'min_break' && ' минут'}
                    {rule.rule_type === 'max_hours' && ' часов'}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onToggle(rule); 
                    }}
                    className={`p-1.5 rounded hover:bg-background transition-colors ${rule.is_active ? 'text-green-600' : 'text-gray-500'}`}
                    title={rule.is_active ? 'Отключить' : 'Включить'}
                    type="button"
                  >
                    {rule.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onEdit(rule); 
                    }}
                    className="p-1.5 rounded hover:bg-background"
                    type="button"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onDelete(rule.id); 
                    }}
                    className="p-1.5 rounded hover:bg-red-500/20"
                    type="button"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Правила дня автоматически проверяются для каждого дня. Нарушения отображаются во вкладке &ldquo;Дашборд&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
};
