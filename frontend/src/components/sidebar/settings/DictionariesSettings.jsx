import { Plus, Edit2, Trash2, Palette, ExternalLink } from 'lucide-react';

export const DictionariesSettings = ({ 
  eventTypes,
  eventStatuses,
  icsSubscriptions,
  onAddType,
  onEditType,
  onDeleteType,
  onAddStatus,
  onEditStatus,
  onDeleteStatus,
  onAddICS,
  onDeleteICS
}) => {
  return (
    <div className="space-y-6">
      {/* Event Types */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Типы событий</h3>
          <button onClick={onAddType} className="p-1.5 rounded-lg hover:bg-accent">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {eventTypes.map(type => (
            <div key={type.id || type.name} className="flex items-center justify-between p-2.5 rounded-lg bg-accent/50 hover:bg-accent group">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: type.color }} />
                <span className="text-sm">{type.label}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEditType(type)} className="p-1 rounded hover:bg-background">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {!type.id?.startsWith('default-') && (
                  <button onClick={() => onDeleteType(type.id)} className="p-1 rounded hover:bg-red-500/20">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event Statuses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Статусы событий</h3>
          <button onClick={onAddStatus} className="p-1.5 rounded-lg hover:bg-accent">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {eventStatuses.map(status => (
            <div key={status.id || status.name} className="flex items-center justify-between p-2.5 rounded-lg bg-accent/50 hover:bg-accent group">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: status.color }} />
                <span className="text-sm">{status.label}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEditStatus(status)} className="p-1 rounded hover:bg-background">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {!status.id?.startsWith('default-') && (
                  <button onClick={() => onDeleteStatus(status.id)} className="p-1 rounded hover:bg-red-500/20">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ICS Subscriptions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Подключенные календари</h3>
          <button onClick={onAddICS} className="p-1.5 rounded-lg hover:bg-accent">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {icsSubscriptions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Нет подключенных календарей</p>
        ) : (
          <div className="space-y-2">
            {icsSubscriptions.map(sub => (
              <div key={sub.id} className="flex items-center justify-between p-2.5 rounded-lg bg-accent/50 hover:bg-accent group">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: sub.color }} />
                  <span className="text-sm">{sub.name}</span>
                </div>
                <button onClick={() => onDeleteICS(sub.id)} className="p-1 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
