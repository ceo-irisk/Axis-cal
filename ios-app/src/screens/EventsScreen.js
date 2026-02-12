import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { getEvents } from '../api';
import EventCard from '../components/EventCard';
import { format, addDays, isToday, isSameDay, parseISO } from '../utils/dates';

export default function EventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const now = new Date();
      const startStr = format(now, "yyyy-MM-dd'T'00:00:00");
      const end = addDays(now, 30);
      const endStr = format(end, "yyyy-MM-dd'T'23:59:59");
      const response = await getEvents(startStr, endStr, true);
      const data = Array.isArray(response.data) ? response.data : (response.data?.events || []);
      // Sort by start_time
      data.sort((a, b) => a.start_time.localeCompare(b.start_time));
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchEvents);
    return unsub;
  }, [navigation, fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const dateStr = event.start_time?.substring(0, 10) || 'unknown';
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>События</Text>
        <Text style={styles.headerSub}>Ближайшие 30 дней</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {sortedDates.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyText}>Нет событий</Text>
            </View>
          ) : (
            sortedDates.map(dateStr => {
              const date = new Date(dateStr);
              const today = isToday(date);
              return (
                <View key={dateStr} style={styles.dateGroup}>
                  <View style={styles.dateLabelRow}>
                    <Text style={[styles.dateLabel, today && styles.todayLabel]}>
                      {today ? 'Сегодня' : format(date, 'd MMMM, EEEE')}
                    </Text>
                    <Text style={styles.eventCount}>{groupedEvents[dateStr].length}</Text>
                  </View>
                  {groupedEvents[dateStr].map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onPress={() => navigation.navigate('EventDetail', { event })}
                    />
                  ))}
                </View>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSub: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { flex: 1, paddingHorizontal: spacing.lg },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyText: { fontSize: fontSize.lg, color: colors.muted },
  dateGroup: { marginTop: spacing.xl },
  dateLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.secondary,
    textTransform: 'capitalize',
  },
  todayLabel: { color: colors.accent },
  eventCount: {
    fontSize: fontSize.xs,
    color: colors.muted,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
});
