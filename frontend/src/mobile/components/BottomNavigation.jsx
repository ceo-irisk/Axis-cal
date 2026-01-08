import { Calendar, LayoutList, LayoutDashboard, Settings, CalendarDays } from 'lucide-react';

export const BottomNavigation = ({ activeView, onViewChange, showGridButton }) => {
  // Buttons in reverse order: Settings → Calendars → Events → Dashboard (→ Grid if needed)
  const navItems = [
    { id: 'settings', icon: Settings, label: 'Настройки' },
    { id: 'calendars', icon: Calendar, label: 'Календари' },
    { id: 'events', icon: LayoutList, label: 'События' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Дашборд' },
  ];

  // Add Grid button when viewing sidebar content
  if (showGridButton) {
    navItems.push({ id: 'grid', icon: CalendarDays, label: 'Сетка' });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive 
                  ? 'text-[#085C53]' 
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
