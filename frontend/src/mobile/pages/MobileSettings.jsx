import { Settings as SettingsIcon, Users, BookTemplate, Book, AlertCircle, FileText, User } from 'lucide-react';

export const MobileSettings = ({ onNavigate, isAdmin }) => {
  const settingsItems = [
    { id: 'templates', icon: BookTemplate, label: 'Шаблоны дней', color: '#6366f1' },
    { id: 'dictionaries', icon: Book, label: 'Справочники', color: '#f59e0b' },
    { id: 'day_rules', icon: AlertCircle, label: 'Правила дня', color: '#ef4444' },
    { id: 'surveys', icon: FileText, label: 'Опросы', color: '#10b981' },
    { id: 'reports', icon: FileText, label: 'Отчеты', color: '#8b5cf6' },
    { id: 'profile', icon: User, label: 'Профиль', color: '#06b6d4' },
  ];

  if (isAdmin) {
    settingsItems.unshift({
      id: 'users',
      icon: Users,
      label: 'Пользователи',
      color: '#ec4899',
    });
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-4">Настройки</h2>
      </div>

      <div className="space-y-2">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-accent/50 hover:bg-accent transition-colors text-left"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${item.color}20` }}
              >
                <Icon className="w-6 h-6" style={{ color: item.color }} />
              </div>
              <div>
                <p className="font-medium">{item.label}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
