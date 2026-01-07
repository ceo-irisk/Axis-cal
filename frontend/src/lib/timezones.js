// Complete list of IANA timezones with offsets and display names
export const TIMEZONES = [
  // UTC
  { id: 'UTC', label: 'UTC (0:00)', offset: 0 },
  
  // Europe
  { id: 'Europe/London', label: 'London (GMT+0)', offset: 0 },
  { id: 'Europe/Paris', label: 'Paris (GMT+1)', offset: 1 },
  { id: 'Europe/Berlin', label: 'Berlin (GMT+1)', offset: 1 },
  { id: 'Europe/Rome', label: 'Rome (GMT+1)', offset: 1 },
  { id: 'Europe/Madrid', label: 'Madrid (GMT+1)', offset: 1 },
  { id: 'Europe/Athens', label: 'Athens (GMT+2)', offset: 2 },
  { id: 'Europe/Helsinki', label: 'Helsinki (GMT+2)', offset: 2 },
  { id: 'Europe/Kyiv', label: 'Kyiv (GMT+2)', offset: 2 },
  { id: 'Europe/Moscow', label: 'Moscow (GMT+3)', offset: 3 },
  { id: 'Europe/Istanbul', label: 'Istanbul (GMT+3)', offset: 3 },
  { id: 'Europe/Samara', label: 'Samara (GMT+4)', offset: 4 },
  
  // Asia
  { id: 'Asia/Dubai', label: 'Dubai (GMT+4)', offset: 4 },
  { id: 'Asia/Yekaterinburg', label: 'Yekaterinburg (GMT+5)', offset: 5 },
  { id: 'Asia/Kolkata', label: 'Kolkata (GMT+5:30)', offset: 5.5 },
  { id: 'Asia/Omsk', label: 'Omsk (GMT+6)', offset: 6 },
  { id: 'Asia/Bangkok', label: 'Bangkok (GMT+7)', offset: 7 },
  { id: 'Asia/Krasnoyarsk', label: 'Krasnoyarsk (GMT+7)', offset: 7 },
  { id: 'Asia/Shanghai', label: 'Shanghai (GMT+8)', offset: 8 },
  { id: 'Asia/Singapore', label: 'Singapore (GMT+8)', offset: 8 },
  { id: 'Asia/Hong_Kong', label: 'Hong Kong (GMT+8)', offset: 8 },
  { id: 'Asia/Irkutsk', label: 'Irkutsk (GMT+8)', offset: 8 },
  { id: 'Asia/Tokyo', label: 'Tokyo (GMT+9)', offset: 9 },
  { id: 'Asia/Seoul', label: 'Seoul (GMT+9)', offset: 9 },
  { id: 'Asia/Yakutsk', label: 'Yakutsk (GMT+9)', offset: 9 },
  { id: 'Australia/Sydney', label: 'Sydney (GMT+10)', offset: 10 },
  { id: 'Asia/Vladivostok', label: 'Vladivostok (GMT+10)', offset: 10 },
  { id: 'Asia/Magadan', label: 'Magadan (GMT+11)', offset: 11 },
  { id: 'Asia/Kamchatka', label: 'Kamchatka (GMT+12)', offset: 12 },
  
  // Americas
  { id: 'America/New_York', label: 'New York (GMT-5)', offset: -5 },
  { id: 'America/Chicago', label: 'Chicago (GMT-6)', offset: -6 },
  { id: 'America/Denver', label: 'Denver (GMT-7)', offset: -7 },
  { id: 'America/Phoenix', label: 'Phoenix (GMT-7)', offset: -7 },
  { id: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)', offset: -8 },
  { id: 'America/Anchorage', label: 'Anchorage (GMT-9)', offset: -9 },
  { id: 'Pacific/Honolulu', label: 'Honolulu (GMT-10)', offset: -10 },
  { id: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)', offset: -3 },
  { id: 'America/Mexico_City', label: 'Mexico City (GMT-6)', offset: -6 },
  { id: 'America/Toronto', label: 'Toronto (GMT-5)', offset: -5 },
  
  // Others
  { id: 'Pacific/Auckland', label: 'Auckland (GMT+12)', offset: 12 },
  { id: 'Africa/Cairo', label: 'Cairo (GMT+2)', offset: 2 },
  { id: 'Africa/Johannesburg', label: 'Johannesburg (GMT+2)', offset: 2 },
];

// Get user's browser timezone
export const getUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

// Get timezone info by ID
export const getTimezoneById = (id) => {
  return TIMEZONES.find(tz => tz.id === id) || TIMEZONES.find(tz => tz.id === 'UTC');
};

// Convert local time to UTC
export const localToUTC = (localDateTimeString, timezone) => {
  // localDateTimeString format: "2024-01-15T14:30"
  // Create date in specified timezone and convert to UTC
  const date = new Date(localDateTimeString);
  const tz = getTimezoneById(timezone);
  
  // Subtract timezone offset to get UTC
  const utcDate = new Date(date.getTime() - (tz.offset * 60 * 60 * 1000));
  return utcDate.toISOString();
};

// Convert UTC to local timezone
export const utcToLocal = (utcDateTimeString, timezone) => {
  // utcDateTimeString format: "2024-01-15T14:30:00Z"
  const date = new Date(utcDateTimeString);
  const tz = getTimezoneById(timezone);
  
  // Add timezone offset
  const localDate = new Date(date.getTime() + (tz.offset * 60 * 60 * 1000));
  return localDate;
};

// Format date for datetime-local input
export const formatForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Get formatted time for display (HH:MM)
export const formatTime = (date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Calculate time difference between two timezones in hours
export const getTimezoneOffset = (fromTz, toTz) => {
  const from = getTimezoneById(fromTz);
  const to = getTimezoneById(toTz);
  return to.offset - from.offset;
};
