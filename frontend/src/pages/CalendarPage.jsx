import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { 
  getEvents, createEvent, updateEvent, deleteEvent, 
  getRatings, createRating, checkDayRules, getOverloadedDays, getCalendars,
  getTemplates, applyTemplate, getUsers, createUser, updateUser, deleteUser,
  getEventsWithRecurring, getAllICSEvents, getEventTypes, getAppliedTemplates, removeTemplateFromDay
} from '../lib/api';
import { getLocalTimezoneName } from '../lib/timezones';
import Sidebar from '../components/Sidebar';
import CalendarGrid from '../components/CalendarGrid';
import EventModal from '../components/EventModal';
import SurveyModal from '../components/SurveyModal';
import UsersPanel from '../components/UsersPanel';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { Menu } from 'lucide-react';

// Main view types
const MAIN_VIEW = {
  CALENDAR: 'calendar',
  USERS: 'users'
};

export default function CalendarPage() {
  const { user } = useAuth();
  const [mainView, setMainView] = useState(MAIN_VIEW.CALENDAR);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // По умолчанию неделя
  const [events, setEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [appliedTemplates, setAppliedTemplates] = useState([]);
  const [ratings, setRatings] = useState({});
  const [overloadedDays, setOverloadedDays] = useState([]);
  const [ruleViolations, setRuleViolations] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [defaultEventTime, setDefaultEventTime] = useState(null);
  const [selectedTimezone, setSelectedTimezone] = useState(() => getLocalTimezoneName());
  const [customTimezones, setCustomTimezones] = useState([]);

  const handleDeleteEventById = useCallback(async (eventId) => {
    try {
      await deleteEvent(eventId);
      setShowEventModal(false);
      setSelectedEventId(null);
      // Remove event from local state immediately
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Ошибка удаления события');
    }
  }, []);

  // Handle keyboard events for deleting selected event
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Backspace' && selectedEventId && !showEventModal) {
        e.preventDefault();
        const eventToDelete = events.find(ev => ev.id === selectedEventId);
        if (eventToDelete) {
          // Delete without confirmation
          handleDeleteEventById(selectedEventId);
        }
      }
      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedEventId(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEventId, events, showEventModal, handleDeleteEventById]);

  const handleEventSelect = (eventId) => {
    setSelectedEventId(eventId === selectedEventId ? null : eventId);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfMonth(subMonths(currentDate, 1));
      const end = endOfMonth(addMonths(currentDate, 1));
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const [eventsRes, icsEventsRes, ratingsRes, overloadedRes, templatesRes, eventTypesRes, appliedTemplatesRes] = await Promise.all([
        getEventsWithRecurring(startStr, endStr),
        getAllICSEvents(startStr, endStr).catch(() => ({ data: [] })),
        getRatings(startStr, endStr),
        getOverloadedDays(startStr, endStr),
        getTemplates(),
        getEventTypes(),
        getAppliedTemplates(startStr, endStr)
      ]);

      // Combine local events with ICS events
      const allEvents = [...(eventsRes.data || []), ...(icsEventsRes.data || [])];
      setEvents(allEvents);
      
      const ratingsMap = {};
      (ratingsRes.data || []).forEach(r => { ratingsMap[r.date] = r; });
      setRatings(ratingsMap);
      setOverloadedDays(overloadedRes.data || []);
      setTemplates(templatesRes.data || []);
      setEventTypes(eventTypesRes.data || []);
      setAppliedTemplates(appliedTemplatesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const checkRules = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      try {
        const res = await checkDayRules(dateStr);
        setRuleViolations(prev => ({ ...prev, [dateStr]: res.data }));
      } catch (error) { console.error('Error checking rules:', error); }
    };
    checkRules();
  }, [selectedDate, events]);

  const handleNavigate = (direction) => {
    if (view === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
      setSelectedDate(direction === 'prev' ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1));
    } else {
      setSelectedDate(direction === 'prev' ? subDays(selectedDate, 1) : addDays(selectedDate, 1));
      setCurrentDate(direction === 'prev' ? subDays(selectedDate, 1) : addDays(selectedDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleCellDoubleClick = (date, hour) => {
    setSelectedDate(date);
    setDefaultEventTime(hour);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setSelectedEventId(null);
    setShowEventModal(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setSelectedEventId(null);
    setDefaultEventTime(null);
    setShowEventModal(true);
  };

  const handleSaveEvent = async (eventData) => {
    try {
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, eventData);
        toast.success('Событие обновлено');
      } else {
        await createEvent(eventData);
        toast.success('Событие создано');
      }
      setShowEventModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Ошибка сохранения события');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    await handleDeleteEventById(eventId);
    fetchData();
  };

  const handleEventUpdate = async (eventData) => {
    try {
      await updateEvent(eventData.id, eventData);
      fetchData();
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Ошибка перемещения события');
    }
  };

  const handleRateDay = async (rating, notes) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await createRating(rating, dateStr, notes);
      setRatings(prev => ({ ...prev, [dateStr]: { rating, notes, date: dateStr } }));
    } catch (error) {
      console.error('Error rating day:', error);
      toast.error('Ошибка сохранения оценки');
    }
  };

  const handleApplyTemplate = async (templateId, targetDate) => {
    try {
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      await applyTemplate(templateId, dateStr);
      fetchData();
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Ошибка применения шаблона');
    }
  };

  const handleRemoveTemplate = async (targetDate) => {
    try {
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      await removeTemplateFromDay(dateStr);
      fetchData();
    } catch (error) {
      console.error('Error removing template:', error);
      toast.error('Ошибка удаления шаблона');
    }
  };

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDateEvents = events.filter(e => e.start_time?.startsWith(selectedDateStr));
  const currentRating = ratings[selectedDateStr];
  const currentViolations = ruleViolations[selectedDateStr];

  const getTitle = () => {
    if (mainView === MAIN_VIEW.USERS) return 'Пользователи';
    if (view === 'day') return format(selectedDate, 'd MMMM yyyy', { locale: ru });
    if (view === 'week') return `${format(selectedDate, 'd MMM', { locale: ru })} — ${format(addDays(selectedDate, 6), 'd MMM yyyy', { locale: ru })}`;
    return format(currentDate, 'LLLL yyyy', { locale: ru });
  };

  return (
    <div className="flex min-h-screen bg-background" data-testid="calendar-page">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onCalendarsChange={setCalendars}
        selectedDate={selectedDate}
        onDateSelect={(date) => {
          setSelectedDate(date);
          setCurrentDate(date);
          setMainView(MAIN_VIEW.CALENDAR);
        }}
        events={selectedDateEvents}
        rating={currentRating}
        violations={currentViolations}
        onRateDay={handleRateDay}
        onOpenSurvey={() => setShowSurveyModal(true)}
        onEventClick={handleEventClick}
        onCreateEvent={handleCreateEvent}
        onShowUsers={() => setMainView(MAIN_VIEW.USERS)}
        onShowCalendar={() => setMainView(MAIN_VIEW.CALENDAR)}
        mainView={mainView}
        onCustomTimezonesChange={setCustomTimezones}
        onEventTypesChange={setEventTypes}
      />
      
      <main className="main-content-full flex-1" data-testid="calendar-main">
        <div className="max-w-full">
          {mainView === MAIN_VIEW.CALENDAR ? (
            <>
              <header className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-accent">
                    <Menu className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight capitalize">{getTitle()}</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      {format(selectedDate, 'EEEE, d MMMM', { locale: ru })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* View switcher */}
                  <div className="flex bg-accent rounded-lg p-1 mr-2">
                    {['month', 'week', 'day'].map(v => (
                      <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === v ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`} data-testid={`view-${v}`}>
                        {v === 'month' ? 'Месяц' : v === 'week' ? 'Неделя' : 'День'}
                      </button>
                    ))}
                  </div>

                  <button onClick={handleToday} className="btn-secondary text-sm" data-testid="today-button">Сегодня</button>
                  <div className="flex items-center">
                    <button onClick={() => handleNavigate('prev')} className="p-2 rounded-lg hover:bg-accent transition-colors" data-testid="prev-button">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    </button>
                    <button onClick={() => handleNavigate('next')} className="p-2 rounded-lg hover:bg-accent transition-colors" data-testid="next-button">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </button>
                  </div>
                </div>
              </header>

              <CalendarGrid
                currentDate={currentDate}
                selectedDate={selectedDate}
                events={events}
                calendars={calendars}
                templates={templates}
                appliedTemplates={appliedTemplates}
                overloadedDays={overloadedDays}
                ratings={ratings}
                view={view}
                onDateClick={handleDateClick}
                onCellDoubleClick={handleCellDoubleClick}
                onEventClick={handleEventClick}
                onEventUpdate={handleEventUpdate}
                onApplyTemplate={handleApplyTemplate}
                onRemoveTemplate={handleRemoveTemplate}
                onEventDelete={handleDeleteEvent}
                selectedEventId={selectedEventId}
                onEventSelect={handleEventSelect}
                loading={loading}
                selectedTimezone={selectedTimezone}
                onTimezoneChange={setSelectedTimezone}
                customTimezones={customTimezones}
                eventTypes={eventTypes}
              />
            </>
          ) : mainView === MAIN_VIEW.USERS ? (
            <UsersPanel />
          ) : null}
        </div>
      </main>

      {showEventModal && (
        <EventModal
          event={selectedEvent}
          defaultDate={selectedDate}
          defaultHour={defaultEventTime}
          calendars={calendars}
          eventTypes={eventTypes}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          onClose={() => setShowEventModal(false)}
        />
      )}

      {showSurveyModal && (
        <SurveyModal date={selectedDate} onClose={() => setShowSurveyModal(false)} onComplete={() => { setShowSurveyModal(false); }} />
      )}
    </div>
  );
}
