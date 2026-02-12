import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { formatTime, parseISO } from '../utils/dates';

const EVENT_COLORS = {
  meeting: '#8b5cf6',
  call: '#06b6d4',
  personal: '#f59e0b',
  urgent: '#ef4444',
  travel: '#10b981',
  deep_work: '#6366f1',
  external: '#94a3b8',
};

export default function EventCard({ event, onPress, compact = false }) {
  const eventColor = event.color || EVENT_COLORS[event.event_type] || '#6366f1';
  const startTime = event.start_time ? formatTime(parseISO(event.start_time)) : '';
  const endTime = event.end_time ? formatTime(parseISO(event.end_time)) : '';
  const isTentative = event.status === 'tentative';

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compact, { borderLeftColor: eventColor }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.compactTime}>{startTime}</Text>
        <Text style={styles.compactTitle} numberOfLines={1}>{event.title}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: eventColor }, isTentative && styles.tentative]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: eventColor }]} />
        <Text style={styles.time}>{startTime} – {endTime}</Text>
        {event.is_urgent && <Ionicons name="alert-circle" size={14} color={colors.urgent} />}
        {event.is_video_call && <Ionicons name="videocam" size={14} color={colors.call} />}
        {event.is_blocked && <Ionicons name="lock-closed" size={14} color={colors.muted} />}
        {event.is_completed && <Ionicons name="checkmark-circle" size={14} color={colors.confirmed} />}
      </View>
      <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
      {event.location ? (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={colors.muted} />
          <Text style={styles.location} numberOfLines={1}>{event.location}</Text>
        </View>
      ) : null}
      {event.is_recurring_instance && (
        <Ionicons name="repeat" size={12} color={colors.muted} style={{ marginTop: 2 }} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tentative: {
    borderStyle: 'dashed',
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  location: {
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: 2,
    gap: spacing.sm,
  },
  compactTime: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    fontWeight: fontWeight.medium,
    width: 40,
  },
  compactTitle: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
});
