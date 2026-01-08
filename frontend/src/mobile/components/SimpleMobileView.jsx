import { useState } from 'react';
import { Calendar, LayoutList, LayoutDashboard, Settings } from 'lucide-react';

export const SimpleMobileView = ({ onOpenDesktopVersion }) => {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <h1 className="text-lg font-bold">Axis Calendar</h1>
        <button
          onClick={onOpenDesktopVersion}
          className="text-sm px-3 py-1 border border-border rounded-lg"
        >
          Desktop версия
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4">
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Мобильная версия в разработке</h2>
          <p className="text-muted-foreground mb-6">
            Для полного функционала используйте desktop версию
          </p>
          <button
            onClick={onOpenDesktopVersion}
            className="px-6 py-3 bg-[#085C53] text-white rounded-lg hover:bg-[#074a44] transition-colors"
          >
            Открыть desktop версию
          </button>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div className="flex items-center justify-around h-16 px-2">
          {[
            { id: 'settings', icon: Settings, label: 'Настройки' },
            { id: 'calendars', icon: Calendar, label: 'Календари' },
            { id: 'events', icon: LayoutList, label: 'События' },
            { id: 'dashboard', icon: LayoutDashboard, label: 'Дашборд' },
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-[#085C53]' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
