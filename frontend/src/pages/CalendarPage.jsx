import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { 
  getEvents, createEvent, updateEvent, deleteEvent, 
  getRatings, createRating, checkDayRules, getOverloadedDays, getCalendars
} from '../lib/api';
import Sidebar from '../components/Sidebar';
import CalendarGrid from '../components/CalendarGrid';
import RightPanel from '../components/RightPanel';
import EventModal from '../components/EventModal';
import SurveyModal from '../components/SurveyModal';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { Menu } from 'lucide-react';

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [events, setEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [ratings, setRatings] = useState({});
  const [overloadedDays, setOverloadedDays] = useState([]);
  const [ruleViolations, setRuleViolations] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [defaultEventTime, setDefaultEventTime] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfMonth(subMonths(currentDate, 1));
      const end = endOfMonth(addMonths(currentDate, 1));
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const [eventsRes, ratingsRes, overloadedRes] = await Promise.all([
        getEvents(startStr, endStr),
        getRatings(startStr, endStr),
        getOverloadedDays(startStr, endStr)
      ]);

      setEvents(eventsRes.data || []);
      const ratingsMap = {};
      (ratingsRes.data || []).forEach(r => { ratingsMap[r.date] = r; });
      setRatings(ratingsMap);
      setOverloadedDays(overloadedRes.data || []);
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
    setShowEventModal(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
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
    try {
      await deleteEvent(eventId);
      toast.success('Событие удалено');
      setShowEventModal(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Ошибка удаления события');
    }
  };

  const handleRateDay = async (rating, notes) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await createRating(rating, dateStr, notes);
      toast.success('Оценка сохранена');
      setRatings(prev => ({ ...prev, [dateStr]: { rating, notes, date: dateStr } }));
    } catch (error) {
      console.error('Error rating day:', error);
      toast.error('Ошибка сохранения оценки');
    }
  };

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDateEvents = events.filter(e => e.start_time?.startsWith(selectedDateStr));
  const currentRating = ratings[selectedDateStr];
  const currentViolations = ruleViolations[selectedDateStr];

  const getTitle = () => {
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
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <main className={`main-content flex-1 ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} data-testid="calendar-main">
        <div className="max-w-full">
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
              <button onClick={handleCreateEvent} className="btn-primary flex items-center gap-2" data-testid="create-event-button">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Событие
              </button>
            </div>
          </header>

          <CalendarGrid
            currentDate={currentDate}
            selectedDate={selectedDate}
            events={events}
            calendars={calendars}
            overloadedDays={overloadedDays}
            ratings={ratings}
            view={view}
            onDateClick={handleDateClick}
            onCellDoubleClick={handleCellDoubleClick}
            onEventClick={handleEventClick}
            loading={loading}
          />
        </div>
      </main>

      <RightPanel
        selectedDate={selectedDate}
        events={selectedDateEvents}
        rating={currentRating}
        violations={currentViolations}
        onRateDay={handleRateDay}
        onOpenSurvey={() => setShowSurveyModal(true)}
        onEventClick={handleEventClick}
      />

      {showEventModal && (
        <EventModal
          event={selectedEvent}
          defaultDate={selectedDate}
          defaultHour={defaultEventTime}
          calendars={calendars}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          onClose={() => setShowEventModal(false)}
        />
      )}

      {showSurveyModal && (
        <SurveyModal date={selectedDate} onClose={() => setShowSurveyModal(false)} onComplete={() => { setShowSurveyModal(false); toast.success('Опрос завершён'); }} />
      )}
    </div>
  );
}
