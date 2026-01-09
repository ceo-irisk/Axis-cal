import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { X } from 'lucide-react';
import { BottomNavigation } from '../components/BottomNavigation';
import { TwoDayGrid } from '../components/TwoDayGrid';
import { MonthView } from '../components/MonthView';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../lib/auth';
import { getEvents } from '../../lib/api';
import { Button } from '../../components/ui/button';

export const MobileCalendarPage = ({ 
  onEventClick,
  onCreateEvent,
  eventTypes = [],
  onEventTypesChange,
  onTemplatesChange,
  selectedTimezone,
  onCalendarsChange,
  onHiddenCalendarsChange
}) => {
  const auth = useAuth();
  const user = auth?.user;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('two-day');
  const [activeView, setActiveView] = useState('grid');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarView, setSidebarView] = useState('dashboard');

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
    if (view === 'grid') {
      setActiveView('grid');
      setShowSidebar(false);
    } else {
      setActiveView(view);
      setSidebarView(view);
      setShowSidebar(true);
    }
  };

  const handleDaySelect = (day) => {
    setCurrentDate(day);
    setViewMode('two-day');
  };

  const handleCreateEvent = (day, hour) => {
    const newEventDate = new Date(day);
    if (hour !== undefined) {
      newEventDate.setHours(hour, 0, 0, 0);
    }
    onCreateEvent(newEventDate);
  };

  const showGridButton = activeView !== 'grid';

  // Map activeView to Sidebar tabs
  const getSidebarTab = () => {
    if (activeView === 'dashboard') return 'dashboard';
    if (activeView === 'events') return 'events';
    if (activeView === 'calendars') return 'calendars';
    if (activeView === 'settings') return 'settings';
    return 'dashboard';
  };

  return (
    <div className="h-screen flex flex-col bg-background relative">
      {/* Main Calendar View */}
      {activeView === 'grid' && (
        <>
          {/* Top header */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
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
                className="text-xs h-8"
              >
                2 дня
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="text-xs h-8"
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
        </>
      )}

      {/* Sidebar Modal for other views */}
      {showSidebar && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          {/* Mobile Sidebar Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-lg font-semibold">
              {activeView === 'dashboard' && 'Дашборд'}
              {activeView === 'events' && 'События'}
              {activeView === 'calendars' && 'Календари'}
              {activeView === 'settings' && 'Настройки'}
            </h2>
            <button 
              onClick={() => handleViewChange('grid')}
              className="p-2 rounded-lg hover:bg-accent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-auto">
            <Sidebar 
              isOpen={true}
              onClose={() => setShowSidebar(false)}
              selectedDate={currentDate}
              onDateSelect={setCurrentDate}
              events={events}
              onEventClick={onEventClick}
              onCreateEvent={onCreateEvent}
              mainView="calendar"
              onEventTypesChange={onEventTypesChange}
              onTemplatesChange={onTemplatesChange}
              selectedTimezone={selectedTimezone}
              onCalendarsChange={onCalendarsChange}
              onHiddenCalendarsChange={onHiddenCalendarsChange}
            />
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <BottomNavigation 
        activeView={activeView}
        onViewChange={handleViewChange}
        showGridButton={showGridButton}
      />
    </div>
  );
};
