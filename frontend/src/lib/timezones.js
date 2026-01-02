// Timezone utilities (only helper functions, no hardcoded timezones)

// Get user's local timezone offset in hours
export const getLocalTimezoneOffset = () => {
  return -new Date().getTimezoneOffset() / 60;
};

// Get user's local timezone name (approximate)
export const getLocalTimezoneName = () => {
  const offset = getLocalTimezoneOffset();
  return `GMT${offset >= 0 ? '+' : ''}${offset}`;
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
