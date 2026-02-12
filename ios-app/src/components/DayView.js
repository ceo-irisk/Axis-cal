import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import {
  formatTime, getEventsForDay, isToday, HOURS,
  parseISO, getHours, getMinutes, format,
} from '../utils/dates';

const HOUR_HEIGHT = 70;
const TIME_COL_WIDTH = 52;

const EVENT_COLORS = {
  meeting: '#8b5cf6',
  call: '#06b6d4',
  personal: '#f59e0b',
  urgent: '#ef4444',
  travel: '#10b981',
  deep_work: '#6366f1',
  external: '#94a3b8',
};

export default function DayView({ currentDate, events, onEventPress, onSlotPress }) {
  const scrollRef = useRef(null);
  const dayEvents = getEventsForDay(events, currentDate);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 8 * HOUR_HEIGHT, animated: false });
    }, 100);
  }, []);

  const now = new Date();
  const showCurrentLine = isToday(currentDate);
  const currentHourOffset = (getHours(now) + getMinutes(now) / 60) * HOUR_HEIGHT;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerDay}>{format(currentDate, 'EEEE', { locale: undefined })}</Text>
        <Text style={styles.headerDate}>{format(currentDate, 'd MMMM yyyy')}</Text>
      </View>

      <ScrollView ref={scrollRef} style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {/* Time labels */}
          <View style={styles.timeCol}>
            {HOURS.map(hour => (
              <View key={hour} style={styles.hourLabel}>
                <Text style={styles.hourText}>
                  {hour.toString().padStart(2, '0')}:00
                </Text>
              </View>
            ))}
          </View>

          {/* Day column */}
          <View style={styles.dayCol}>
            {HOURS.map(hour => (
              <TouchableOpacity
                key={hour}
                style={styles.hourSlot}
                onPress={() => onSlotPress && onSlotPress(currentDate, hour)}
                activeOpacity={0.5}
              >
                <View style={styles.hourLine} />
              </TouchableOpacity>
            ))}

            {/* Events */}
            {dayEvents.map(event => {
              const start = parseISO(event.start_time);
              const end = parseISO(event.end_time);
              const startOffset = (getHours(start) + getMinutes(start) / 60) * HOUR_HEIGHT;
              const endOffset = (getHours(end) + getMinutes(end) / 60) * HOUR_HEIGHT;
              const height = Math.max(endOffset - startOffset, 30);
              const eventColor = event.color || EVENT_COLORS[event.event_type] || '#6366f1';

              return (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.event,
                    {
                      top: startOffset,
                      height,
                      backgroundColor: eventColor + '25',
                      borderLeftColor: eventColor,
                    },
                  ]}
                  onPress={() => onEventPress && onEventPress(event)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.eventTime, { color: eventColor }]}>
                    {formatTime(start)} – {formatTime(end)}
                  </Text>
                  <Text style={styles.eventTitle} numberOfLines={3}>
                    {event.title}
                  </Text>
                  {event.location ? (
                    <Text style={styles.eventLocation} numberOfLines={1}>
                      {event.location}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}

            {/* Current time line */}
            {showCurrentLine && (
              <View style={[styles.currentLine, { top: currentHourOffset }]}>
                <View style={styles.currentDot} />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerDay: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textTransform: 'capitalize',
  },
  headerDate: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },
  scrollArea: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    height: 24 * HOUR_HEIGHT,
  },
  timeCol: {
    width: TIME_COL_WIDTH,
  },
  hourLabel: {
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start',
    paddingRight: spacing.sm,
    alignItems: 'flex-end',
  },
  hourText: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  dayCol: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
    position: 'relative',
  },
  hourSlot: {
    height: HOUR_HEIGHT,
  },
  hourLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  event: {
    position: 'absolute',
    left: spacing.xs,
    right: spacing.xs,
    borderLeftWidth: 4,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  eventTime: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  eventTitle: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
  eventLocation: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 2,
  },
  currentLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.currentTimeLine,
    zIndex: 10,
  },
  currentDot: {
    position: 'absolute',
    left: -5,
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.currentTimeLine,
  },
});
