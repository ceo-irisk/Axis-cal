import { useState, useEffect } from 'react';
import { format, parseISO, addHours } from 'date-fns';
import { X, Trash2, Calendar, Clock, MapPin, Users, FileText, Tag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { getEventFields } from '../lib/api';

const EVENT_TYPES = [
  { value: 'meeting', label: 'Встреча', color: 'bg-violet-500' },
  { value: 'call', label: 'Звонок', color: 'bg-cyan-500' },
  { value: 'personal', label: 'Личное', color: 'bg-amber-500' },
  { value: 'urgent', label: 'Срочно', color: 'bg-red-500' },
  { value: 'travel', label: 'Поездка', color: 'bg-emerald-500' },
  { value: 'deep_work', label: 'Глубокая работа', color: 'bg-indigo-500' },
];

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Подтверждено' },
  { value: 'tentative', label: 'Предварительно' },
  { value: 'cancelled', label: 'Отменено' },
];

export const EventModal = ({ event, defaultDate, onSave, onDelete, onClose }) => {
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
  });
  const [attendeeInput, setAttendeeInput] = useState('');

  useEffect(() => {
    // Fetch custom fields
    getEventFields().then(res => {
      setCustomFields(res.data?.fields || []);
    }).catch(console.error);
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
      });
    } else {
      const startDate = defaultDate || new Date();
      const startTime = new Date(startDate);
      startTime.setHours(9, 0, 0, 0);
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
      });
    }
  }, [event, defaultDate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const eventData = {
      ...formData,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString(),
    };
    
    onSave(eventData);
  };

  const handleAddAttendee = () => {
    if (attendeeInput.trim() && !formData.attendees.includes(attendeeInput.trim())) {
      setFormData({
        ...formData,
        attendees: [...formData.attendees, attendeeInput.trim()]
      });
      setAttendeeInput('');
    }
  };

  const handleRemoveAttendee = (email) => {
    setFormData({
      ...formData,
      attendees: formData.attendees.filter(a => a !== email)
    });
  };

  const updateCustomField = (fieldName, value) => {
    setFormData({
      ...formData,
      custom_fields: { ...formData.custom_fields, [fieldName]: value }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="event-modal-overlay">
      <div 
        className="modal-content max-w-lg"
        onClick={(e) => e.stopPropagation()}
        data-testid="event-modal"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {event ? 'Редактировать событие' : 'Новое событие'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            data-testid="close-event-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm text-secondary-text">
              Название
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Название события"
              required
              className="mt-1.5 bg-white/5 border-white/10 rounded-xl"
              data-testid="event-title-input"
            />
          </div>

          {/* Event Type & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-secondary-text">Тип</Label>
              <Select 
                value={formData.event_type} 
                onValueChange={(v) => setFormData({ ...formData, event_type: v })}
              >
                <SelectTrigger className="mt-1.5 bg-white/5 border-white/10 rounded-xl" data-testid="event-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-secondary-text">Статус</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger className="mt-1.5 bg-white/5 border-white/10 rounded-xl" data-testid="event-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time" className="text-sm text-secondary-text flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Начало
              </Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
                className="mt-1.5 bg-white/5 border-white/10 rounded-xl"
                data-testid="event-start-input"
              />
            </div>
            <div>
              <Label htmlFor="end_time" className="text-sm text-secondary-text flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Конец
              </Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
                className="mt-1.5 bg-white/5 border-white/10 rounded-xl"
                data-testid="event-end-input"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location" className="text-sm text-secondary-text flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Место
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Офис / Zoom / etc"
              className="mt-1.5 bg-white/5 border-white/10 rounded-xl"
              data-testid="event-location-input"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm text-secondary-text flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Описание
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Дополнительная информация..."
              rows={3}
              className="mt-1.5 bg-white/5 border-white/10 rounded-xl resize-none"
              data-testid="event-description-input"
            />
          </div>

          {/* Attendees */}
          <div>
            <Label className="text-sm text-secondary-text flex items-center gap-1">
              <Users className="w-3 h-3" />
              Участники
            </Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                placeholder="Email участника"
                className="bg-white/5 border-white/10 rounded-xl"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
                data-testid="event-attendee-input"
              />
              <Button 
                type="button" 
                onClick={handleAddAttendee}
                className="btn-secondary"
              >
                Добавить
              </Button>
            </div>
            {formData.attendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.attendees.map(email => (
                  <span 
                    key={email} 
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-sm"
                  >
                    {email}
                    <button 
                      type="button"
                      onClick={() => handleRemoveAttendee(email)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-sm font-medium text-secondary-text flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Дополнительные поля
              </h3>
              {customFields.map(field => (
                <div key={field.name}>
                  <Label className="text-sm text-secondary-text">
                    {field.name} {field.required && <span className="text-red-400">*</span>}
                  </Label>
                  {field.field_type === 'text' && (
                    <Input
                      value={formData.custom_fields[field.name] || ''}
                      onChange={(e) => updateCustomField(field.name, e.target.value)}
                      required={field.required}
                      className="mt-1.5 bg-white/5 border-white/10 rounded-xl"
                    />
                  )}
                  {field.field_type === 'number' && (
                    <Input
                      type="number"
                      value={formData.custom_fields[field.name] || ''}
                      onChange={(e) => updateCustomField(field.name, e.target.value)}
                      required={field.required}
                      className="mt-1.5 bg-white/5 border-white/10 rounded-xl"
                    />
                  )}
                  {field.field_type === 'checkbox' && (
                    <label className="flex items-center gap-2 mt-1.5">
                      <input
                        type="checkbox"
                        checked={formData.custom_fields[field.name] || false}
                        onChange={(e) => updateCustomField(field.name, e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Да</span>
                    </label>
                  )}
                  {field.field_type === 'select' && field.options && (
                    <Select 
                      value={formData.custom_fields[field.name] || ''} 
                      onValueChange={(v) => updateCustomField(field.name, v)}
                    >
                      <SelectTrigger className="mt-1.5 bg-white/5 border-white/10 rounded-xl">
                        <SelectValue placeholder="Выберите..." />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {event && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(event.id)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                data-testid="delete-event-button"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="ghost" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" className="btn-primary" data-testid="save-event-button">
                {event ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
