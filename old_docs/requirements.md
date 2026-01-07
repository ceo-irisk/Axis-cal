# Executive Calendar - Requirements & Architecture

## Original Problem Statement (Russian)
Создай удобный календарь для работы руководителя компании с личным помощником.

### Необходимые функции:
- Темная тема
- Предварительная бронь времени
- Высокая частота и скорость обновления данных через интеграции
- Большое кол-во цветов календарей и разных узоров для удобного считывания календаря
- Настройка полей на карточке создания события
- Наличие оценки дня
- Шаблоны недели и дня
- Подсветка перегруженных дней
- Отсутствие кнопки слоты
- Отсутствие праздничных календарей
- Разграничение прав доступа к календарю (Для помощника и руководителя)
- Адаптация под часовые пояса
- Интеграция с другими календарями
- Проверка дня на соблюдение правил
- Опрос в конце дня и создание md файла для БЗ

## User Choices
1. **Calendar Integrations**: Яндекс Календарь, Google Calendar, Apple Calendar, Битрикс24
2. **Authentication**: Email + password (admin-only user creation)
3. **AI**: ChatGPT (OpenAI) for day analysis and questions
4. **Notifications**: Битрикс24 (to be implemented later)
5. **Design**: Apple style with dark theme

---

## Architecture Completed

### Backend (FastAPI + MongoDB)
- **Authentication**: JWT-based with role-based access control
- **Roles**: Admin, Manager, Assistant
- **Collections**:
  - users
  - events
  - templates
  - day_ratings
  - survey_questions
  - survey_responses
  - day_rules
  - event_field_config
  - calendars

### API Endpoints
- `/api/auth/*` - Login, profile
- `/api/users/*` - User CRUD (admin only)
- `/api/events/*` - Event CRUD
- `/api/templates/*` - Day/week templates
- `/api/ratings/*` - Day rating system
- `/api/survey/*` - End-of-day survey with AI summary
- `/api/rules/*` - Day rules validation
- `/api/calendars/*` - External calendar management
- `/api/event-fields` - Custom event fields config
- `/api/analytics/*` - Overloaded days detection

### Frontend (React + Tailwind)
- **Pages**:
  - LoginPage - Authentication
  - CalendarPage - Main calendar with day/week/month views
  - AdminPage - User management, survey questions, rules, event fields
  - TemplatesPage - Day/week templates management
  - SettingsPage - Timezone, external calendars, profile

- **Components**:
  - Sidebar - Navigation with view switcher
  - CalendarGrid - Month/Week/Day views
  - RightPanel - Day stats, rating, events list
  - EventModal - Create/edit events
  - SurveyModal - End-of-day survey with AI summary

### Features Implemented
1. ✅ Dark Apple-style theme with glassmorphism
2. ✅ Tentative booking (событие со статусом "предварительно")
3. ✅ Role-based access (Admin/Manager/Assistant)
4. ✅ 6 event types with distinct colors
5. ✅ Custom event fields (configurable in admin)
6. ✅ Day rating system (1-5 stars)
7. ✅ Day/week templates
8. ✅ Overloaded days highlighting
9. ✅ Day rules validation
10. ✅ End-of-day survey with AI-generated summary (OpenAI GPT)
11. ✅ Timezone support
12. ✅ External calendar placeholders

### Default Credentials
- **Admin**: admin@company.com / Admin123!

---

## Next Action Items

### Phase 2 - Calendar Integrations
1. [ ] Google Calendar OAuth integration
2. [ ] Yandex Calendar API integration
3. [ ] Apple Calendar (iCal) sync
4. [ ] Bitrix24 calendar sync

### Phase 3 - Notifications
1. [ ] Bitrix24 notifications
2. [ ] Email reminders
3. [ ] Browser push notifications

### Phase 4 - Enhancements
1. [ ] Drag-and-drop event rescheduling
2. [ ] Recurring events
3. [ ] Event attachments
4. [ ] Multi-language support
5. [ ] Export calendar to PDF
6. [ ] Mobile responsive improvements

---

## Technology Stack
- **Backend**: FastAPI, Motor (MongoDB async), PyJWT, bcrypt
- **Frontend**: React 19, React Router, Tailwind CSS, date-fns
- **Database**: MongoDB
- **AI**: OpenAI GPT via Emergent LLM Key
- **UI Components**: Shadcn/UI
