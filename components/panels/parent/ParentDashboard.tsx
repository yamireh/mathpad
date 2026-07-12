import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  operationColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';
import { useDashboard } from '../../../hooks';
import type { ChildProgress } from '../../../lib/firebase/dashboard';

const pct = (correct: number, total: number) =>
  total > 0 ? Math.round((correct / total) * 100) : 0;

const label = (topic: string) => topic.charAt(0).toUpperCase() + topic.slice(1);

const shortDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

function Stat({ value, caption }: { value: string; caption: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statCaption}>{caption}</Text>
    </View>
  );
}

function ChildCard({ child, index }: { child: ChildProgress; index: number }) {
  const { t } = useTranslation();
  const topics = Object.entries(child.byTopic);
  return (
    <View style={styles.card}>
      <Text style={styles.childName}>{t('dashboard.child', { n: index + 1 })}</Text>
      <View style={styles.stats}>
        <Stat value={String(child.totalSessions)} caption={t('dashboard.sessions')} />
        <Stat value={String(child.totalQuestions)} caption={t('dashboard.questions')} />
        <Stat
          value={`${pct(child.totalCorrect, child.totalQuestions)}%`}
          caption={t('dashboard.accuracy')}
        />
      </View>

      {topics.length > 0 ? (
        <View style={styles.section}>
          {topics.map(([topic, s]) => (
            <View key={topic} style={styles.row}>
              <Text style={styles.rowLabel}>{label(topic)}</Text>
              <Text style={styles.rowValue}>
                {s.correct}/{s.questions} · {pct(s.correct, s.questions)}%
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {child.recent.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.recent')}</Text>
          {child.recent.map((r) => (
            <View key={r.id} style={styles.row}>
              <Text style={styles.rowLabel}>
                {label(r.topic)} · {shortDate(r.completedAt)}
              </Text>
              <Text style={styles.rowValue}>
                {r.correctFirstTry}/{r.totalQuestions}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** The parent progress dashboard — one card per connected child. */
export function ParentDashboard({ familyId }: { familyId: string }) {
  const { t } = useTranslation();
  const { children, loading, error, reload } = useDashboard(familyId);

  if (loading && children.length === 0) {
    return <ActivityIndicator color={operationColors.addition.accent} />;
  }
  if (error) {
    return (
      <Pressable onPress={reload} style={styles.empty}>
        <Text style={styles.emptyText}>{t('dashboard.error')}</Text>
      </Pressable>
    );
  }
  if (children.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bar-chart-outline" size={44} color={colors.textMuted} />
        <Text style={styles.emptyText}>{t('dashboard.empty')}</Text>
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      {children.map((child, i) => (
        <ChildCard key={child.childId} child={child} index={i} />
      ))}
      <Pressable onPress={reload} style={styles.refresh} accessibilityRole="button">
        <Ionicons name="refresh" size={16} color={operationColors.addition.accent} />
        <Text style={styles.refreshText}>{t('dashboard.refresh')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  childName: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: {
    fontSize: typography.size.heading,
    fontWeight: '700',
    color: operationColors.addition.accent,
  },
  statCaption: {
    fontSize: typography.size.caption,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: typography.size.body, color: colors.text },
  rowValue: { fontSize: typography.size.body, color: colors.textMuted },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  refresh: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  refreshText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: operationColors.addition.accent,
  },
});
