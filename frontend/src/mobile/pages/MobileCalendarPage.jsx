import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Menu, Calendar as CalendarIcon } from 'lucide-react';
import { BottomNavigation } from '../components/BottomNavigation';
import { TwoDayGrid } from '../components/TwoDayGrid';
import { MonthView } from '../components/MonthView';
import { useAuth } from '../../lib/auth';
import { getEvents } from '../../lib/api';
import { Button } from '../../components/ui/button';

export const MobileCalendarPage = ({ 
  onOpenSidebar,
  onEventClick,
  onCreateEvent,
  eventTypes = []
}) => {
  const auth = useAuth();
  const user = auth?.user;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('two-day'); // 'two-day' or 'month'
  const [activeView, setActiveView] = useState('grid');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const res = await getEvents();
        setEvents(res.data || []);
      } catch (e) {
        console.error('Error loading events:', e);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const getEventTypeColor = (event) => {
    const eventType = eventTypes.find(et => et.name === event.event_type);
    return eventType?.color || '#085C53';
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    if (view === 'grid') {
      // Return to calendar grid
      setActiveView('grid');
    } else {
      // Open sidebar view
      onOpenSidebar(view);
    }
  };

  const handleDaySelect = (day) => {
    setCurrentDate(day);
    setViewMode('two-day');
  };

  const handleCreateEvent = (day, hour) => {
    const newEventDate = new Date(day);
    newEventDate.setHours(hour || 9, 0, 0, 0);
    onCreateEvent(newEventDate);
  };

  const showGridButton = activeView !== 'grid';

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <div>
          <h1 className="text-lg font-bold">Axis Calendar</h1>
          <p className="text-xs text-muted-foreground">
            {format(currentDate, 'd MMMM yyyy', { locale: ru })}
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'two-day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('two-day')}
            className="text-xs"
          >
            2 дня
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('month')}
            className="text-xs"
          >
            Месяц
          </Button>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-hidden">
        {viewMode === 'two-day' ? (
          <TwoDayGrid 
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            events={events}
            onEventClick={onEventClick}
            onCreateEvent={handleCreateEvent}
            getEventTypeColor={getEventTypeColor}
          />
        ) : (
          <MonthView 
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onDaySelect={handleDaySelect}
            selectedDate={currentDate}
            events={events}
            getEventTypeColor={getEventTypeColor}
          />
        )}
      </main>

      {/* Bottom navigation */}
      <BottomNavigation 
        activeView={activeView}
        onViewChange={handleViewChange}
        showGridButton={showGridButton}
      />
    </div>
  );
};
