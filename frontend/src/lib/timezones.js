// Timezone utilities and data

export const TIMEZONES = [
  { value: 'UTC', label: 'UTC (0:00)', offset: 0 },
  { value: 'Europe/London', label: 'Лондон (GMT)', offset: 0 },
  { value: 'Europe/Paris', label: 'Париж (GMT+1)', offset: 1 },
  { value: 'Europe/Berlin', label: 'Берлин (GMT+1)', offset: 1 },
  { value: 'Europe/Kiev', label: 'Киев (GMT+2)', offset: 2 },
  { value: 'Europe/Moscow', label: 'Москва (GMT+3)', offset: 3 },
  { value: 'Europe/Samara', label: 'Самара (GMT+4)', offset: 4 },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (GMT+5)', offset: 5 },
  { value: 'Asia/Omsk', label: 'Омск (GMT+6)', offset: 6 },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (GMT+7)', offset: 7 },
  { value: 'Asia/Irkutsk', label: 'Иркутск (GMT+8)', offset: 8 },
  { value: 'Asia/Yakutsk', label: 'Якутск (GMT+9)', offset: 9 },
  { value: 'Asia/Vladivostok', label: 'Владивосток (GMT+10)', offset: 10 },
  { value: 'Asia/Magadan', label: 'Магадан (GMT+11)', offset: 11 },
  { value: 'Asia/Kamchatka', label: 'Камчатка (GMT+12)', offset: 12 },
  { value: 'Asia/Dubai', label: 'Дубай (GMT+4)', offset: 4 },
  { value: 'Asia/Singapore', label: 'Сингапур (GMT+8)', offset: 8 },
  { value: 'Asia/Tokyo', label: 'Токио (GMT+9)', offset: 9 },
  { value: 'America/New_York', label: 'Нью-Йорк (GMT-5)', offset: -5 },
  { value: 'America/Chicago', label: 'Чикаго (GMT-6)', offset: -6 },
  { value: 'America/Denver', label: 'Денвер (GMT-7)', offset: -7 },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (GMT-8)', offset: -8 },
];

// Get user's local timezone offset in hours
export const getLocalTimezoneOffset = () => {
  return -new Date().getTimezoneOffset() / 60;
};

// Get user's local timezone name (approximate)
export const getLocalTimezoneName = () => {
  const offset = getLocalTimezoneOffset();
  // Find closest match
  const match = TIMEZONES.find(tz => tz.offset === offset);
  return match?.value || 'UTC';
};

// Format timezone offset as string
export const formatTimezoneOffset = (offset) => {
  if (offset === 0) return 'UTC';
  const sign = offset > 0 ? '+' : '';
  return `GMT${sign}${offset}`;
};

// Calculate time shift between two timezone offsets
export const getTimezoneShift = (fromOffset, toOffset) => {
  return toOffset - fromOffset;
};

// Shift event time by hours
export const shiftEventTime = (isoString, shiftHours) => {
  const date = new Date(isoString);
  date.setHours(date.getHours() + shiftHours);
  return date;
};

// Format shifted time with indicator
export const formatShiftedTime = (originalTime, shiftHours) => {
  const original = new Date(originalTime);
  const originalFormatted = `${String(original.getHours()).padStart(2, '0')}:${String(original.getMinutes()).padStart(2, '0')}`;
  
  if (shiftHours === 0) {
    return { display: originalFormatted, shifted: null };
  }
  
  const shifted = new Date(originalTime);
  shifted.setHours(shifted.getHours() + shiftHours);
  const shiftedFormatted = `${String(shifted.getHours()).padStart(2, '0')}:${String(shifted.getMinutes()).padStart(2, '0')}`;
  
  const sign = shiftHours > 0 ? '+' : '';
  return {
    display: shiftedFormatted,
    shifted: `${originalFormatted} ${sign}${shiftHours}`,
    original: originalFormatted
  };
};

export default TIMEZONES;
