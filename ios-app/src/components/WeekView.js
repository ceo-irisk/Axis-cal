import React, { useRef, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import {
  formatTime, formatWeekDay, getWeekDays, getEventsForDay,
  isToday, HOURS, parseISO, getHours, getMinutes, isSameDay, format,
} from '../utils/dates';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HOUR_HEIGHT = 60;
const TIME_COL_WIDTH = 44;
const DAY_WIDTH = (SCREEN_WIDTH - TIME_COL_WIDTH) / 7;

const EVENT_COLORS = {
  meeting: '#8b5cf6',
  call: '#06b6d4',
  personal: '#f59e0b',
  urgent: '#ef4444',
  travel: '#10b981',
  deep_work: '#6366f1',
  external: '#94a3b8',
};

export default function WeekView({ currentDate, events, onEventPress, onSlotPress }) {
  const scrollRef = useRef(null);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  useEffect(() => {
    // Scroll to 8am on mount
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 8 * HOUR_HEIGHT, animated: false });
    }, 100);
  }, []);

  const now = new Date();
  const currentHourOffset = (getHours(now) + getMinutes(now) / 60) * HOUR_HEIGHT;

  return (
    <View style={styles.container}>
      {/* Day headers */}
      <View style={styles.headerRow}>
        <View style={styles.timeColHeader} />
        {weekDays.map((day, i) => {
          const today = isToday(day);
          return (
            <View key={i} style={[styles.dayHeader, today && styles.todayHeader]}>
              <Text style={[styles.dayName, today && styles.todayText]}>
                {formatWeekDay(day).toUpperCase()}
              </Text>
              <Text style={[styles.dayNum, today && styles.todayNum]}>
                {format(day, 'd')}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Time grid */}
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

          {/* Day columns */}
          {weekDays.map((day, dayIdx) => {
            const dayEvents = getEventsForDay(events, day);
            const today = isToday(day);
            return (
              <View key={dayIdx} style={[styles.dayCol, today && styles.todayCol]}>
                {/* Hour lines */}
                {HOURS.map(hour => (
                  <TouchableOpacity
                    key={hour}
                    style={styles.hourSlot}
                    onPress={() => onSlotPress && onSlotPress(day, hour)}
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
                  const height = Math.max(endOffset - startOffset, 20);
                  const eventColor = event.color || EVENT_COLORS[event.event_type] || '#6366f1';

                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={[
                        styles.event,
                        {
                          top: startOffset,
                          height,
                          backgroundColor: eventColor + '30',
                          borderLeftColor: eventColor,
                        },
                      ]}
                      onPress={() => onEventPress && onEventPress(event)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.eventTime, { color: eventColor }]} numberOfLines={1}>
                        {formatTime(start)}
                      </Text>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {event.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Current time indicator */}
                {today && (
                  <View style={[styles.currentLine, { top: currentHourOffset }]}>
                    <View style={styles.currentDot} />
                  </View>
                )}
              </View>
            );
          })}
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
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  timeColHeader: {
    width: TIME_COL_WIDTH,
  },
  dayHeader: {
    width: DAY_WIDTH,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  todayHeader: {
    backgroundColor: colors.todayHighlight,
  },
  dayName: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontWeight: fontWeight.medium,
  },
  dayNum: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  todayText: {
    color: colors.accent,
  },
  todayNum: {
    color: colors.accent,
    fontWeight: fontWeight.bold,
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
    paddingTop: -6,
    paddingRight: spacing.xs,
    alignItems: 'flex-end',
  },
  hourText: {
    fontSize: 9,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  dayCol: {
    width: DAY_WIDTH,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
    position: 'relative',
  },
  todayCol: {
    backgroundColor: colors.todayHighlight,
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
    left: 1,
    right: 1,
    borderLeftWidth: 3,
    borderRadius: borderRadius.sm - 4,
    paddingHorizontal: 3,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  eventTime: {
    fontSize: 8,
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  eventTitle: {
    fontSize: 9,
    color: colors.text,
    fontWeight: fontWeight.medium,
    lineHeight: 12,
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
    left: -4,
    top: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.currentTimeLine,
  },
});
