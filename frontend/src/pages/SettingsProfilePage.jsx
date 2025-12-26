import { useState } from 'react';
import { useAuth } from '../lib/auth';
import SettingsSidebar from '../components/SettingsSidebar';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { User, Globe, Clock } from 'lucide-react';
import { toast } from 'sonner';

const TIMEZONES = [
  { value: 'Europe/Moscow', label: 'Москва', offset: 'UTC+3' },
  { value: 'Europe/Kaliningrad', label: 'Калининград', offset: 'UTC+2' },
  { value: 'Europe/Samara', label: 'Самара', offset: 'UTC+4' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург', offset: 'UTC+5' },
  { value: 'Asia/Omsk', label: 'Омск', offset: 'UTC+6' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск', offset: 'UTC+7' },
  { value: 'Asia/Irkutsk', label: 'Иркутск', offset: 'UTC+8' },
  { value: 'Asia/Yakutsk', label: 'Якутск', offset: 'UTC+9' },
  { value: 'Asia/Vladivostok', label: 'Владивосток', offset: 'UTC+10' },
  { value: 'Asia/Magadan', label: 'Магадан', offset: 'UTC+11' },
  { value: 'Asia/Kamchatka', label: 'Камчатка', offset: 'UTC+12' },
];

export default function SettingsProfilePage() {
  const { user } = useAuth();
  const [selectedTimezone, setSelectedTimezone] = useState(user?.timezone || 'Europe/Moscow');

  const handleTimezoneChange = async (value) => {
    setSelectedTimezone(value);
    toast.success('Часовой пояс обновлён');
  };

  return (
    <div className="flex min-h-screen bg-background" data-testid="settings-profile-page">
      <SettingsSidebar />
      
      <main className="ml-[260px] flex-1 p-8">
        <div className="max-w-3xl">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Профиль</h1>
            <p className="text-muted-foreground mt-1">
              Информация о вашем аккаунте и персональные настройки
            </p>
          </header>

          <div className="space-y-6">
            {/* Profile Info */}
            <section className="card-glass p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-accent">
                  <User className="w-5 h-5" />
                </div>
                <span className="font-medium">Информация об аккаунте</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-accent/50">
                  <p className="text-sm text-muted-foreground mb-1">Имя</p>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div className="p-4 rounded-xl bg-accent/50">
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div className="p-4 rounded-xl bg-accent/50">
                  <p className="text-sm text-muted-foreground mb-1">Роль</p>
                  <p className="font-medium">
                    {user?.role === 'admin' ? 'Администратор' : 
                     user?.role === 'manager' ? 'Руководитель' : 'Помощник'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-accent/50">
                  <p className="text-sm text-muted-foreground mb-1">Статус</p>
                  <p className="font-medium text-green-500">Активен</p>
                </div>
              </div>
            </section>

            {/* Timezone */}
            <section className="card-glass p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-accent">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-medium">Часовой пояс</span>
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
          </div>
        </div>
      </main>
    </div>
  );
}
