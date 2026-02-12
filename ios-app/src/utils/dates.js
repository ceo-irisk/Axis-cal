import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, subWeeks, addMonths, subMonths, isSameDay, isToday,
  parseISO, differenceInMinutes, setHours, setMinutes, getHours, getMinutes,
  eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

export const formatDate = (date, fmt = 'dd MMM yyyy') => 
  format(date, fmt, { locale: ru });

export const formatTime = (date) => format(date, 'HH:mm');

export const formatWeekDay = (date) => format(date, 'EEE', { locale: ru });

export const formatMonthYear = (date) => format(date, 'LLLL yyyy', { locale: ru });

export const formatDayMonth = (date) => format(date, 'd MMM', { locale: ru });

export const formatISO = (date) => date.toISOString();

export const getWeekDays = (date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const getMonthDays = (date) => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const weekStart = startOfWeek(start, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(end, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
};

export const getWeekRange = (date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return { start, end };
};

export const getMonthRange = (date) => ({
  start: startOfMonth(date),
  end: endOfMonth(date),
});

export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const getEventPosition = (event, hourHeight = 60) => {
  const start = parseISO(event.start_time);
  const end = parseISO(event.end_time);
  const startHour = getHours(start) + getMinutes(start) / 60;
  const duration = differenceInMinutes(end, start) / 60;
  return {
    top: startHour * hourHeight,
    height: Math.max(duration * hourHeight, hourHeight / 2),
  };
};

export const getEventsForDay = (events, day) => {
  return events.filter(event => {
    try {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, day);
    } catch {
      return false;
    }
  });
};

export {
  addDays, addWeeks, subWeeks, addMonths, subMonths,
  isSameDay, isToday, parseISO, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfDay, endOfDay,
  differenceInMinutes, setHours, setMinutes, getHours, getMinutes,
  format,
};
