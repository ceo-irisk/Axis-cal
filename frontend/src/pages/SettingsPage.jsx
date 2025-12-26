import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getCalendars, addCalendar, deleteCalendar } from '../lib/api';
import Sidebar from '../components/Sidebar';
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
import { Settings, Calendar, Plus, Trash2, Globe, Clock, RefreshCw, Link2, ArrowLeft } from 'lucide-react';
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
  { value: '#ec4899', label: 'Розовый' },
  { value: '#14b8a6', label: 'Бирюзовый' },
];

const TIMEZONES = [
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)', offset: '+03:00' },
  { value: 'Europe/London', label: 'Лондон (UTC+0)', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Париж (UTC+1)', offset: '+01:00' },
  { value: 'Europe/Berlin', label: 'Берлин (UTC+1)', offset: '+01:00' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC-5)', offset: '-05:00' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC-8)', offset: '-08:00' },
  { value: 'Asia/Tokyo', label: 'Токио (UTC+9)', offset: '+09:00' },
  { value: 'Asia/Shanghai', label: 'Шанхай (UTC+8)', offset: '+08:00' },
  { value: 'Asia/Dubai', label: 'Дубай (UTC+4)', offset: '+04:00' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(user?.timezone || 'Europe/Moscow');

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

  const handleAddCalendar = async (calendarData) => {
    try {
      await addCalendar(
        calendarData.name,
        calendarData.provider,
        calendarData.color,
        calendarData.pattern
      );
      toast.success('Календарь добавлен');
      setShowAddModal(false);
      fetchCalendars();
    } catch (error) {
      console.error('Error adding calendar:', error);
      toast.error('Ошибка добавления календаря');
    }
  };

  const handleDeleteCalendar = async (calendarId) => {
    if (!confirm('Удалить календарь?')) return;
    try {
      await deleteCalendar(calendarId);
      toast.success('Календарь удалён');
      fetchCalendars();
    } catch (error) {
      console.error('Error deleting calendar:', error);
      toast.error('Ошибка удаления');
    }
  };

  const handleTimezoneChange = (tz) => {
    setSelectedTimezone(tz);
    toast.success('Часовой пояс сохранён');
  };

  return (
    <div className="flex min-h-screen bg-background" data-testid="settings-page">
      <Sidebar />
      
      <main className="main-content flex-1" style={{ marginRight: 0 }}>
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
              data-testid="back-button"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Назад к календарю</span>
            </button>
            <h1 className="text-3xl font-semibold tracking-tight">Настройки</h1>
            <p className="text-muted-foreground mt-1">
              Управление внешними календарями и персональными настройками
            </p>
          </header>

          <div className="space-y-8">
            {/* Timezone Section */}
            <section className="card-glass p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-accent">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-medium">Часовой пояс</h2>
                  <p className="text-sm text-muted-foreground">
                    Все события будут отображаться в выбранном часовом поясе
                  </p>
                </div>
              </div>

              <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger className="w-full md:w-80" data-testid="timezone-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{tz.label}</span>
                        <span className="text-muted-foreground font-mono text-xs">{tz.offset}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            {/* Calendars Section */}
            <section className="card-glass p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-medium">Внешние календари</h2>
                    <p className="text-sm text-muted-foreground">
                      Подключите календари из Google, Яндекс, Apple или Битрикс24
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowAddModal(true)} 
                  className="btn-secondary"
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
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>Нет подключённых внешних календарей</p>
                  <p className="text-sm mt-1">Добавьте календарь Google, Яндекс или Apple для синхронизации</p>
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

            {/* Profile Section */}
            <section className="card-glass p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-white/5">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-medium">Профиль</h2>
                  <p className="text-sm text-secondary-text">
                    Информация о вашем аккаунте
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm text-secondary-text mb-1">Имя</p>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm text-secondary-text mb-1">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm text-secondary-text mb-1">Роль</p>
                  <p className="font-medium">
                    {user?.role === 'admin' ? 'Администратор' : 
                     user?.role === 'manager' ? 'Руководитель' : 'Помощник'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm text-secondary-text mb-1">Часовой пояс</p>
                  <p className="font-medium">{selectedTimezone}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Add Calendar Modal */}
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
      <DialogContent className="glass-heavy border-white/10 max-w-md" data-testid="add-calendar-modal">
        <DialogHeader>
          <DialogTitle>Добавить календарь</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Название</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Рабочий календарь"
              required
              className="mt-1.5 bg-white/5 border-white/10"
              data-testid="calendar-name-input"
            />
          </div>

          <div>
            <Label>Провайдер</Label>
            <Select 
              value={formData.provider} 
              onValueChange={(v) => setFormData({ ...formData, provider: v })}
            >
              <SelectTrigger className="mt-1.5 bg-white/5 border-white/10" data-testid="calendar-provider-select">
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
                    formData.color === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : ''
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
              Добавить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
