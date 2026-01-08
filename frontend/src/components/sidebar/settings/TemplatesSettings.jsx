import { Plus, Play, Edit2, Trash2 } from 'lucide-react';

export const TemplatesSettings = ({ 
  templates, 
  onAdd, 
  onEdit, 
  onDelete, 
  onApply 
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Шаблоны дней</h3>
        <button 
          onClick={onAdd}
          className="p-1.5 rounded-lg hover:bg-accent"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      {templates.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Нет шаблонов</p>
      ) : (
        <div className="space-y-2">
          {templates.map(template => (
            <div key={template.id} className="p-3 rounded-lg bg-accent/50 hover:bg-accent group">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{template.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onApply(template)}
                    className="p-1 rounded hover:bg-[#085C53]/20" 
                    title="Применить"
                  >
                    <Play className="w-3.5 h-3.5 text-[#085C53]" />
                  </button>
                  <button 
                    onClick={() => onEdit(template)}
                    className="p-1 rounded hover:bg-background" 
                    title="Редактировать"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => onDelete(template.id)}
                    className="p-1 rounded hover:bg-red-500/20" 
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {template.events?.length || 0} событий
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
