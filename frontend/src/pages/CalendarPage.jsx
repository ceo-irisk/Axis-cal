import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { 
  getEvents, createEvent, updateEvent, deleteEvent, 
  getRatings, createRating, checkDayRules, getOverloadedDays, getCalendars,
  getTemplates, applyTemplate, getUsers, createUser, updateUser, deleteUser,
  getAllICSEvents, getEventTypes, getAppliedTemplates, removeTemplateFromDay,
  getUserEvents
} from '../lib/api';
import { getUserTimezone } from '../lib/timezones';
import { toast } from 'sonner';
import Sidebar from '../components/Sidebar';
import CalendarGrid from '../components/CalendarGrid';
import EventModal from '../components/EventModal';
import SurveyModal from '../components/SurveyModal';
import UsersPanel from '../components/UsersPanel';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Menu } from 'lucide-react';

// Mobile imports
import { MobileCalendarPage } from '../mobile';
import { MobileErrorBoundary } from '../mobile/components/MobileErrorBoundary';
import { useIsMobile } from '../mobile/hooks';

// Main view types
const MAIN_VIEW = {
  CALENDAR: 'calendar',
  USERS: 'users'
};

export default function CalendarPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
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
  const [selectedEventIds, setSelectedEventIds] = useState([]); // Множественное выделение
  const [copiedEvents, setCopiedEvents] = useState([]); // Для копирования/вставки
  const [showEventModal, setShowEventModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [defaultEventTime, setDefaultEventTime] = useState(null);
  const [selectedTimezone, setSelectedTimezone] = useState(() => getUserTimezone());
  const [hiddenCalendars, setHiddenCalendars] = useState(new Set());
  
  // User switching for viewing others' calendars
  const [viewingUserId, setViewingUserId] = useState(null); // null = viewing own calendar

  const handleDeleteEventById = useCallback(async (eventId) => {
    try {
      await deleteEvent(eventId);
      setShowEventModal(false);
      setSelectedEventIds(prev => prev.filter(id => id !== eventId));
      // Remove event from local state immediately
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      const errorMsg = error.response?.data?.detail || 'Ошибка удаления события';
      toast.error(errorMsg === 'Недостаточно прав' ? 'Недостаточно прав' : errorMsg);
    }
  }, []);

  // Handle pasting copied events
  const handlePasteEvents = useCallback(async () => {
    if (copiedEvents.length === 0) return;
    
    try {
      const targetDateStr = format(selectedDate, 'yyyy-MM-dd');
      const newEvents = [];
      
      for (const event of copiedEvents) {
        // Create new event based on copied event
        const newEventData = {
          title: event.title,
          description: event.description || '',
          start_time: `${targetDateStr}T${event.start_time.split('T')[1]}`,
          end_time: `${targetDateStr}T${event.end_time.split('T')[1]}`,
          calendar_id: event.calendar_id,
          event_type_id: event.event_type_id,
          timezone: selectedTimezone
        };
        
        const createdEvent = await createEvent(newEventData);
        newEvents.push(createdEvent);
      }
      
      // Update events locally
      setEvents(prev => [...prev, ...newEvents]);
      toast.success(`Вставлено событий: ${copiedEvents.length}`);
    } catch (error) {
      console.error('Error pasting events:', error);
      toast.error('Ошибка вставки событий');
    }
  }, [copiedEvents, selectedDate, selectedTimezone]);

  // Handle keyboard events for deleting selected event
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Не обрабатываем если открыто модальное окно или фокус в input/textarea
      if (showEventModal || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Delete/Backspace - удалить выделенные события
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedEventIds.length > 0) {
        e.preventDefault();
        // Удаляем все выделенные события
        for (const eventId of selectedEventIds) {
          await handleDeleteEventById(eventId);
        }
        setSelectedEventIds([]);
      }
      
      // Escape - снять выделение
      if (e.key === 'Escape') {
        setSelectedEventIds([]);
      }
      
      // Cmd+C / Ctrl+C - копировать выделенные события
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedEventIds.length > 0) {
        e.preventDefault();
        const eventsToCopy = events.filter(ev => selectedEventIds.includes(ev.id));
        setCopiedEvents(eventsToCopy);
        toast.success(`Скопировано событий: ${eventsToCopy.length}`);
      }
      
      // Cmd+V / Ctrl+V - вставить скопированные события
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && copiedEvents.length > 0) {
        e.preventDefault();
        await handlePasteEvents();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEventIds, copiedEvents, events, showEventModal, handleDeleteEventById, selectedDate, handlePasteEvents]);

  const handleEventSelect = (eventId, shiftKey = false) => {
    if (shiftKey) {
      // Shift+Click - добавить/удалить из выделения
      setSelectedEventIds(prev => {
        if (prev.includes(eventId)) {
          return prev.filter(id => id !== eventId);
        } else {
          return [...prev, eventId];
        }
      });
    } else {
      // Обычный клик - выделить только это событие
      setSelectedEventIds([eventId]);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfMonth(subMonths(currentDate, 1));
      const end = endOfMonth(addMonths(currentDate, 1));
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      // If viewing another user's calendar, load their events
      const eventsPromise = viewingUserId 
        ? getUserEvents(viewingUserId, startStr, endStr)
        : getEvents(startStr, endStr);

      const [eventsRes, icsEventsRes, ratingsRes, overloadedRes, templatesRes, eventTypesRes, appliedTemplatesRes] = await Promise.all([
        eventsPromise,
        viewingUserId ? Promise.resolve({ data: [] }) : getAllICSEvents(startStr, endStr).catch(() => ({ data: [] })),
        getRatings(startStr, endStr),
        getOverloadedDays(startStr, endStr),
        getTemplates(),
        getEventTypes(),
        getAppliedTemplates(startStr, endStr)
      ]);

      // Combine local events with ICS events (only for own calendar)
      const allEvents = viewingUserId 
        ? (eventsRes.data || [])
        : [...(eventsRes.data || []), ...(icsEventsRes.data || [])];
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
  }, [currentDate, viewingUserId]);

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
    setSelectedEventIds([]); // Снять выделение при клике мимо события
  };

  const handleCellDoubleClick = (date, hour) => {
    setSelectedDate(date);
    setDefaultEventTime(hour);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setSelectedEventIds([]);
    setShowEventModal(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setSelectedEventIds([]);
    setDefaultEventTime(null);
    setShowEventModal(true);
  };

  const handleSaveEvent = async (eventData) => {
    try {
      const dataWithTimezone = { ...eventData, timezone: selectedTimezone };
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, dataWithTimezone);
      } else {
        await createEvent(dataWithTimezone);
      }
      setShowEventModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving event:', error);
      const errorMsg = error.response?.data?.detail || 'Ошибка сохранения события';
      toast.error(errorMsg === 'Недостаточно прав' ? 'Недостаточно прав' : errorMsg);
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
      const errorMsg = error.response?.data?.detail || 'Ошибка перемещения события';
      toast.error(errorMsg === 'Недостаточно прав' ? 'Недостаточно прав' : errorMsg);
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

  // Filter events by hidden calendars (including ICS subscriptions)
  const visibleEvents = events.filter(e => {
    if (e.calendar_id && hiddenCalendars.has(e.calendar_id)) return false;
    if (e.ics_subscription_id && hiddenCalendars.has(e.ics_subscription_id)) return false;
    return true;
  });

  const getTitle = () => {
    if (mainView === MAIN_VIEW.USERS) return 'Пользователи';
    if (view === 'day') return format(selectedDate, 'd MMMM yyyy', { locale: ru });
    if (view === 'week') return `${format(selectedDate, 'd MMM', { locale: ru })} — ${format(addDays(selectedDate, 6), 'd MMM yyyy', { locale: ru })}`;
    return format(currentDate, 'LLLL yyyy', { locale: ru });
  };

  // Mobile version
  if (isMobile) {
    return (
      <MobileErrorBoundary>
        <MobileCalendarPage 
          onEventClick={handleEventClick}
          onCreateEvent={handleCreateEvent}
          eventTypes={eventTypes}
          selectedTimezone={selectedTimezone}
          rating={ratings[format(selectedDate, 'yyyy-MM-dd')]}
          violations={ruleViolations[format(selectedDate, 'yyyy-MM-dd')]}
          onRateDay={handleRateDay}
        />
        
        {/* Event Modal */}
        {showEventModal && (
          <EventModal
            event={selectedEvent}
            onClose={() => {
              setShowEventModal(false);
              setSelectedEvent(null);
            }}
            onSave={handleSaveEvent}
            onDelete={handleDeleteEventById}
            defaultTime={defaultEventTime}
            eventTypes={eventTypes}
            selectedTimezone={selectedTimezone}
          />
        )}
      </MobileErrorBoundary>
    );
  }

  // Desktop version
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
        ratings={ratings}
        violations={currentViolations}
        onRateDay={handleRateDay}
        onOpenSurvey={() => setShowSurveyModal(true)}
        onEventClick={handleEventClick}
        onCreateEvent={handleCreateEvent}
        onShowUsers={() => setMainView(MAIN_VIEW.USERS)}
        onShowCalendar={() => setMainView(MAIN_VIEW.CALENDAR)}
        mainView={mainView}
        onEventTypesChange={setEventTypes}
        onTemplatesChange={setTemplates}
        viewingUserId={viewingUserId}
        onViewingUserChange={setViewingUserId}
        onHiddenCalendarsChange={setHiddenCalendars}
        selectedTimezone={selectedTimezone}
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
                  {/* User switcher - показывать чей календарь смотрим */}
                  {viewingUserId && (
                    <button 
                      onClick={() => setViewingUserId(null)}
                      className="px-3 py-1.5 text-sm bg-accent hover:bg-accent/80 rounded-lg flex items-center gap-2"
                    >
                      <span>← Мой календарь</span>
                    </button>
                  )}
                  
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
                events={visibleEvents}
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
                selectedEventIds={selectedEventIds}
                onEventSelect={handleEventSelect}
                loading={loading}
                selectedTimezone={selectedTimezone}
                onTimezoneChange={setSelectedTimezone}
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
          selectedTimezone={selectedTimezone}
          // ✨ NEW: Pass recurring instance info
          isRecurringInstance={selectedEvent?.is_recurring_instance || false}
          recurringParentId={selectedEvent?.recurrence_parent_id || null}
          instanceDate={selectedEvent?.start_time ? selectedEvent.start_time.split('T')[0] : null}
        />
      )}

      {showSurveyModal && (
        <SurveyModal date={selectedDate} onClose={() => setShowSurveyModal(false)} onComplete={() => { setShowSurveyModal(false); }} />
      )}
    </div>
  );
}
