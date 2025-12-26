import { useState, useEffect } from 'react';
import { format, addHours } from 'date-fns';
import { X, Trash2, Clock, MapPin, Users, FileText } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getEventFields } from '../lib/api';

const EVENT_TYPES = [
  { value: 'meeting', label: 'Встреча', color: '#8b5cf6' },
  { value: 'call', label: 'Звонок', color: '#06b6d4' },
  { value: 'personal', label: 'Личное', color: '#f59e0b' },
  { value: 'urgent', label: 'Срочно', color: '#ef4444' },
  { value: 'travel', label: 'Поездка', color: '#10b981' },
  { value: 'deep_work', label: 'Глубокая работа', color: '#6366f1' },
];

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Подтверждено' },
  { value: 'tentative', label: 'Предварительно' },
  { value: 'cancelled', label: 'Отменено' },
];

export const EventModal = ({ event, defaultDate, defaultHour, calendars = [], onSave, onDelete, onClose }) => {
  const [customFields, setCustomFields] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    event_type: 'meeting',
    status: 'confirmed',
    location: '',
    attendees: [],
    custom_fields: {},
    calendar_id: '',
  });
  const [attendeeInput, setAttendeeInput] = useState('');

  useEffect(() => {
    getEventFields().then(res => setCustomFields(res.data?.fields || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        start_time: event.start_time?.slice(0, 16) || '',
        end_time: event.end_time?.slice(0, 16) || '',
        event_type: event.event_type || 'meeting',
        status: event.status || 'confirmed',
        location: event.location || '',
        attendees: event.attendees || [],
        custom_fields: event.custom_fields || {},
        calendar_id: event.calendar_id || '',
      });
    } else {
      const startDate = defaultDate || new Date();
      const startTime = new Date(startDate);
      startTime.setHours(defaultHour ?? 9, 0, 0, 0);
      const endTime = addHours(startTime, 1);
      
      setFormData({
        title: '',
        description: '',
        start_time: format(startTime, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(endTime, "yyyy-MM-dd'T'HH:mm"),
        event_type: 'meeting',
        status: 'confirmed',
        location: '',
        attendees: [],
        custom_fields: {},
        calendar_id: calendars[0]?.id || '',
      });
    }
  }, [event, defaultDate, defaultHour, calendars]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString(),
    });
  };

  const handleAddAttendee = () => {
    if (attendeeInput.trim() && !formData.attendees.includes(attendeeInput.trim())) {
      setFormData({ ...formData, attendees: [...formData.attendees, attendeeInput.trim()] });
      setAttendeeInput('');
    }
  };

  const handleRemoveAttendee = (email) => {
    setFormData({ ...formData, attendees: formData.attendees.filter(a => a !== email) });
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="event-modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} data-testid="event-modal">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{event ? 'Редактировать' : 'Новое событие'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent" data-testid="close-event-modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Название события" required className="text-lg font-medium border-0 border-b border-border rounded-none px-0 focus-visible:ring-0" data-testid="event-title-input" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Тип</Label>
              <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                <SelectTrigger className="mt-1" data-testid="event-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }} />{type.label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Статус</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="mt-1" data-testid="event-status-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Календарь</Label>
            <Select value={formData.calendar_id || 'default'} onValueChange={(v) => setFormData({ ...formData, calendar_id: v === 'default' ? '' : v })}>
              <SelectTrigger className="mt-1" data-testid="event-calendar-select"><SelectValue placeholder="Выберите календарь" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-violet-500" />Основной</div>
                </SelectItem>
                {calendars.map(cal => (
                  <SelectItem key={cal.id} value={cal.id}>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cal.color }} />{cal.name}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Начало</Label>
              <Input type="datetime-local" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} required className="mt-1" data-testid="event-start-input" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Конец</Label>
              <Input type="datetime-local" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} required className="mt-1" data-testid="event-end-input" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Место</Label>
            <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Офис / Zoom / etc" className="mt-1" data-testid="event-location-input" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" />Описание</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Дополнительная информация..." rows={2} className="mt-1 resize-none" data-testid="event-description-input" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />Участники</Label>
            <div className="flex gap-2 mt-1">
              <Input value={attendeeInput} onChange={(e) => setAttendeeInput(e.target.value)} placeholder="Email" className="flex-1" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())} data-testid="event-attendee-input" />
              <Button type="button" onClick={handleAddAttendee} variant="secondary" size="sm">+</Button>
            </div>
            {formData.attendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.attendees.map(email => (
                  <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-xs">
                    {email}<button type="button" onClick={() => handleRemoveAttendee(email)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            {event && (
              <Button type="button" variant="ghost" onClick={() => onDelete(event.id)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10" data-testid="delete-event-button">
                <Trash2 className="w-4 h-4 mr-2" />Удалить
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
              <Button type="submit" className="btn-primary" data-testid="save-event-button">{event ? 'Сохранить' : 'Создать'}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
