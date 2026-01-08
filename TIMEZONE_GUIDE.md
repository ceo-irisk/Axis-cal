# 🌍 Руководство по работе с Timezone в Axis Calendar

## Критически важная информация

В календаре используются **ДВА типа времени**:
1. **UTC время** - хранится в базе данных (`start_time`, `end_time`)
2. **Локальное время** - отображается пользователю (`_localStartTime`, `_localEndTime`)

**❌ НИКОГДА не используйте `start_time` / `end_time` напрямую для:**
- Вычисления наложения событий
- Сортировки событий по времени
- Вычисления длительности события
- Любых операций, связанных с отображением

**✅ ВСЕГДА используйте `_localStartTime` / `_localEndTime` для этих операций**

---

## Структура данных события

### Исходные поля (из базы данных):
```javascript
{
  id: "uuid",
  title: "Название события",
  start_time: "2026-01-08T06:00:00.000Z",  // UTC время
  end_time: "2026-01-08T07:00:00.000Z",    // UTC время
  timezone: "Europe/Moscow",                // Timezone, в котором создано событие
  is_all_day: false
}
```

### Конвертированные поля (после обработки):
```javascript
{
  ...originalFields,
  _localStartTime: Date,        // Локальное время начала (объект Date)
  _localEndTime: Date,          // Локальное время окончания (объект Date)
  _displayStartDate: "2026-01-08",     // Дата для отображения
  _displayStartTime: "09:00",          // Время начала для отображения
  _displayEndTime: "10:00",            // Время окончания для отображения
  _originalStartTime: "09:00",         // Исходное время (если timezone отличается)
  _originalTimezone: { id: "...", name: "...", offset: 3 },
  _timezoneOffset: 0                   // Разница в часах между timezone
}
```

---

## Где происходит конвертация?

### 📍 CalendarGrid.jsx (строки 161-195)

```javascript
const eventsInTimezone = useMemo(() => {
  return events.map(event => {
    if (event.start_time && event.timezone) {
      // Конвертируем UTC в выбранный timezone
      const startLocal = utcToLocal(event.start_time, selectedTimezone);
      const endLocal = utcToLocal(event.end_time, selectedTimezone);
      
      return {
        ...event,
        _localStartTime: startLocal,  // ✅ Используйте это!
        _localEndTime: endLocal,      // ✅ Используйте это!
        _displayStartDate: formatDate(startLocal),
        _displayStartTime: formatTime(startLocal),
        _displayEndTime: formatTime(endLocal),
        // ... остальные поля
      };
    }
    return event;
  });
}, [events, selectedTimezone]);
```

**Важно:** Эта конвертация происходит в `useMemo`, поэтому пересчитывается только при изменении `events` или `selectedTimezone`.

---

## Функции и их правильное использование

### ✅ getOverlapStyle - Определение наложения событий

**Расположение:** 
- WeekView: строки 363-415
- DayView: строки 764-816

**Правильная реализация:**
```javascript
const getOverlapStyle = (event, dayEvents) => {
  // ✅ ПРАВИЛЬНО: Используем _localStartTime и _localEndTime
  const eventStart = event._localStartTime 
    ? event._localStartTime.getTime() 
    : new Date(event.start_time).getTime();
  
  const eventEnd = event._localEndTime 
    ? event._localEndTime.getTime() 
    : new Date(event.end_time).getTime();
  
  // Находим все накладывающиеся события
  const overlapping = dayEvents.filter(e => {
    const eStart = e._localStartTime 
      ? e._localStartTime.getTime() 
      : new Date(e.start_time).getTime();
    
    const eEnd = e._localEndTime 
      ? e._localEndTime.getTime() 
      : new Date(e.end_time).getTime();
    
    return (eStart < eventEnd && eEnd > eventStart);
  });
  
  // Сортируем для детерминированного порядка
  overlapping.sort((a, b) => {
    const aStart = a._localStartTime 
      ? a._localStartTime.getTime() 
      : new Date(a.start_time).getTime();
    const bStart = b._localStartTime 
      ? b._localStartTime.getTime() 
      : new Date(b.start_time).getTime();
    
    if (aStart !== bStart) return aStart - bStart;
    
    // Далее по времени окончания, названию, ID
    // ...
  });
  
  // Возвращаем позицию и ширину
  // ...
};
```

**❌ НЕПРАВИЛЬНО:**
```javascript
// НЕ ДЕЛАЙТЕ ТАК!
const eventStart = new Date(event.start_time).getTime(); // UTC время!
const eventEnd = new Date(event.end_time).getTime();     // UTC время!
```

---

### ✅ Сортировка событий в Sidebar

**Расположение:** Sidebar.jsx, строки 456-462

**Правильная реализация:**
```javascript
// All-day события - НЕ сортируются (всегда сверху)
const allDayEvents = eventsInTimezone.filter(e => e.is_all_day);

// Timed события - сортируются по времени начала
const timedEvents = eventsInTimezone
  .filter(e => !e.is_all_day)
  .sort((a, b) => {
    // ✅ ПРАВИЛЬНО: Используем _localStartTime
    const aStart = a._localStartTime 
      ? a._localStartTime.getTime() 
      : new Date(a.start_time).getTime();
    const bStart = b._localStartTime 
      ? b._localStartTime.getTime() 
      : new Date(b.start_time).getTime();
    return aStart - bStart;
  });
```

---

### ✅ getEventStyle - Позиционирование события на сетке

**Расположение:** 
- WeekView: строки 336-351
- DayView: строки 732-747

**Правильная реализация:**
```javascript
const getEventStyle = (event) => {
  // ✅ ПРАВИЛЬНО: Используем _localStartTime для позиционирования
  const start = event._localStartTime || new Date(event.start_time);
  const end = event._localEndTime || new Date(event.end_time);
  
  // getUTCHours работает корректно, потому что _localStartTime 
  // уже содержит скорректированное время
  const shiftedStartHour = start.getUTCHours() + start.getUTCMinutes() / 60;
  const duration = (end - start) / 3600000;
  
  return { 
    top: `${shiftedStartHour * 60}px`, 
    height: `${Math.max(duration * 60, 24)}px` 
  };
};
```

---

### ✅ handleDrop - Перетаскивание событий

**Расположение:**
- WeekView: строки 434-461
- DayView: строки 790-813

**Правильная реализация:**
```javascript
const handleDrop = (e, day, hour) => {
  // Для вычисления длительности используем локальное время
  const start = parseISO(draggedEvent.start_time);
  const end = parseISO(draggedEvent.end_time);
  const duration = end - start; // Длительность в миллисекундах
  
  // Создаём новое время в локальном timezone
  const newStart = setMinutes(setHours(day, hour), roundedMinutes);
  const newEnd = new Date(newStart.getTime() + duration);
  
  // Отправляем на сервер ISO строку (UTC)
  onEventUpdate({
    ...draggedEvent,
    start_time: newStart.toISOString(),
    end_time: newEnd.toISOString()
  });
};
```

---

### ✅ handleResizeStart - Изменение длительности события

**Расположение:** WeekView, строки 479-519

**Правильная реализация:**
```javascript
const handleResizeStart = (e, event, day) => {
  // ✅ ПРАВИЛЬНО: Используем _localStartTime для вычисления длительности
  const eventStart = event._localStartTime || new Date(event.start_time);
  const eventEnd = event._localEndTime || new Date(event.end_time);
  const originalDuration = (eventEnd - eventStart) / 60000; // минуты
  
  // ... логика resize ...
};
```

---

## Вспомогательные функции

### 📍 utcToLocal(utcTime, timezone)
**Файл:** `/app/frontend/src/lib/timezones.js`

Конвертирует UTC время в указанный timezone.

```javascript
const localTime = utcToLocal("2026-01-08T06:00:00.000Z", "Europe/Moscow");
// Результат: Date объект с временем 09:00 в Moscow timezone
```

### 📍 formatTime(date)
**Файл:** `/app/frontend/src/lib/timezones.js`

Форматирует Date в строку "HH:MM".

```javascript
const timeStr = formatTime(new Date());
// Результат: "09:00"
```

### 📍 formatDate(date)
**Файл:** `/app/frontend/src/lib/timezones.js`

Форматирует Date в строку "YYYY-MM-DD".

```javascript
const dateStr = formatDate(new Date());
// Результат: "2026-01-08"
```

---

## Чеклист перед коммитом

Перед изменением кода, связанного со временем, проверьте:

- [ ] Используете ли вы `_localStartTime` вместо `start_time`?
- [ ] Используете ли вы `_localEndTime` вместо `end_time`?
- [ ] Сортировка событий использует локальное время?
- [ ] Определение наложения событий использует локальное время?
- [ ] Вычисление длительности использует локальное время?
- [ ] Есть ли fallback на `start_time`/`end_time` для старых событий?

---

## Часто встречающиеся ошибки

### ❌ Ошибка 1: Использование UTC времени для сортировки
```javascript
// НЕПРАВИЛЬНО
events.sort((a, b) => {
  return new Date(a.start_time) - new Date(b.start_time);
});

// ПРАВИЛЬНО
events.sort((a, b) => {
  const aStart = a._localStartTime || new Date(a.start_time);
  const bStart = b._localStartTime || new Date(b.start_time);
  return aStart - bStart;
});
```

### ❌ Ошибка 2: Определение наложения по UTC времени
```javascript
// НЕПРАВИЛЬНО
const overlap = (
  new Date(e.start_time) < new Date(event.end_time) &&
  new Date(e.end_time) > new Date(event.start_time)
);

// ПРАВИЛЬНО
const eStart = e._localStartTime || new Date(e.start_time);
const eEnd = e._localEndTime || new Date(e.end_time);
const eventStart = event._localStartTime || new Date(event.start_time);
const eventEnd = event._localEndTime || new Date(event.end_time);
const overlap = (eStart < eventEnd && eEnd > eventStart);
```

### ❌ Ошибка 3: Забыли про fallback
```javascript
// НЕПРАВИЛЬНО - упадёт для старых событий без _localStartTime
const start = event._localStartTime.getTime();

// ПРАВИЛЬНО - работает для всех событий
const start = event._localStartTime 
  ? event._localStartTime.getTime() 
  : new Date(event.start_time).getTime();
```

---

## Тестирование

Для проверки корректности timezone логики:

1. Создайте событие в timezone `Europe/Moscow` (GMT+3)
2. Переключитесь на timezone `UTC` (GMT+0)
3. Проверьте, что:
   - Время события сдвинулось на -3 часа
   - События всё ещё правильно сортируются
   - Наложение событий определяется корректно
   - Порядок событий детерминирован и одинаков при перезагрузке

---

## Резюме

| Операция | Используйте | НЕ используйте |
|----------|------------|----------------|
| Сортировка событий | `_localStartTime` | `start_time` |
| Определение наложения | `_localStartTime`, `_localEndTime` | `start_time`, `end_time` |
| Вычисление длительности | `_localStartTime`, `_localEndTime` | `start_time`, `end_time` |
| Позиционирование на сетке | `_localStartTime` | `start_time` |
| Отображение времени | `_displayStartTime`, `_displayEndTime` | Прямое форматирование `start_time` |
| Сохранение на сервер | `toISOString()` | Локальное время |

---

**Версия документа:** 1.0  
**Дата последнего обновления:** 2026-01-08  
**Автор:** Axis Calendar Development Team
