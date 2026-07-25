/**
 * SetGoalDialog — parent sets a child's practice goal for a period: a total
 * question count plus optional per-topic minimums. One goal per period.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Chip } from '../../ui';
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';
import type { RewardPeriod, RewardTarget } from '../../../lib/rewards';
import { DEFAULT_WEEK_START } from '../../../lib/rewards';

/** Topics a per-topic breakdown can target. */
const TOPICS = ['addition', 'subtraction', 'multiplication', 'division'] as const;

const PERIODS: RewardPeriod[] = ['daily', 'weekly', 'monthly'];

function periodLabel(t: (k: string) => string, p: RewardPeriod): string {
  return t(
    p === 'daily'
      ? 'rewards.periodDaily'
      : p === 'weekly'
        ? 'rewards.periodWeekly'
        : 'rewards.periodMonthly',
  );
}

/** A tiny −/value/+ stepper. */
function Stepper({
  value,
  onChange,
  step = 10,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('a11y.decrease')}
        hitSlop={8}
        onPress={() => onChange(Math.max(min, value - step))}
        style={styles.stepBtn}
      >
        <Ionicons name="remove" size={18} color={colors.text} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('a11y.increase')}
        hitSlop={8}
        onPress={() => onChange(value + step)}
        style={styles.stepBtn}
      >
        <Ionicons name="add" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

export interface SetGoalDialogProps {
  visible: boolean;
  /** Existing goal to edit, or null for a new one. */
  initial: RewardTarget | null;
  onSave: (target: RewardTarget) => void;
  onCancel: () => void;
  /** Topic display label. */
  topicLabel: (topic: string) => string;
}

export function SetGoalDialog({
  visible,
  initial,
  onSave,
  onCancel,
  topicLabel,
}: SetGoalDialogProps) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<RewardPeriod>(initial?.period ?? 'weekly');
  const [byTopic, setByTopic] = useState<Record<string, number>>(
    initial?.goal.byTopic ?? {},
  );

  const setTopic = (topic: string, v: number) =>
    setByTopic((prev) => ({ ...prev, [topic]: v }));

  // The overall goal is the SUM of the per-topic targets — never set directly.
  const total = TOPICS.reduce((sum, topic) => sum + (byTopic[topic] ?? 0), 0);
  const canSave = total > 0;

  const save = () => {
    const cleanedTopics = Object.fromEntries(
      TOPICS.map((topic) => [topic, byTopic[topic] ?? 0]).filter(
        ([, v]) => (v as number) > 0,
      ),
    );
    onSave({
      period,
      goal: { total, byTopic: cleanedTopics },
      weekStart: DEFAULT_WEEK_START,
      active: true,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.title}>
            {t('rewards.goalTitle', { period: periodLabel(t, period) })}
          </Text>

          <View style={styles.chipRow}>
            {PERIODS.map((p) => (
              <Chip
                key={p}
                label={periodLabel(t, p)}
                selected={period === p}
                onPress={() => setPeriod(p)}
                tone={colors.answerInk}
              />
            ))}
          </View>

          <Text style={styles.sectionLabel}>{t('rewards.perTopic')}</Text>
          {TOPICS.map((topic) => (
            <View key={topic} style={styles.field}>
              <Text style={styles.fieldLabel}>{topicLabel(topic)}</Text>
              <Stepper
                value={byTopic[topic] ?? 0}
                onChange={(v) => setTopic(topic, v)}
                step={10}
                min={0}
              />
            </View>
          ))}

          {/* Total is the sum of the per-topic targets — shown, not set. */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('rewards.goalTotal')}</Text>
            <Text style={styles.totalValue}>{total}</Text>
          </View>

          <View style={styles.actions}>
            <Button
              label={t('rewards.save')}
              variant="primary"
              disabled={!canSave}
              onPress={save}
            />
            <Button label={t('rewards.cancel')} variant="secondary" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 40, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadows.lg,
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  fieldLabel: {
    fontSize: typography.size.body,
    color: colors.text,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 44,
    textAlign: 'center',
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  totalValue: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.answerInk,
    fontVariant: ['tabular-nums'],
  },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
