import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { 
  getTemplates, 
  createTemplate, 
  deleteTemplate, 
  applyTemplate 
} from '../lib/api';
import SettingsSidebar from '../components/SettingsSidebar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Plus, Trash2, Play, Calendar, Clock, FileText, Copy, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';

const EVENT_TYPES = [
  { value: 'meeting', label: 'Встреча', color: 'bg-violet-500' },
  { value: 'call', label: 'Звонок', color: 'bg-cyan-500' },
  { value: 'personal', label: 'Личное', color: 'bg-amber-500' },
  { value: 'urgent', label: 'Срочно', color: 'bg-red-500' },
  { value: 'travel', label: 'Поездка', color: 'bg-emerald-500' },
  { value: 'deep_work', label: 'Глубокая работа', color: 'bg-indigo-500' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Понедельник' },
  { value: 1, label: 'Вторник' },
  { value: 2, label: 'Среда' },
  { value: 3, label: 'Четверг' },
  { value: 4, label: 'Пятница' },
  { value: 5, label: 'Суббота' },
  { value: 6, label: 'Воскресенье' },
];

export default function TemplatesPage() {
  const { canManage } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [applyDate, setApplyDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await getTemplates();
      setTemplates(res.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (templateData) => {
    try {
      await createTemplate(templateData);
      toast.success('Шаблон создан');
      setShowModal(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Ошибка создания шаблона');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Удалить шаблон?')) return;
    try {
      await deleteTemplate(templateId);
      toast.success('Шаблон удалён');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Ошибка удаления шаблона');
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !applyDate) return;
    try {
      const result = await applyTemplate(selectedTemplate.id, applyDate);
      toast.success(`Создано ${result.data.created_events.length} событий`);
      setShowApplyModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Ошибка применения шаблона');
    }
  };

  const openApplyModal = (template) => {
    setSelectedTemplate(template);
    setShowApplyModal(true);
  };

  return (
    <div className="flex min-h-screen bg-background" data-testid="templates-page">
      <Sidebar />
      
      <main className="main-content flex-1" style={{ marginRight: 0 }}>
        <div className="max-w-5xl mx-auto">
          <header className="mb-8">
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
              data-testid="back-button"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Назад к календарю</span>
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Шаблоны</h1>
                <p className="text-muted-foreground mt-1">
                  Создавайте шаблоны для типичных дней и недель
                </p>
              </div>
              {canManage() && (
                <Button 
                  onClick={() => setShowModal(true)} 
                  className="btn-primary"
                  data-testid="create-template-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Новый шаблон
                </Button>
              )}
            </div>
          </header>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="card-glass text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-secondary-text" />
              <h2 className="text-lg font-medium mb-2">Нет шаблонов</h2>
              <p className="text-secondary-text mb-4">
                Создайте первый шаблон для быстрого заполнения календаря
              </p>
              {canManage() && (
                <Button onClick={() => setShowModal(true)} className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Создать шаблон
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <div 
                  key={template.id} 
                  className="card-glass p-6"
                  data-testid={`template-${template.id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-lg">{template.name}</h3>
                      <p className="text-sm text-secondary-text">
                        {template.template_type === 'day' ? 'Шаблон дня' : 'Шаблон недели'}
                      </p>
                    </div>
                    <span className="badge badge-meeting">
                      {template.events?.length || 0} событий
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {(template.events || []).slice(0, 3).map((event, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-secondary-text">
                        <Clock className="w-3 h-3" />
                        <span className="font-mono">
                          {String(event.start_hour || 0).padStart(2, '0')}:
                          {String(event.start_minute || 0).padStart(2, '0')}
                        </span>
                        <span className="truncate">{event.title}</span>
                      </div>
                    ))}
                    {(template.events?.length || 0) > 3 && (
                      <p className="text-xs text-secondary-text">
                        +{template.events.length - 3} ещё
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => openApplyModal(template)}
                      className="flex-1 btn-secondary"
                      data-testid={`apply-template-${template.id}`}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Применить
                    </Button>
                    {canManage() && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTemplate(template.id)}
                        data-testid={`delete-template-${template.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Template Modal */}
      <TemplateModal 
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleCreateTemplate}
      />

      {/* Apply Template Modal */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent className="glass-heavy border-white/10" data-testid="apply-template-modal">
          <DialogHeader>
            <DialogTitle>Применить шаблон</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-secondary-text">
              Выберите дату, начиная с которой будут созданы события из шаблона "{selectedTemplate?.name}"
            </p>
            <div>
              <Label>Дата начала</Label>
              <Input
                type="date"
                value={applyDate}
                onChange={(e) => setApplyDate(e.target.value)}
                className="mt-1.5 bg-white/5 border-white/10"
                data-testid="apply-date-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowApplyModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleApplyTemplate} className="btn-primary" data-testid="confirm-apply-button">
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateModal({ open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    template_type: 'day',
    events: [],
  });

  const addEvent = () => {
    setFormData({
      ...formData,
      events: [
        ...formData.events,
        {
          title: '',
          start_hour: 9,
          start_minute: 0,
          end_hour: 10,
          end_minute: 0,
          event_type: 'meeting',
          day_of_week: 0,
        }
      ]
    });
  };

  const updateEvent = (index, field, value) => {
    const updated = [...formData.events];
    updated[index][field] = value;
    setFormData({ ...formData, events: updated });
  };

  const removeEvent = (index) => {
    setFormData({
      ...formData,
      events: formData.events.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.events.length === 0) {
      toast.error('Добавьте хотя бы одно событие');
      return;
    }
    onSave(formData);
    setFormData({ name: '', template_type: 'day', events: [] });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-heavy border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="template-modal">
        <DialogHeader>
          <DialogTitle>Новый шаблон</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Название</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Рабочий день"
                required
                className="mt-1.5 bg-white/5 border-white/10"
                data-testid="template-name-input"
              />
            </div>
            <div>
              <Label>Тип шаблона</Label>
              <Select 
                value={formData.template_type} 
                onValueChange={(v) => setFormData({ ...formData, template_type: v })}
              >
                <SelectTrigger className="mt-1.5 bg-white/5 border-white/10" data-testid="template-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">День</SelectItem>
                  <SelectItem value="week">Неделя</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>События</Label>
              <Button type="button" onClick={addEvent} variant="ghost" size="sm" data-testid="add-template-event">
                <Plus className="w-4 h-4 mr-1" />
                Добавить
              </Button>
            </div>

            {formData.events.map((event, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-text">Событие {idx + 1}</span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeEvent(idx)}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>

                <Input
                  value={event.title}
                  onChange={(e) => updateEvent(idx, 'title', e.target.value)}
                  placeholder="Название события"
                  className="bg-white/5 border-white/10"
                />

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">Начало (ч)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={event.start_hour}
                      onChange={(e) => updateEvent(idx, 'start_hour', parseInt(e.target.value))}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Мин</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={event.start_minute}
                      onChange={(e) => updateEvent(idx, 'start_minute', parseInt(e.target.value))}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Конец (ч)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={event.end_hour}
                      onChange={(e) => updateEvent(idx, 'end_hour', parseInt(e.target.value))}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Мин</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={event.end_minute}
                      onChange={(e) => updateEvent(idx, 'end_minute', parseInt(e.target.value))}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Select 
                    value={event.event_type} 
                    onValueChange={(v) => updateEvent(idx, 'event_type', v)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
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

                  {formData.template_type === 'week' && (
                    <Select 
                      value={String(event.day_of_week)} 
                      onValueChange={(v) => updateEvent(idx, 'day_of_week', parseInt(v))}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(day => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}

            {formData.events.length === 0 && (
              <p className="text-center text-secondary-text py-4">
                Добавьте события для шаблона
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" className="btn-primary" data-testid="save-template-button">
              Создать шаблон
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
