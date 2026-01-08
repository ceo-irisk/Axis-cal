import { useState } from 'react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { DialogFooter } from '../../ui/dialog';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { TIMEZONES } from '../../../lib/timezones';
import { TemplateEventForm } from './TemplateEventForm';

export const TemplateForm = ({ initialData, eventTypes, onSave, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [templateType, setTemplateType] = useState(initialData?.template_type || 'day');
  const [timezone, setTimezone] = useState(initialData?.timezone || 'Europe/Moscow');
  const [events, setEvents] = useState(initialData?.events || []);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventIdx, setEditingEventIdx] = useState(null);

  const handleAddEvent = (eventData) => {
    if (editingEventIdx !== null) {
      const updated = [...events];
      updated[editingEventIdx] = eventData;
      setEvents(updated);
      setEditingEventIdx(null);
    } else {
      setEvents([...events, eventData]);
    }
    setShowEventForm(false);
  };

  const handleEditEvent = (idx) => {
    setEditingEventIdx(idx);
    setShowEventForm(true);
  };

  const handleDeleteEvent = (idx) => {
    setEvents(events.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), template_type: templateType, timezone, events });
  };

  if (showEventForm) {
    return (
      <TemplateEventForm 
        initialData={editingEventIdx !== null ? events[editingEventIdx] : null}
        eventTypes={eventTypes}
        templateType={templateType}
        onSave={handleAddEvent}
        onCancel={() => { setShowEventForm(false); setEditingEventIdx(null); }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Название шаблона</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Рабочий день" className="mt-1" />
      </div>
      <div>
        <Label>Тип шаблона</Label>
        <Select value={templateType} onValueChange={setTemplateType}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">День</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label>Часовой пояс шаблона</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map(tz => (
              <SelectItem key={tz.id} value={tz.id}>
                {tz.name} (GMT{tz.offset >= 0 ? '+' : ''}{tz.offset})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Все события в этом шаблоне будут использовать этот часовой пояс
        </p>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>События ({events.length})</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowEventForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Добавить
          </Button>
        </div>
        
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center border rounded-lg">Нет событий</p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {events.map((event, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-accent/50 group">
                <div className="flex-1">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(event.start_hour).padStart(2, '0')}:{String(event.start_minute || 0).padStart(2, '0')} - 
                    {String(event.end_hour).padStart(2, '0')}:{String(event.end_minute || 0).padStart(2, '0')}
                    {templateType === 'week' && ` • День ${event.day_of_week + 1}`}
                  </p>
                </div>
                <button type="button" onClick={() => handleEditEvent(idx)} className="p-1 rounded hover:bg-background opacity-0 group-hover:opacity-100">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => handleDeleteEvent(idx)} className="p-1 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </DialogFooter>
    </form>
  );
};
