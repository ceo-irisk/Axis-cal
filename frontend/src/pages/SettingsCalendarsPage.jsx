import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { getCalendars, addCalendar, deleteCalendar } from '../lib/api';
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
import { Calendar, Plus, Trash2, Link2 } from 'lucide-react';
import { toast } from 'sonner';

const CALENDAR_PROVIDERS = [
  { value: 'google', label: 'Google Calendar', icon: '🔵' },
  { value: 'yandex', label: 'Яндекс Календарь', icon: '🔴' },
  { value: 'apple', label: 'Apple Calendar', icon: '⚪' },
  { value: 'bitrix24', label: 'Битрикс24', icon: '🟢' },
];

const CALENDAR_COLORS = [
  { value: '#8b5cf6', label: 'Фиолетовый' },
  { value: '#06b6d4', label: 'Голубой' },
  { value: '#f59e0b', label: 'Оранжевый' },
  { value: '#ef4444', label: 'Красный' },
  { value: '#10b981', label: 'Зелёный' },
  { value: '#6366f1', label: 'Индиго' },
];

export default function SettingsCalendarsPage() {
  const { user } = useAuth();
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchCalendars();
  }, []);

  const fetchCalendars = async () => {
    try {
      const res = await getCalendars();
      // Фильтруем только внешние календари (не custom)
      const externalCalendars = (res.data || []).filter(c => c.provider !== 'custom');
      setCalendars(externalCalendars);
    } catch (error) {
      console.error('Error fetching calendars:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCalendar = async (calData) => {
    try {
      await addCalendar(calData.name, calData.provider, calData.color);
      toast.success('Календарь подключён');
      setShowAddModal(false);
      fetchCalendars();
    } catch (error) {
      toast.error('Ошибка подключения');
    }
  };

  const handleDeleteCalendar = async (calId) => {
    if (!confirm('Отключить календарь?')) return;
    try {
      await deleteCalendar(calId);
      toast.success('Календарь отключён');
      fetchCalendars();
    } catch (error) {
      toast.error('Ошибка отключения');
    }
  };

  return (
    <div className="flex min-h-screen bg-background" data-testid="settings-calendars-page">
      <SettingsSidebar />
      
      <main className="ml-[260px] flex-1 p-8">
        <div className="max-w-3xl">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Внешние календари</h1>
            <p className="text-muted-foreground mt-1">
              Подключите календари из Google, Яндекс, Apple или Битрикс24
            </p>
          </header>

          <section className="card-glass p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="font-medium">Подключённые календари</span>
              </div>
              <Button 
                onClick={() => setShowAddModal(true)} 
                className="btn-primary"
                data-testid="add-calendar-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
              </div>
            ) : calendars.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Link2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Нет подключённых календарей</p>
                <p className="text-sm mt-1">Добавьте календарь Google, Яндекс или Apple для синхронизации событий</p>
              </div>
            ) : (
              <div className="space-y-3">
                {calendars.map(cal => {
                  const provider = CALENDAR_PROVIDERS.find(p => p.value === cal.provider);
                  return (
                    <div 
                      key={cal.id} 
                      className="flex items-center justify-between p-4 rounded-xl bg-accent/50"
                      data-testid={`calendar-${cal.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cal.color }}
                        />
                        <div>
                          <p className="font-medium">{cal.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <span>{provider?.icon}</span>
                            {provider?.label || cal.provider}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${cal.sync_enabled ? 'badge-confirmed' : 'badge-tentative'}`}>
                          {cal.sync_enabled ? 'Активен' : 'Отключён'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCalendar(cal.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-600 dark:text-amber-300">
                <strong>Примечание:</strong> Полная синхронизация с внешними календарями будет доступна в следующей версии. 
                Сейчас можно добавить календари для отображения.
              </p>
            </div>
          </section>
        </div>
      </main>

      <AddCalendarModal 
        open={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onSave={handleAddCalendar} 
      />
    </div>
  );
}

function AddCalendarModal({ open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    provider: 'google',
    color: '#8b5cf6',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ name: '', provider: 'google', color: '#8b5cf6' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="add-calendar-modal">
        <DialogHeader>
          <DialogTitle>Подключить внешний календарь</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Название</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Рабочий календарь"
              required
              className="mt-1.5"
              data-testid="calendar-name-input"
            />
          </div>

          <div>
            <Label>Провайдер</Label>
            <Select 
              value={formData.provider} 
              onValueChange={(v) => setFormData({ ...formData, provider: v })}
            >
              <SelectTrigger className="mt-1.5" data-testid="calendar-provider-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CALENDAR_PROVIDERS.map(provider => (
                  <SelectItem key={provider.value} value={provider.value}>
                    <div className="flex items-center gap-2">
                      <span>{provider.icon}</span>
                      {provider.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Цвет</Label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {CALENDAR_COLORS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    formData.color === color.value ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" className="btn-primary" data-testid="save-calendar-button">
              Подключить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
