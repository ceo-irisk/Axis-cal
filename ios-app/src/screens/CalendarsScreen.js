import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { getCalendars, createCalendar, deleteCalendar, getCalendarPermissions } from '../api';
import GlassCard from '../components/GlassCard';

export default function CalendarsScreen({ navigation }) {
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchCalendars = useCallback(async () => {
    try {
      const res = await getCalendars();
      setCalendars(res.data || []);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCalendars(); }, [fetchCalendars]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchCalendars);
    return unsub;
  }, [navigation, fetchCalendars]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await createCalendar({
        name: newName.trim(),
        provider: 'custom',
        color: '#6366f1',
        icon: 'calendar',
        is_public: true,
        is_active: true,
        sync_enabled: false,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewName('');
      setShowAdd(false);
      fetchCalendars();
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось создать календарь');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (cal) => {
    if (cal.is_default) {
      Alert.alert('Нельзя', 'Нельзя удалить календарь по умолчанию');
      return;
    }
    Alert.alert('Удалить?', `Удалить календарь "${cal.name}"?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCalendar(cal.id);
            fetchCalendars();
          } catch (e) {
            Alert.alert('Ошибка', 'Не удалось удалить');
          }
        }
      }
    ]);
  };

  const ownCalendars = calendars.filter(c => c.is_own !== false);
  const sharedCalendars = calendars.filter(c => c.is_own === false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Календари</Text>
        <TouchableOpacity
          onPress={() => { setShowAdd(!showAdd); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={styles.addBtn}
        >
          <Ionicons name={showAdd ? 'close' : 'add'} size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Add form */}
      {showAdd && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.addInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Название календаря"
            placeholderTextColor={colors.muted}
            autoFocus
          />
          <TouchableOpacity onPress={handleAdd} disabled={adding} style={styles.addSaveBtn}>
            {adding ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Text style={styles.addSaveBtnText}>Создать</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCalendars(); }} tintColor={colors.accent} />
          }
        >
          {/* Own calendars */}
          <Text style={styles.sectionTitle}>Мои календари</Text>
          {ownCalendars.map(cal => (
            <GlassCard key={cal.id} style={styles.calCard}>
              <View style={styles.calRow}>
                <View style={[styles.calIcon, { backgroundColor: (cal.color || '#6366f1') + '20' }]}>
                  <Ionicons
                    name={cal.is_public === false ? 'lock-closed' : 'calendar'}
                    size={20}
                    color={cal.color || '#6366f1'}
                  />
                </View>
                <View style={styles.calInfo}>
                  <Text style={styles.calName}>{cal.name}</Text>
                  <Text style={styles.calMeta}>
                    {cal.is_default ? 'По умолчанию' : cal.provider}
                    {cal.is_public === false ? ' • Закрытый' : ' • Открытый'}
                  </Text>
                </View>
                {!cal.is_default && (
                  <TouchableOpacity onPress={() => handleDelete(cal)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </GlassCard>
          ))}

          {/* Shared calendars */}
          {sharedCalendars.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Общие календари</Text>
              {sharedCalendars.map(cal => (
                <GlassCard key={cal.id} style={styles.calCard}>
                  <View style={styles.calRow}>
                    <View style={[styles.calIcon, { backgroundColor: (cal.color || '#94a3b8') + '20' }]}>
                      <Ionicons name="people" size={20} color={cal.color || '#94a3b8'} />
                    </View>
                    <View style={styles.calInfo}>
                      <Text style={styles.calName}>{cal.name}</Text>
                      <Text style={styles.calMeta}>
                        {cal.owner?.name || 'Неизвестный'} • {cal.permission_level}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              ))}
            </>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  addBtn: { padding: spacing.sm },
  addForm: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  addInput: {
    flex: 1, fontSize: fontSize.md, color: colors.text,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, height: 42,
  },
  addSaveBtn: {
    backgroundColor: colors.accent, paddingHorizontal: spacing.lg, height: 42,
    borderRadius: borderRadius.sm, justifyContent: 'center',
  },
  addSaveBtnText: { color: colors.text, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { flex: 1, paddingHorizontal: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.md,
  },
  calCard: { marginBottom: spacing.sm },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  calIcon: {
    width: 40, height: 40, borderRadius: borderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  calInfo: { flex: 1 },
  calName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  calMeta: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  deleteBtn: { padding: spacing.sm },
});
