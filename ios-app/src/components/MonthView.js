import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { getMonthDays, isToday, isSameDay, format, startOfMonth, getEventsForDay } from '../utils/dates';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - spacing.lg * 2) / 7;

const WEEKDAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

const EVENT_COLORS = {
  meeting: '#8b5cf6',
  call: '#06b6d4',
  personal: '#f59e0b',
  urgent: '#ef4444',
  travel: '#10b981',
  deep_work: '#6366f1',
};

export default function MonthView({ currentDate, events, onDayPress, selectedDate }) {
  const days = useMemo(() => getMonthDays(currentDate), [currentDate]);
  const monthStart = startOfMonth(currentDate);

  return (
    <View style={styles.container}>
      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map(label => (
          <View key={label} style={styles.weekCell}>
            <Text style={styles.weekLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {days.map((day, idx) => {
          const today = isToday(day);
          const isCurrentMonth = day.getMonth() === monthStart.getMonth();
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const dayEvents = getEventsForDay(events, day);
          const eventDots = dayEvents.slice(0, 3);

          return (
            <TouchableOpacity
              key={idx}
              style={[styles.dayCell, isSelected && styles.selectedCell]}
              onPress={() => onDayPress && onDayPress(day)}
              activeOpacity={0.6}
            >
              <View style={[styles.dayNumContainer, today && styles.todayCircle]}>
                <Text style={[
                  styles.dayNum,
                  !isCurrentMonth && styles.otherMonth,
                  today && styles.todayText,
                  isSelected && styles.selectedText,
                ]}>
                  {format(day, 'd')}
                </Text>
              </View>
              {/* Event dots */}
              <View style={styles.dotsRow}>
                {eventDots.map((evt, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { backgroundColor: evt.color || EVENT_COLORS[evt.event_type] || '#6366f1' },
                    ]}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <Text style={styles.moreText}>+{dayEvents.length - 3}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekCell: {
    width: CELL_SIZE,
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  selectedCell: {
    backgroundColor: colors.todayHighlight,
    borderRadius: borderRadius.sm,
  },
  dayNumContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: colors.accent,
  },
  dayNum: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  otherMonth: {
    color: colors.muted,
  },
  todayText: {
    color: '#fff',
    fontWeight: fontWeight.bold,
  },
  selectedText: {
    color: colors.accent,
    fontWeight: fontWeight.bold,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  moreText: {
    fontSize: 8,
    color: colors.muted,
  },
});
