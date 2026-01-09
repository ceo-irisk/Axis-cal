import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { BottomNavigation } from '../components/BottomNavigation';
import { TwoDayGrid } from '../components/TwoDayGrid';
import { MonthView } from '../components/MonthView';
import { MobileDashboard } from './MobileDashboard';
import { MobileEvents } from './MobileEvents';
import { MobileCalendars } from './MobileCalendars';
import { MobileSettings } from './MobileSettings';
import { useAuth } from '../../lib/auth';
import { getEvents, getCalendars } from '../../lib/api';
import { Button } from '../../components/ui/button';

export const MobileCalendarPage = ({ 
  onEventClick,
  onCreateEvent,
  eventTypes = [],
  selectedTimezone,
  rating,
  violations,
  onRateDay
}) => {
  const auth = useAuth();
  const { isAdmin } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('two-day');
  const [activeView, setActiveView] = useState('grid');
  const [events, setEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [hiddenCalendars, setHiddenCalendars] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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

  useEffect(() => {
    const loadCalendars = async () => {
      try {
        const res = await getCalendars();
        setCalendars(res.data || []);
      } catch (e) {
        console.error('Error loading calendars:', e);
      }
    };
    loadCalendars();
  }, []);

  const getEventTypeColor = (event) => {
    const eventType = eventTypes.find(et => et.name === event.event_type);
    return eventType?.color || '#085C53';
  };

  const handleViewChange = (view) => {
    if (view === 'grid') {
      setActiveView('grid');
      setShowModal(false);
    } else {
      setActiveView(view);
      setShowModal(true);
    }
  };

  const handleDaySelect = (day) => {
    setCurrentDate(day);
    setViewMode('two-day');
  };

  const handleCreateEvent = (day, hour) => {
    try {
      const newEventDate = new Date(day);
      if (hour !== undefined) {
        newEventDate.setHours(hour, 0, 0, 0);
      }
      onCreateEvent(newEventDate);
    } catch (e) {
      console.error('Create event error:', e);
    }
  };

  const handleToggleCalendar = (calId) => {
    setHiddenCalendars(prev => {
      const newSet = new Set(prev);
      if (newSet.has(calId)) {
        newSet.delete(calId);
      } else {
        newSet.add(calId);
      }
      return newSet;
    });
  };

  const selectedDateEvents = events.filter(event => {
    try {
      const eventDate = new Date(event.start_time);
      return (
        eventDate.getDate() === currentDate.getDate() &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    } catch (e) {
      return false;
    }
  });

  const showGridButton = activeView !== 'grid';
  const modalClass = showModal ? 'translate-y-0' : 'translate-y-full';
  const calendarClass = showModal ? '-translate-y-full' : 'translate-y-0';

  return (
    <div className="h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Main Calendar View */}
      <div className={`flex-1 flex flex-col transition-transform duration-300 ${calendarClass}`}>
        {/* Top header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
          <div>
            <h1 className="text-lg font-bold">Axis Calendar</h1>
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
      </div>

      {/* Modal Pages - Slide from bottom */}
      <div className={`absolute inset-0 bg-background transition-transform duration-300 ease-out ${modalClass}`}>
        <div className="h-full flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
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

          {/* Modal Content */}
          <div className="flex-1 overflow-auto pb-20">
            {activeView === 'dashboard' && (
              <MobileDashboard
                selectedDate={currentDate}
                rating={rating}
                violations={violations}
                onRateDay={onRateDay}
              />
            )}
            {activeView === 'events' && (
              <MobileEvents
                selectedDate={currentDate}
                events={selectedDateEvents}
                onEventClick={onEventClick}
                getEventTypeColor={getEventTypeColor}
              />
            )}
            {activeView === 'calendars' && (
              <MobileCalendars
                calendars={calendars}
                hiddenCalendars={hiddenCalendars}
                onToggleCalendar={handleToggleCalendar}
              />
            )}
            {activeView === 'settings' && (
              <MobileSettings
                isAdmin={isAdmin}
                onNavigate={(settingId) => {
                  console.log('Navigate to:', settingId);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <BottomNavigation 
        activeView={activeView}
        onViewChange={handleViewChange}
        showGridButton={showGridButton}
      />
    </div>
  );
};
