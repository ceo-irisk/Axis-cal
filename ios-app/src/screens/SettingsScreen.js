import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { useAuth } from '../auth/AuthContext';
import {
  getRules, getEventTypes, getEventStatuses, getTemplates,
  deleteRule, deleteTemplate, deleteEventType,
} from '../api';
import GlassCard from '../components/GlassCard';

export default function SettingsScreen({ navigation }) {
  const { user, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [rules, setRules] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [eventStatuses, setEventStatuses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, typesRes, statusesRes, templatesRes] = await Promise.all([
        getRules(), getEventTypes(), getEventStatuses(), getTemplates(),
      ]);
      setRules(rulesRes.data || []);
      setEventTypes(typesRes.data || []);
      setEventStatuses(statusesRes.data || []);
      setTemplates(templatesRes.data || []);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: logout },
    ]);
  };

  const TABS = [
    { key: 'profile', label: 'Профиль', icon: 'person-outline' },
    { key: 'rules', label: 'Правила', icon: 'shield-outline' },
    { key: 'dicts', label: 'Справочники', icon: 'book-outline' },
    { key: 'templates', label: 'Шаблоны', icon: 'copy-outline' },
  ];

  const RULE_TYPE_LABELS = {
    max_meetings: 'Максимум встреч',
    min_break: 'Мин. перерыв',
    max_hours: 'Макс. раб. часов',
  };

  const RULE_UNITS = {
    max_meetings: 'встреч',
    min_break: 'минут',
    max_hours: 'часов',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Настройки</Text>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? colors.accent : colors.muted}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Profile */}
            {activeTab === 'profile' && (
              <View>
                <GlassCard style={styles.profileCard}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={styles.profileName}>{user?.name}</Text>
                  <Text style={styles.profileEmail}>{user?.email}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
                  </View>
                </GlassCard>

                <GlassCard style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Ionicons name="globe-outline" size={18} color={colors.secondary} />
                    <Text style={styles.infoLabel}>Часовой пояс</Text>
                    <Text style={styles.infoValue}>{user?.timezone || 'Europe/Moscow'}</Text>
                  </View>
                </GlassCard>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={20} color={colors.error} />
                  <Text style={styles.logoutText}>Выйти из аккаунта</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Rules */}
            {activeTab === 'rules' && (
              <View>
                <Text style={styles.sectionTitle}>Правила дня</Text>
                {rules.length === 0 ? (
                  <Text style={styles.emptyText}>Нет правил</Text>
                ) : (
                  rules.map(rule => (
                    <GlassCard key={rule.id} style={styles.itemCard}>
                      <View style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{rule.name}</Text>
                          <Text style={styles.itemMeta}>
                            {RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}: {rule.value} {RULE_UNITS[rule.rule_type] || ''}
                          </Text>
                        </View>
                        {isAdmin() && (
                          <TouchableOpacity
                            onPress={() => {
                              Alert.alert('Удалить?', '', [
                                { text: 'Отмена', style: 'cancel' },
                                { text: 'Удалить', style: 'destructive', onPress: async () => {
                                  await deleteRule(rule.id);
                                  loadData();
                                }},
                              ]);
                            }}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </GlassCard>
                  ))
                )}
              </View>
            )}

            {/* Dictionaries */}
            {activeTab === 'dicts' && (
              <View>
                <Text style={styles.sectionTitle}>Типы событий</Text>
                {eventTypes.map(type => (
                  <GlassCard key={type.id} style={styles.itemCard}>
                    <View style={styles.itemRow}>
                      <View style={[styles.colorDot, { backgroundColor: type.color }]} />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{type.label}</Text>
                        <Text style={styles.itemMeta}>{type.name}</Text>
                      </View>
                    </View>
                  </GlassCard>
                ))}

                <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Статусы</Text>
                {eventStatuses.map(status => (
                  <GlassCard key={status.id} style={styles.itemCard}>
                    <View style={styles.itemRow}>
                      <View style={[styles.colorDot, { backgroundColor: status.color }]} />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{status.label}</Text>
                        <Text style={styles.itemMeta}>{status.name}</Text>
                      </View>
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {/* Templates */}
            {activeTab === 'templates' && (
              <View>
                <Text style={styles.sectionTitle}>Шаблоны</Text>
                {templates.length === 0 ? (
                  <Text style={styles.emptyText}>Нет шаблонов</Text>
                ) : (
                  templates.map(tmpl => (
                    <GlassCard key={tmpl.id} style={styles.itemCard}>
                      <View style={styles.itemRow}>
                        <Ionicons name="copy-outline" size={20} color={colors.accent} />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{tmpl.name}</Text>
                          <Text style={styles.itemMeta}>
                            {tmpl.template_type === 'day' ? 'Дневной' : 'Недельный'} • {tmpl.events?.length || 0} событий
                          </Text>
                        </View>
                        {isAdmin() && (
                          <TouchableOpacity onPress={async () => {
                            Alert.alert('Удалить?', '', [
                              { text: 'Отмена', style: 'cancel' },
                              { text: 'Удалить', style: 'destructive', onPress: async () => {
                                await deleteTemplate(tmpl.id);
                                loadData();
                              }},
                            ]);
                          }}>
                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </GlassCard>
                  ))
                )}
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  tabBar: {
    flexGrow: 0,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginRight: spacing.sm,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.accent },
  tabText: { fontSize: fontSize.sm, color: colors.muted, fontWeight: fontWeight.medium },
  tabTextActive: { color: colors.accent },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.md,
  },
  emptyText: { color: colors.muted, fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.xl },
  profileCard: { alignItems: 'center', marginTop: spacing.xl, paddingVertical: spacing.xxl },
  avatarCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent + '20',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  avatarText: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.accent },
  profileName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  profileEmail: { fontSize: fontSize.md, color: colors.secondary, marginTop: spacing.xs },
  roleBadge: {
    marginTop: spacing.md, backgroundColor: colors.accent + '15',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
  },
  roleText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: 1 },
  infoCard: { marginTop: spacing.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  infoLabel: { flex: 1, fontSize: fontSize.md, color: colors.text },
  infoValue: { fontSize: fontSize.md, color: colors.secondary },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md,
    marginTop: spacing.xxxl, paddingVertical: spacing.lg,
    backgroundColor: colors.error + '10', borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.error + '30',
  },
  logoutText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.error },
  itemCard: { marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  itemMeta: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
});
