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
import { ArrowLeft, MapPin, Square, CheckCircle2, Zap, Video } from 'lucide-react';

export const TemplateEventForm = ({ initialData, eventTypes, templateType, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [eventType, setEventType] = useState(initialData?.event_type || 'meeting');
  const [startHour, setStartHour] = useState(initialData?.start_hour ?? 9);
  const [startMinute, setStartMinute] = useState(initialData?.start_minute ?? 0);
  const [endHour, setEndHour] = useState(initialData?.end_hour ?? 10);
  const [endMinute, setEndMinute] = useState(initialData?.end_minute ?? 0);
  const [dayOfWeek, setDayOfWeek] = useState(initialData?.day_of_week ?? 0);
  const [location, setLocation] = useState(initialData?.location || '');
  const [isBlocked, setIsBlocked] = useState(initialData?.is_blocked || false);
  const [isCompleted, setIsCompleted] = useState(initialData?.is_completed || false);
  const [isUrgent, setIsUrgent] = useState(initialData?.is_urgent || false);
  const [isVideoCall, setIsVideoCall] = useState(initialData?.is_video_call || false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description,
      event_type: eventType,
      start_hour: parseInt(startHour),
      start_minute: parseInt(startMinute),
      end_hour: parseInt(endHour),
      end_minute: parseInt(endMinute),
      day_of_week: parseInt(dayOfWeek),
      location,
      is_blocked: isBlocked,
      is_completed: isCompleted,
      is_urgent: isUrgent,
      is_video_call: isVideoCall
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-accent">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-medium">{initialData ? 'Редактировать событие' : 'Новое событие'}</h3>
      </div>

      <div>
        <Label>Название</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Утренняя встреча" className="mt-1" />
      </div>
      
      <div>
        <Label>Описание</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание события" className="mt-1" />
      </div>

      <div>
        <Label>Тип события</Label>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {eventTypes.map(type => (
              <SelectItem key={type.name} value={type.name}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: type.color }} />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {templateType === 'week' && (
        <div>
          <Label>День недели</Label>
          <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Понедельник</SelectItem>
              <SelectItem value="1">Вторник</SelectItem>
              <SelectItem value="2">Среда</SelectItem>
              <SelectItem value="3">Четверг</SelectItem>
              <SelectItem value="4">Пятница</SelectItem>
              <SelectItem value="5">Суббота</SelectItem>
              <SelectItem value="6">Воскресенье</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Начало</Label>
          <div className="flex gap-1 mt-1">
            <Input type="number" min="0" max="23" value={startHour} onChange={(e) => setStartHour(e.target.value)} className="w-16" />
            <span className="flex items-center">:</span>
            <Input type="number" min="0" max="59" step="5" value={startMinute} onChange={(e) => setStartMinute(e.target.value)} className="w-16" />
          </div>
        </div>
        <div>
          <Label>Конец</Label>
          <div className="flex gap-1 mt-1">
            <Input type="number" min="0" max="23" value={endHour} onChange={(e) => setEndHour(e.target.value)} className="w-16" />
            <span className="flex items-center">:</span>
            <Input type="number" min="0" max="59" step="5" value={endMinute} onChange={(e) => setEndMinute(e.target.value)} className="w-16" />
          </div>
        </div>
      </div>

      <div>
        <Label className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />Место
        </Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Офис / Zoom / etc" className="mt-1" />
      </div>

      <div>
        <Label className="mb-2 block">Флаги события</Label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsBlocked(!isBlocked)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              isBlocked ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-accent hover:bg-accent/80'
            }`}
          >
            <Square className="w-3 h-3" />
            Заблокировано
          </button>
          <button
            type="button"
            onClick={() => setIsCompleted(!isCompleted)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              isCompleted ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-accent hover:bg-accent/80'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Выполнено
          </button>
          <button
            type="button"
            onClick={() => setIsUrgent(!isUrgent)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              isUrgent ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' : 'bg-accent hover:bg-accent/80'
            }`}
          >
            <Zap className="w-3 h-3" />
            Срочно
          </button>
          <button
            type="button"
            onClick={() => setIsVideoCall(!isVideoCall)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              isVideoCall ? 'bg-blue-500/20 text-blue-500 border border-blue-500/50' : 'bg-accent hover:bg-accent/80'
            }`}
          >
            <Video className="w-3 h-3" />
            Видеозвонок
          </button>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Назад</Button>
        <Button type="submit">Сохранить событие</Button>
      </DialogFooter>
    </form>
  );
};
