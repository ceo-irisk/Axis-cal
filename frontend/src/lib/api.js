import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${API_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const getMe = () => api.get('/auth/me');

// Users (Admin)
export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const toggleUserActive = (id) => api.patch(`/users/${id}/toggle-active`);

// Events
export const getEvents = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return api.get(`/events?${params.toString()}`);
};
export const createEvent = (data) => api.post('/events', data);
export const updateEvent = (id, data) => api.put(`/events/${id}`, data);
export const deleteEvent = (id) => api.delete(`/events/${id}`);

// Templates
export const getTemplates = () => api.get('/templates');
export const createTemplate = (data) => api.post('/templates', data);
export const updateTemplate = (id, data) => api.put(`/templates/${id}`, data);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`);
export const applyTemplate = (id, targetDate) => api.post(`/templates/${id}/apply?target_date=${targetDate}`);

// Ratings
export const getRatings = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return api.get(`/ratings?${params.toString()}`);
};
export const createRating = (rating, date, notes) => {
  const params = new URLSearchParams();
  params.append('rating', rating);
  params.append('date', date);
  if (notes) params.append('notes', notes);
  return api.post(`/ratings?${params.toString()}`);
};
export const getRating = (date) => api.get(`/ratings/${date}`);

// Survey
export const getSurveyQuestions = () => api.get('/survey/questions');
export const createSurveyQuestion = (question, questionType, options) => {
  const params = new URLSearchParams();
  params.append('question', question);
  params.append('question_type', questionType);
  if (options) options.forEach(o => params.append('options', o));
  return api.post(`/survey/questions?${params.toString()}`);
};
export const updateSurveyQuestion = (id, question, questionType, options) => {
  const params = new URLSearchParams();
  params.append('question', question);
  params.append('question_type', questionType);
  if (options) options.forEach(o => params.append('options', o));
  return api.put(`/survey/questions/${id}?${params.toString()}`);
};
export const deleteSurveyQuestion = (id) => api.delete(`/survey/questions/${id}`);
export const submitSurveyResponse = (date, responses) => api.post('/survey/responses', { date, responses });
export const getSurveyResponses = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return api.get(`/survey/responses?${params.toString()}`);
};
export const getSurveyResponse = (date) => api.get(`/survey/responses/${date}`);

// Rules
export const getRules = () => api.get('/rules');
export const createRule = (name, description, ruleType, value) => {
  const params = new URLSearchParams();
  params.append('name', name);
  params.append('description', description);
  params.append('rule_type', ruleType);
  params.append('value', value);
  return api.post(`/rules?${params.toString()}`);
};
export const updateRule = (id, name, description, ruleType, value) => {
  const params = new URLSearchParams();
  params.append('name', name);
  params.append('description', description);
  params.append('rule_type', ruleType);
  params.append('value', value);
  return api.put(`/rules/${id}?${params.toString()}`);
};
export const deleteRule = (id) => api.delete(`/rules/${id}`);
export const checkDayRules = (date) => api.get(`/rules/check/${date}`);

// Event Fields
export const getEventFields = () => api.get('/event-fields');
export const updateEventFields = (fields) => api.put('/event-fields', fields);

// Calendars
export const getCalendars = () => api.get('/calendars');
export const addCalendar = (name, provider, color, pattern) => {
  const params = new URLSearchParams();
  params.append('name', name);
  params.append('provider', provider);
  params.append('color', color);
  if (pattern) params.append('pattern', pattern);
  return api.post(`/calendars?${params.toString()}`);
};
export const deleteCalendar = (id) => api.delete(`/calendars/${id}`);

// Analytics
export const getOverloadedDays = (startDate, endDate) => 
  api.get(`/analytics/overloaded-days?start_date=${startDate}&end_date=${endDate}`);

// Dictionaries - Event Types
export const getEventTypes = () => api.get('/dictionaries/event-types');
export const createEventType = (name, label, color) => {
  const params = new URLSearchParams();
  params.append('name', name);
  params.append('label', label);
  params.append('color', color);
  return api.post(`/dictionaries/event-types?${params.toString()}`);
};
export const updateEventType = (id, name, label, color, order = 0, isActive = true) => {
  const params = new URLSearchParams();
  params.append('name', name);
  params.append('label', label);
  params.append('color', color);
  params.append('order', order);
  params.append('is_active', isActive);
  return api.put(`/dictionaries/event-types/${id}?${params.toString()}`);
};
export const deleteEventType = (id) => api.delete(`/dictionaries/event-types/${id}`);
export const reorderEventTypes = (typeIds) => api.put('/dictionaries/event-types/reorder', typeIds);

// Dictionaries - Event Statuses
export const getEventStatuses = () => api.get('/dictionaries/event-statuses');
export const createEventStatus = (name, label, color) => {
  const params = new URLSearchParams();
  params.append('name', name);
  params.append('label', label);
  params.append('color', color);
  return api.post(`/dictionaries/event-statuses?${params.toString()}`);
};
export const updateEventStatus = (id, name, label, color, order = 0, isActive = true) => {
  const params = new URLSearchParams();
  params.append('name', name);
  params.append('label', label);
  params.append('color', color);
  params.append('order', order);
  params.append('is_active', isActive);
  return api.put(`/dictionaries/event-statuses/${id}?${params.toString()}`);
};
export const deleteEventStatus = (id) => api.delete(`/dictionaries/event-statuses/${id}`);

// Custom Timezones
export const getCustomTimezones = () => api.get('/dictionaries/timezones');
export const createCustomTimezone = (name, label, offset) => {
  const params = new URLSearchParams();
  params.append('name', name);
  params.append('label', label);
  params.append('offset', offset);
  return api.post(`/dictionaries/timezones?${params.toString()}`);
};
export const deleteCustomTimezone = (id) => api.delete(`/dictionaries/timezones/${id}`);

export default api;
