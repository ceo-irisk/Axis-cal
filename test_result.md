# Test Results - Axis Calendar App

## Testing Session: December 31, 2025

### Features to Test:

1. **Event Selection with Single Click**
   - Click on event in calendar grid → should select (show violet ring)
   - Click on another event → should select new one, deselect old
   - Click on same event again → should deselect

2. **Event Deletion with Backspace**
   - Select event with single click
   - Press Backspace key
   - Confirm dialog should appear
   - Event should be deleted after confirmation

3. **Double Click for Editing**
   - Double click on event in calendar grid
   - Should open edit modal (not just select)

4. **Improved Time Picker**
   - Open event modal
   - Time picker should have +/- buttons for hours and minutes
   - No more datetime-local input

5. **Status field replaces is_unconfirmed**
   - Status dropdown should have: Подтверждено, Не согласовано, Шаблонное событие
   - "Подтверждено" should be default for new events
   - "Не согласовано" should show dotted border in calendar
   - No separate "Не согласовано" toggle

6. **Event Flags in Dictionaries**
   - Settings → Dictionaries
   - Should show "Флаги событий" section
   - Should display: Заблокировано, Выполнено, Срочно, Видеозвонок
   - Old "Статусы событий" (confirmed/tentative/cancelled) should be removed

### Test Credentials:
- Email: admin@example.com
- Password: admin123

### Expected Results:
- Single click selects event (violet ring highlight)
- Backspace deletes selected event after confirmation
- Double click opens edit modal
- Time picker has improved UI with +/- buttons
- Status dropdown works correctly
- Dictionaries show event flags instead of old statuses
