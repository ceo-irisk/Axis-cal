import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { createEvent, getCalendars, getEventTypes } from '../api';
import { setHours, setMinutes, addHours, format, parseISO } from '../utils/dates';

export default function CreateEventScreen({ route, navigation }) {
  const { date, hour = 9 } = route.params || {};
  const initialDate = date ? new Date(date) : new Date();
  const startDate = setMinutes(setHours(initialDate, hour), 0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState(startDate);
  const [endTime, setEndTime] = useState(addHours(startDate, 1));
  const [eventType, setEventType] = useState('meeting');
  const [calendarId, setCalendarId] = useState(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [calRes, typeRes] = await Promise.all([
        getCalendars(),
        getEventTypes(),
      ]);
      setCalendars(calRes.data || []);
      setEventTypes(typeRes.data || []);
      // Set default calendar
      const defaultCal = (calRes.data || []).find(c => c.is_default && c.is_public);
      if (defaultCal) setCalendarId(defaultCal.id);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Укажите название события');
      return;
    }
    if (startTime >= endTime) {
      Alert.alert('Ошибка', 'Время начала должно быть раньше времени окончания');
      return;
    }

    setSaving(true);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        event_type: eventType,
        calendar_id: calendarId,
        is_urgent: isUrgent,
        is_video_call: isVideoCall,
        is_all_day: isAllDay,
        status: 'confirmed',
        timezone: 'Europe/Moscow',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Ошибка создания';
      Alert.alert('Ошибка', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Новое событие</Text>
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
          {/* Title */}
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Название"
            placeholderTextColor={colors.muted}
            autoFocus
          />

          {/* Time section */}
          <View style={styles.section}>
            <View style={styles.row}>
              <Ionicons name="time-outline" size={20} color={colors.secondary} />
              <Text style={styles.sectionLabel}>Время</Text>
            </View>
            
            <View style={styles.timeRow}>
              <TouchableOpacity 
                style={styles.timeBtn}
                onPress={() => setShowStartPicker(!showStartPicker)}
              >
                <Text style={styles.timeText}>{format(startTime, 'dd.MM.yyyy HH:mm')}</Text>
              </TouchableOpacity>
              <Text style={styles.timeSep}>→</Text>
              <TouchableOpacity 
                style={styles.timeBtn}
                onPress={() => setShowEndPicker(!showEndPicker)}
              >
                <Text style={styles.timeText}>{format(endTime, 'dd.MM.yyyy HH:mm')}</Text>
              </TouchableOpacity>
            </View>

            {showStartPicker && (
              <DateTimePicker
                value={startTime}
                mode="datetime"
                display="spinner"
                onChange={(e, d) => {
                  if (d) setStartTime(d);
                  if (Platform.OS === 'android') setShowStartPicker(false);
                }}
                textColor={colors.text}
                themeVariant="dark"
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endTime}
                mode="datetime"
                display="spinner"
                onChange={(e, d) => {
                  if (d) setEndTime(d);
                  if (Platform.OS === 'android') setShowEndPicker(false);
                }}
                textColor={colors.text}
                themeVariant="dark"
              />
            )}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <View style={styles.row}>
              <Ionicons name="document-text-outline" size={20} color={colors.secondary} />
              <Text style={styles.sectionLabel}>Описание</Text>
            </View>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Добавить описание..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
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
            <View style={styles.row}>
              <Ionicons name="pricetag-outline" size={20} color={colors.secondary} />
              <Text style={styles.sectionLabel}>Тип события</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {eventTypes.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.chip, eventType === type.name && { backgroundColor: type.color + '30', borderColor: type.color }]}
                  onPress={() => setEventType(type.name)}
                >
                  <View style={[styles.chipDot, { backgroundColor: type.color }]} />
                  <Text style={[styles.chipText, eventType === type.name && { color: type.color }]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Calendar */}
          {calendars.length > 0 && (
            <View style={styles.section}>
              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={20} color={colors.secondary} />
                <Text style={styles.sectionLabel}>Календарь</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {calendars.filter(c => c.is_own !== false).map(cal => (
                  <TouchableOpacity
                    key={cal.id}
                    style={[styles.chip, calendarId === cal.id && styles.chipActive]}
                    onPress={() => setCalendarId(cal.id)}
                  >
                    <Text style={[styles.chipText, calendarId === cal.id && styles.chipTextActive]}>
                      {cal.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Flags */}
          <View style={styles.section}>
            <View style={styles.flagRow}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.urgent} />
              <Text style={styles.flagLabel}>Срочное</Text>
              <Switch
                value={isUrgent}
                onValueChange={setIsUrgent}
                trackColor={{ false: colors.surface, true: colors.urgent + '60' }}
                thumbColor={isUrgent ? colors.urgent : colors.muted}
              />
            </View>
            <View style={styles.flagRow}>
              <Ionicons name="videocam-outline" size={20} color={colors.call} />
              <Text style={styles.flagLabel}>Видеозвонок</Text>
              <Switch
                value={isVideoCall}
                onValueChange={setIsVideoCall}
                trackColor={{ false: colors.surface, true: colors.call + '60' }}
                thumbColor={isVideoCall ? colors.call : colors.muted}
              />
            </View>
            <View style={styles.flagRow}>
              <Ionicons name="sunny-outline" size={20} color={colors.personal} />
              <Text style={styles.flagLabel}>Весь день</Text>
              <Switch
                value={isAllDay}
                onValueChange={setIsAllDay}
                trackColor={{ false: colors.surface, true: colors.personal + '60' }}
                thumbColor={isAllDay ? colors.personal : colors.muted}
              />
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  saveBtn: { padding: spacing.xs },
  saveBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
  form: { flex: 1, paddingHorizontal: spacing.xl },
  titleInput: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  section: {
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    color: colors.secondary,
    fontWeight: fontWeight.medium,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  timeBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    alignItems: 'center',
  },
  timeText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  timeSep: {
    color: colors.muted,
    fontSize: fontSize.lg,
  },
  textArea: {
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inlineInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  chipRow: {
    marginTop: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: fontSize.sm, color: colors.secondary },
  chipTextActive: { color: colors.accent },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  flagLabel: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
});
