import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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

  // Load calendars
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
    const newEventDate = new Date(day);
    if (hour !== undefined) {
      newEventDate.setHours(hour, 0, 0, 0);
    }
    onCreateEvent(newEventDate);
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

  // Filter events for selected date
  const selectedDateEvents = events.filter(event => {
    const eventDate = new Date(event.start_time);
    return (
      eventDate.getDate() === currentDate.getDate() &&
      eventDate.getMonth() === currentDate.getMonth() &&
      eventDate.getFullYear() === currentDate.getFullYear()
    );
  });

  const showGridButton = activeView !== 'grid';

  return (
    <div className=\"h-screen flex flex-col bg-background relative overflow-hidden\">
      {/* Main Calendar View */}
      <div className={`flex-1 flex flex-col transition-transform duration-300 ${\n        showModal ? '-translate-y-full' : 'translate-y-0'\n      }`}>\n        {/* Top header */}\n        <header className=\"flex items-center justify-between px-4 py-3 border-b border-border bg-background\">\n          <div>\n            <h1 className=\"text-lg font-bold\">Axis Calendar</h1>\n          </div>\n\n          {/* View mode toggle */}\n          <div className=\"flex items-center gap-2\">\n            <Button\n              variant={viewMode === 'two-day' ? 'default' : 'outline'}\n              size=\"sm\"\n              onClick={() => setViewMode('two-day')}\n              className=\"text-xs h-8\"\n            >\n              2 дня\n            </Button>\n            <Button\n              variant={viewMode === 'month' ? 'default' : 'outline'}\n              size=\"sm\"\n              onClick={() => setViewMode('month')}\n              className=\"text-xs h-8\"\n            >\n              Месяц\n            </Button>\n          </div>\n        </header>\n\n        {/* Main content area */}\n        <main className=\"flex-1 overflow-hidden\">\n          {viewMode === 'two-day' ? (\n            <TwoDayGrid \n              currentDate={currentDate}\n              onDateChange={setCurrentDate}\n              events={events}\n              onEventClick={onEventClick}\n              onCreateEvent={handleCreateEvent}\n              getEventTypeColor={getEventTypeColor}\n            />\n          ) : (\n            <MonthView \n              currentMonth={currentMonth}\n              onMonthChange={setCurrentMonth}\n              onDaySelect={handleDaySelect}\n              selectedDate={currentDate}\n              events={events}\n              getEventTypeColor={getEventTypeColor}\n            />\n          )}\n        </main>\n      </div>\n\n      {/* Modal Pages - Slide from bottom */}\n      <div className={`absolute inset-0 bg-background transition-transform duration-300 ease-out ${\n        showModal ? 'translate-y-0' : 'translate-y-full'\n      }`}>\n        <div className=\"h-full flex flex-col\">\n          {/* Modal Header */}\n          <div className=\"flex items-center justify-between px-4 py-3 border-b border-border bg-background\">\n            <h2 className=\"text-lg font-semibold\">\n              {activeView === 'dashboard' && 'Дашборд'}\n              {activeView === 'events' && 'События'}\n              {activeView === 'calendars' && 'Календари'}\n              {activeView === 'settings' && 'Настройки'}\n            </h2>\n            <button \n              onClick={() => handleViewChange('grid')}\n              className=\"p-2 rounded-lg hover:bg-accent\"\n            >\n              <X className=\"w-5 h-5\" />\n            </button>\n          </div>\n\n          {/* Modal Content */}\n          <div className=\"flex-1 overflow-auto pb-20\">\n            {activeView === 'dashboard' && (\n              <MobileDashboard\n                selectedDate={currentDate}\n                rating={rating}\n                violations={violations}\n                onRateDay={onRateDay}\n              />\n            )}\n            {activeView === 'events' && (\n              <MobileEvents\n                selectedDate={currentDate}\n                events={selectedDateEvents}\n                onEventClick={onEventClick}\n                getEventTypeColor={getEventTypeColor}\n              />\n            )}\n            {activeView === 'calendars' && (\n              <MobileCalendars\n                calendars={calendars}\n                hiddenCalendars={hiddenCalendars}\n                onToggleCalendar={handleToggleCalendar}\n              />\n            )}\n            {activeView === 'settings' && (\n              <MobileSettings\n                isAdmin={isAdmin}\n                onNavigate={(settingId) => {\n                  // TODO: Navigate to specific settings page\n                  console.log('Navigate to:', settingId);\n                }}\n              />\n            )}\n          </div>\n        </div>\n      </div>\n\n      {/* Bottom navigation */}\n      <BottomNavigation \n        activeView={activeView}\n        onViewChange={handleViewChange}\n        showGridButton={showGridButton}\n      />\n    </div>\n  );\n};\n