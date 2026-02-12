import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // SecureStore might not be available
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - will be handled by auth context
    }
    return Promise.reject(error);
  }
);

// ===== Auth =====
export const login = (email, password) => api.post('/auth/login', { email, password });
export const getMe = () => api.get('/auth/me');
export const changePassword = (oldPassword, newPassword) => 
  api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword });

// ===== Users =====
export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const toggleUserActive = (id) => api.patch(`/users/${id}/toggle-active`);

// ===== Events =====
export const getEvents = (startDate, endDate, expandRecurring = true) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  params.append('expand_recurring', expandRecurring.toString());
  return api.get(`/events?${params.toString()}`);
};
export const getEvent = (id) => api.get(`/events/${id}`);
export const createEvent = (data) => api.post('/events', data);
export const updateEvent = (id, data) => api.put(`/events/${id}`, data);
export const deleteEvent = (id) => api.delete(`/events/${id}`);

// ===== User Events =====
export const getUserEvents = (userId, startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return api.get(`/users/${userId}/events?${params.toString()}`);
};

// ===== Calendars =====
export const getCalendars = () => api.get('/calendars');
export const createCalendar = (data) => api.post('/calendars', data);
export const deleteCalendar = (id) => api.delete(`/calendars/${id}`);

// Calendar Permissions
export const getCalendarPermissions = (calendarId) => api.get(`/calendars/${calendarId}/permissions`);
export const grantCalendarPermission = (calendarId, userId, permissionLevel) => {
  return api.post(`/calendars/${calendarId}/permissions`, {
    user_id: userId,
    permission_level: permissionLevel,
  });
};
export const revokeCalendarPermission = (calendarId, userId) => 
  api.delete(`/calendars/${calendarId}/permissions/${userId}`);

// ===== Templates =====
export const getTemplates = () => api.get('/templates');
export const createTemplate = (data) => api.post('/templates', data);
export const updateTemplate = (id, data) => api.put(`/templates/${id}`, data);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`);
export const applyTemplate = (id, targetDate) => 
  api.post(`/templates/${id}/apply?target_date=${targetDate}`);
export const getAppliedTemplates = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return api.get(`/templates/applied?${params.toString()}`);
};
export const removeTemplateFromDay = (date) => api.delete(`/templates/applied/${date}`);

// ===== Ratings =====
export const getRatings = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return api.get(`/ratings?${params.toString()}`);
};
export const createRating = (rating, date, notes) => {
  const params = new URLSearchParams();
  params.append('rating', rating.toString());
  params.append('date', date);
  if (notes) params.append('notes', notes);
  return api.post(`/ratings?${params.toString()}`);
};

// ===== Survey =====
export const getSurveyQuestions = () => api.get('/survey/questions');
export const submitSurveyResponse = (date, responses) => 
  api.post('/survey/responses', { date, responses });
export const getSurveyResponses = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return api.get(`/survey/responses?${params.toString()}`);
};

// ===== Rules =====
export const getRules = () => api.get('/rules');
export const createRule = (data) => api.post('/rules', data);
export const updateRule = (id, data) => api.put(`/rules/${id}`, data);
export const deleteRule = (id) => api.delete(`/rules/${id}`);
export const checkDayRules = (date) => api.get(`/rules/check/${date}`);

// ===== Dictionaries =====
export const getEventTypes = () => api.get('/dictionaries/event-types');
export const createEventType = (data) => api.post('/dictionaries/event-types', data);
export const updateEventType = (id, data) => api.put(`/dictionaries/event-types/${id}`, data);
export const deleteEventType = (id) => api.delete(`/dictionaries/event-types/${id}`);
export const getEventStatuses = () => api.get('/dictionaries/event-statuses');

// ===== ICS Subscriptions =====
export const getICSSubscriptions = () => api.get('/ics-subscriptions');
export const createICSSubscription = (data) => api.post('/ics-subscriptions', data);
export const deleteICSSubscription = (id) => api.delete(`/ics-subscriptions/${id}`);
export const getAllICSEvents = () => api.get('/ics-subscriptions/all-events');

// ===== Recurring Exceptions =====
export const getRecurringExceptions = (parentEventId = null) => {
  const params = parentEventId ? `?parent_event_id=${parentEventId}` : '';
  return api.get(`/recurring-exceptions${params}`);
};
export const createRecurringException = (data) => api.post('/recurring-exceptions', data);
export const deleteRecurringException = (id) => api.delete(`/recurring-exceptions/${id}`);

// ===== Analytics =====
export const getOverloadedDays = (startDate, endDate) => 
  api.get(`/analytics/overloaded-days?start_date=${startDate}&end_date=${endDate}`);
export const getEventCounts = (startDate, endDate) =>
  api.get(`/analytics/event-counts?start_date=${startDate}&end_date=${endDate}`);

export default api;
