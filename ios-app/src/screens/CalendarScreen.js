import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import WeekView from '../components/WeekView';
import DayView from '../components/DayView';
import MonthView from '../components/MonthView';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { getEvents } from '../api';
import {
  addWeeks, subWeeks, addDays, addMonths, subMonths,
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  formatMonthYear, formatDate,
} from '../utils/dates';

const VIEW_MODES = [
  { key: 'day', label: 'День', icon: 'today-outline' },
  { key: 'week', label: 'Неделя', icon: 'calendar-outline' },
  { key: 'month', label: 'Месяц', icon: 'grid-outline' },
];

export default function CalendarScreen({ navigation }) {
  const [viewMode, setViewMode] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    } else if (viewMode === 'month') {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    } else {
      return {
        start: currentDate,
        end: currentDate,
      };
    }
  }, [currentDate, viewMode]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const startStr = format(dateRange.start, "yyyy-MM-dd'T'00:00:00");
      const endStr = format(dateRange.end, "yyyy-MM-dd'T'23:59:59");
      const response = await getEvents(startStr, endStr, true);
      const data = Array.isArray(response.data) ? response.data : (response.data?.events || []);
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Refresh when coming back from other screens
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvents();
    });
    return unsubscribe;
  }, [navigation, fetchEvents]);

  const navigatePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMode === 'week') setCurrentDate(d => subWeeks(d, 1));
    else if (viewMode === 'month') setCurrentDate(d => subMonths(d, 1));
    else setCurrentDate(d => addDays(d, -1));
  };

  const navigateNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMode === 'week') setCurrentDate(d => addWeeks(d, 1));
    else if (viewMode === 'month') setCurrentDate(d => addMonths(d, 1));
    else setCurrentDate(d => addDays(d, 1));
  };

  const goToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentDate(new Date());
  };

  const handleEventPress = (event) => {
    navigation.navigate('EventDetail', { event });
  };

  const handleSlotPress = (day, hour) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('CreateEvent', { date: day.toISOString(), hour });
  };

  const handleMonthDayPress = (day) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(day);
    setViewMode('day');
  };

  const headerTitle = useMemo(() => {
    if (viewMode === 'month') return formatMonthYear(currentDate);
    if (viewMode === 'day') return formatDate(currentDate, 'd MMMM yyyy');
    // Week: show range
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
  }, [currentDate, viewMode]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={navigatePrev} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday} style={styles.titleBtn}>
            <Text style={styles.title}>{headerTitle}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateNext} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* View mode switcher */}
        <View style={styles.viewSwitcher}>
          {VIEW_MODES.map(mode => (
            <TouchableOpacity
              key={mode.key}
              style={[styles.viewBtn, viewMode === mode.key && styles.viewBtnActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setViewMode(mode.key);
              }}
            >
              <Text style={[
                styles.viewBtnText,
                viewMode === mode.key && styles.viewBtnTextActive,
              ]}>
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Calendar content */}
      {loading && events.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <>
          {viewMode === 'week' && (
            <WeekView
              currentDate={currentDate}
              events={events}
              onEventPress={handleEventPress}
              onSlotPress={handleSlotPress}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              currentDate={currentDate}
              events={events}
              onEventPress={handleEventPress}
              onSlotPress={handleSlotPress}
            />
          )}
          {viewMode === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={events}
              onDayPress={handleMonthDayPress}
              selectedDate={currentDate}
            />
          )}
        </>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate('CreateEvent', { date: currentDate.toISOString() });
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.background} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navBtn: {
    padding: spacing.sm,
  },
  titleBtn: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textTransform: 'capitalize',
  },
  viewSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: 2,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm - 2,
  },
  viewBtnActive: {
    backgroundColor: colors.surfaceLight,
  },
  viewBtnText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    fontWeight: fontWeight.medium,
  },
  viewBtnTextActive: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
