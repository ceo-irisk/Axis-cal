# Test Results - Axis Calendar App

## Testing Session: December 31, 2025

### Features to Test:
1. **Template Editing** - Verify editing existing templates (P0)
2. **Enhanced Template Event Form** - Check all fields in template event form (P1)
3. **Dictionary Reordering** - Test reorder buttons for event types and statuses (P2)

### Test Credentials:
- Email: admin@example.com
- Password: admin123

### Test Scenarios:
1. Login and navigate to Settings > Templates
2. Edit existing template "Важный день"
3. Add new event to template with all fields (location, flags, unconfirmed)
4. Save template and verify changes persist
5. Navigate to Settings > Dictionaries
6. Test reorder buttons (move event types up/down)
7. Verify changes persist after reorder

### Expected Results:
- Template editing modal should open with pre-filled data
- Template event form should have all fields: title, description, type, time, location, flags, unconfirmed toggle
- Reorder buttons should appear on hover for each dictionary item
- Moving items up/down should update their order in the list

### Notes for Testing Agent:
- Focus on new functionality added in this session
- Check that existing functionality (calendar view, events) still works
