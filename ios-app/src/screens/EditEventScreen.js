import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { updateEvent, getCalendars, getEventTypes } from '../api';
import { setHours, setMinutes, format, parseISO } from '../utils/dates';

export default function EditEventScreen({ route, navigation }) {
  const { event } = route.params;

  const [title, setTitle] = useState(event.title || '');
  const [description, setDescription] = useState(event.description || '');
  const [location, setLocation] = useState(event.location || '');
  const [startTime, setStartTime] = useState(event.start_time ? new Date(event.start_time) : new Date());
  const [endTime, setEndTime] = useState(event.end_time ? new Date(event.end_time) : new Date());
  const [eventType, setEventType] = useState(event.event_type || 'meeting');
  const [calendarId, setCalendarId] = useState(event.calendar_id);
  const [status, setStatus] = useState(event.status || 'confirmed');
  const [isUrgent, setIsUrgent] = useState(event.is_urgent || false);
  const [isVideoCall, setIsVideoCall] = useState(event.is_video_call || false);
  const [isAllDay, setIsAllDay] = useState(event.is_all_day || false);
  const [isBlocked, setIsBlocked] = useState(event.is_blocked || false);
  const [isCompleted, setIsCompleted] = useState(event.is_completed || false);
  const [saving, setSaving] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [calRes, typeRes] = await Promise.all([getCalendars(), getEventTypes()]);
      setCalendars(calRes.data || []);
      setEventTypes(typeRes.data || []);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Укажите название');
      return;
    }
    setSaving(true);
    try {
      await updateEvent(event.id, {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        event_type: eventType,
        calendar_id: calendarId,
        status,
        is_urgent: isUrgent,
        is_video_call: isVideoCall,
        is_all_day: isAllDay,
        is_blocked: isBlocked,
        is_completed: isCompleted,
        timezone: event.timezone || 'Europe/Moscow',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Ошибка сохранения';
      Alert.alert('Ошибка', msg);
    } finally {
      setSaving(false);
    }
  };

  const STATUSES = [
    { key: 'confirmed', label: 'Подтверждено', color: colors.confirmed },
    { key: 'tentative', label: 'Предварительно', color: colors.tentative },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Редактирование</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Сохранить</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Название"
            placeholderTextColor={colors.muted}
          />

          {/* Time */}
          <View style={styles.section}>
            <View style={styles.row}>
              <Ionicons name="time-outline" size={20} color={colors.secondary} />
              <Text style={styles.sectionLabel}>Время</Text>
            </View>
            <View style={styles.timeRow}>
              <View style={styles.timeBtn}>
                <Text style={styles.timeText}>{format(startTime, 'dd.MM.yyyy HH:mm')}</Text>
              </View>
              <Text style={styles.timeSep}>→</Text>
              <View style={styles.timeBtn}>
                <Text style={styles.timeText}>{format(endTime, 'dd.MM.yyyy HH:mm')}</Text>
              </View>
            </View>
          </View>

          {/* Status */}
          <View style={styles.section}>
            <View style={styles.row}>
              <Ionicons name="flag-outline" size={20} color={colors.secondary} />
              <Text style={styles.sectionLabel}>Статус</Text>
            </View>
            <View style={[styles.chipRow, { flexDirection: 'row' }]}>
              {STATUSES.map(s => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.chip, status === s.key && { backgroundColor: s.color + '20', borderColor: s.color }]}
                  onPress={() => setStatus(s.key)}
                >
                  <Text style={[styles.chipText, status === s.key && { color: s.color }]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Описание..."
              placeholderTextColor={colors.muted}
              multiline
            />
          </View>

          {/* Location */}
          <View style={styles.section}>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={20} color={colors.secondary} />
              <TextInput
                style={styles.inlineInput}
                value={location}
                onChangeText={setLocation}
                placeholder="Место"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          {/* Event Type */}
          <View style={styles.section}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {eventTypes.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.chip, eventType === type.name && { backgroundColor: type.color + '30', borderColor: type.color }]}
                  onPress={() => setEventType(type.name)}
                >
                  <View style={[styles.chipDot, { backgroundColor: type.color }]} />
                  <Text style={[styles.chipText, eventType === type.name && { color: type.color }]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Flags */}
          <View style={styles.section}>
            {[
              { key: 'urgent', val: isUrgent, set: setIsUrgent, icon: 'alert-circle-outline', label: 'Срочное', c: colors.urgent },
              { key: 'video', val: isVideoCall, set: setIsVideoCall, icon: 'videocam-outline', label: 'Видеозвонок', c: colors.call },
              { key: 'allday', val: isAllDay, set: setIsAllDay, icon: 'sunny-outline', label: 'Весь день', c: colors.personal },
              { key: 'blocked', val: isBlocked, set: setIsBlocked, icon: 'lock-closed-outline', label: 'Заблокировано', c: colors.muted },
              { key: 'completed', val: isCompleted, set: setIsCompleted, icon: 'checkmark-circle-outline', label: 'Выполнено', c: colors.confirmed },
            ].map(f => (
              <View key={f.key} style={styles.flagRow}>
                <Ionicons name={f.icon} size={20} color={f.c} />
                <Text style={styles.flagLabel}>{f.label}</Text>
                <Switch
                  value={f.val}
                  onValueChange={f.set}
                  trackColor={{ false: colors.surface, true: f.c + '60' }}
                  thumbColor={f.val ? f.c : colors.muted}
                />
              </View>
            ))}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
  saveBtn: { padding: spacing.xs },
  saveBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.accent },
  form: { flex: 1, paddingHorizontal: spacing.xl },
  titleInput: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text,
    paddingVertical: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  section: { paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionLabel: { fontSize: fontSize.md, color: colors.secondary, fontWeight: fontWeight.medium },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  timeBtn: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.sm, padding: spacing.md, alignItems: 'center',
  },
  timeText: { fontSize: fontSize.md, color: colors.text, fontVariant: ['tabular-nums'] },
  timeSep: { color: colors.muted, fontSize: fontSize.lg },
  textArea: { fontSize: fontSize.md, color: colors.text, minHeight: 60, textAlignVertical: 'top' },
  inlineInput: { flex: 1, fontSize: fontSize.md, color: colors.text, marginLeft: spacing.sm },
  chipRow: { marginTop: spacing.md, gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.full, marginRight: spacing.sm, gap: spacing.xs,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: fontSize.sm, color: colors.secondary },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  flagLabel: { flex: 1, fontSize: fontSize.md, color: colors.text },
});
