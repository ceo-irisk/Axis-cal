import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { updateEvent, deleteEvent } from '../api';
import { format, parseISO, differenceInMinutes } from '../utils/dates';
import GlassCard from '../components/GlassCard';

const EVENT_COLORS = {
  meeting: '#8b5cf6', call: '#06b6d4', personal: '#f59e0b',
  urgent: '#ef4444', travel: '#10b981', deep_work: '#6366f1',
};

const STATUS_LABELS = {
  confirmed: 'Подтверждено', tentative: 'Предварительно',
  template: 'Шаблон', cancelled: 'Отменено',
};

export default function EventDetailScreen({ route, navigation }) {
  const { event } = route.params;
  const [deleting, setDeleting] = useState(false);

  const eventColor = event.color || EVENT_COLORS[event.event_type] || '#6366f1';
  const start = event.start_time ? parseISO(event.start_time) : null;
  const end = event.end_time ? parseISO(event.end_time) : null;
  const duration = start && end ? differenceInMinutes(end, start) : 0;

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Удалить событие?',
      `Вы уверены, что хотите удалить "${event.title}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить', style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteEvent(event.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить событие');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('EditEvent', { event });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {!event.is_recurring_instance && (
          <>
            <TouchableOpacity onPress={handleEdit} style={styles.actionBtn}>
              <Ionicons name="pencil" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
              {deleting ? (
                <ActivityIndicator color={colors.error} size="small" />
              ) : (
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Color bar */}
        <View style={[styles.colorBar, { backgroundColor: eventColor }]} />

        {/* Title */}
        <Text style={styles.title}>{event.title}</Text>

        {/* Status */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: eventColor + '20' }]}>
            <Text style={[styles.statusText, { color: eventColor }]}>
              {STATUS_LABELS[event.status] || event.status}
            </Text>
          </View>
          {event.is_recurring_instance && (
            <View style={styles.recurBadge}>
              <Ionicons name="repeat" size={12} color={colors.accent} />
              <Text style={styles.recurText}>Повторяется</Text>
            </View>
          )}
        </View>

        {/* Time */}
        <GlassCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.secondary} />
            <View style={styles.infoContent}>
              {start && (
                <Text style={styles.infoTitle}>
                  {format(start, 'd MMMM yyyy')}
                </Text>
              )}
              {start && end && (
                <Text style={styles.infoSub}>
                  {format(start, 'HH:mm')} – {format(end, 'HH:mm')} ({Math.floor(duration / 60)}ч {duration % 60}мин)
                </Text>
              )}
            </View>
          </View>
        </GlassCard>

        {/* Location */}
        {event.location ? (
          <GlassCard style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={colors.secondary} />
              <Text style={styles.infoTitle}>{event.location}</Text>
            </View>
          </GlassCard>
        ) : null}

        {/* Description */}
        {event.description ? (
          <GlassCard style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={20} color={colors.secondary} />
              <Text style={styles.descText}>{event.description}</Text>
            </View>
          </GlassCard>
        ) : null}

        {/* Flags */}
        <View style={styles.flagsSection}>
          {event.is_urgent && (
            <View style={styles.flag}>
              <Ionicons name="alert-circle" size={16} color={colors.urgent} />
              <Text style={styles.flagText}>Срочное</Text>
            </View>
          )}
          {event.is_video_call && (
            <View style={styles.flag}>
              <Ionicons name="videocam" size={16} color={colors.call} />
              <Text style={styles.flagText}>Видеозвонок</Text>
            </View>
          )}
          {event.is_blocked && (
            <View style={styles.flag}>
              <Ionicons name="lock-closed" size={16} color={colors.muted} />
              <Text style={styles.flagText}>Заблокировано</Text>
            </View>
          )}
          {event.is_completed && (
            <View style={styles.flag}>
              <Ionicons name="checkmark-circle" size={16} color={colors.confirmed} />
              <Text style={styles.flagText}>Выполнено</Text>
            </View>
          )}
          {event.is_all_day && (
            <View style={styles.flag}>
              <Ionicons name="sunny" size={16} color={colors.personal} />
              <Text style={styles.flagText}>Весь день</Text>
            </View>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  actionBtn: { padding: spacing.sm, marginLeft: spacing.sm },
  content: { flex: 1, paddingHorizontal: spacing.xl },
  colorBar: { height: 4, borderRadius: 2, marginTop: spacing.xl, marginBottom: spacing.lg },
  title: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  statusRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  statusBadge: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  recurBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    backgroundColor: colors.accent + '15', borderRadius: borderRadius.full,
  },
  recurText: { fontSize: fontSize.sm, color: colors.accent },
  infoCard: { marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  infoSub: { fontSize: fontSize.sm, color: colors.secondary, marginTop: 2 },
  descText: { flex: 1, fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  flagsSection: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  flag: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  flagText: { fontSize: fontSize.sm, color: colors.text },
});
