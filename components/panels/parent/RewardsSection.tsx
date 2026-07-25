/**
 * RewardsSection — Parent Pro Targets & Stars for one child, shown inside the
 * dashboard's expanded child card. Displays stars (earned + to spend), each
 * active goal with live progress, and lets the parent set/edit a goal or redeem
 * stars. Hidden entirely unless `PARENT_PRO_ENABLED`.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../../ui';
import {
  colors,
  operationColors,
  radius,
  spacing,
  typography,
} from '../../../constants/design';
import { PARENT_PRO_ENABLED } from '../../../lib/featureFlags';
import { useAuthUser, useChildRewards } from '../../../hooks';
import {
  goalMet,
  progressInWindow,
  windowFor,
  type RewardTarget,
  type SessionLike,
} from '../../../lib/rewards';
import type { StoredTarget } from '../../../lib/firebase/rewards';
import { SetGoalDialog } from './SetGoalDialog';

function periodLabel(t: (k: string) => string, p: string): string {
  return t(
    p === 'daily'
      ? 'rewards.periodDaily'
      : p === 'weekly'
        ? 'rewards.periodWeekly'
        : 'rewards.periodMonthly',
  );
}

/** One goal row: its current-window progress bar + met state. */
function GoalRow({
  target,
  sessions,
  onEdit,
}: {
  target: StoredTarget;
  sessions: SessionLike[];
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const window = windowFor(target.period, new Date(), target.weekStart);
  const progress = progressInWindow(sessions, window);
  const met = goalMet(target.goal, progress);
  const frac = Math.min(1, progress.total / Math.max(1, target.goal.total));
  return (
    <Pressable onPress={onEdit} style={styles.goal} accessibilityRole="button">
      <View style={styles.goalHead}>
        <Text style={styles.goalPeriod}>{periodLabel(t, target.period)}</Text>
        <Text style={[styles.goalProgress, met && styles.goalMet]}>
          {met
            ? t('rewards.met')
            : t('rewards.progress', {
                current: progress.total,
                total: target.goal.total,
              })}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { flex: frac, backgroundColor: met ? colors.correct : colors.answerInk },
          ]}
        />
        <View style={{ flex: 1 - frac }} />
      </View>
    </Pressable>
  );
}

/** Redeem dialog — spend stars from the balance with an optional note. */
function RedeemDialog({
  visible,
  balance,
  onRedeem,
  onCancel,
}: {
  visible: boolean;
  balance: number;
  onRedeem: (amount: number, note?: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState('');
  const clamped = Math.max(1, Math.min(amount, balance));
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.dialogTitle}>{t('rewards.redeemTitle')}</Text>
          <Text style={styles.balance}>{t('rewards.redeemBalance', { n: balance })}</Text>

          <Text style={styles.fieldLabel}>{t('rewards.redeemHowMany')}</Text>
          <View style={styles.stepper}>
            <Pressable
              hitSlop={8}
              accessibilityLabel={t('a11y.decrease')}
              onPress={() => setAmount((a) => Math.max(1, a - 1))}
              style={styles.stepBtn}
            >
              <Ionicons name="remove" size={18} color={colors.text} />
            </Pressable>
            <Text style={styles.stepValue}>{clamped}</Text>
            <Pressable
              hitSlop={8}
              accessibilityLabel={t('a11y.increase')}
              onPress={() => setAmount((a) => Math.min(balance, a + 1))}
              style={styles.stepBtn}
            >
              <Ionicons name="add" size={18} color={colors.text} />
            </Pressable>
          </View>

          <TextInput
            style={styles.noteInput}
            placeholder={t('rewards.redeemNote')}
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
          />

          <View style={styles.dialogActions}>
            <Button
              label={t('rewards.redeemConfirm', { n: clamped })}
              variant="primary"
              onPress={() => onRedeem(clamped, note.trim() || undefined)}
            />
            <Button label={t('rewards.cancel')} variant="secondary" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export interface RewardsSectionProps {
  familyId: string;
  childId: string;
  /** The child's recent sessions (for live goal progress). */
  sessions: SessionLike[];
  /** Topic display label. */
  topicLabel: (topic: string) => string;
}

export function RewardsSection({
  familyId,
  childId,
  sessions,
  topicLabel,
}: RewardsSectionProps) {
  const { t } = useTranslation();
  const { user } = useAuthUser();
  const { summary, targets, saveGoal, redeem } = useChildRewards(familyId, childId);
  const [editing, setEditing] = useState<RewardTarget | null | undefined>(undefined);
  const [redeeming, setRedeeming] = useState(false);

  // Built dark until the subscription ships.
  if (!PARENT_PRO_ENABLED) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('rewards.title')}</Text>
        <View style={styles.stars}>
          <View style={styles.starStat}>
            <Ionicons name="star" size={16} color={operationColors.mix.tint} />
            <Text style={styles.starValue}>{summary.starsLifetime}</Text>
            <Text style={styles.starCaption}>{t('rewards.starsEarned')}</Text>
          </View>
          <View style={styles.starStat}>
            <Ionicons name="star" size={16} color="#F5B301" />
            <Text style={styles.starValue}>{summary.starsBalance}</Text>
            <Text style={styles.starCaption}>{t('rewards.starsToSpend')}</Text>
          </View>
        </View>
      </View>

      {targets.length === 0 ? (
        <Text style={styles.empty}>{t('rewards.noGoals')}</Text>
      ) : (
        targets.map((target) => (
          <GoalRow
            key={target.id}
            target={target}
            sessions={sessions}
            onEdit={() => setEditing(target)}
          />
        ))
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={() => setEditing(null)}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.action}
        >
          <Ionicons name="flag-outline" size={14} color={colors.answerInk} />
          <Text style={styles.actionText}>{t('rewards.setGoal')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setRedeeming(true)}
          disabled={summary.starsBalance <= 0}
          accessibilityRole="button"
          hitSlop={8}
          style={[styles.action, summary.starsBalance <= 0 && styles.actionDisabled]}
        >
          <Ionicons name="gift-outline" size={14} color={colors.answerInk} />
          <Text style={styles.actionText}>{t('rewards.redeem')}</Text>
        </Pressable>
      </View>

      {editing !== undefined ? (
        <SetGoalDialog
          visible
          initial={editing}
          topicLabel={topicLabel}
          onCancel={() => setEditing(undefined)}
          onSave={(target) => {
            void saveGoal(target);
            setEditing(undefined);
          }}
        />
      ) : null}

      <RedeemDialog
        visible={redeeming}
        balance={summary.starsBalance}
        onCancel={() => setRedeeming(false)}
        onRedeem={(amount, note) => {
          if (user) void redeem(amount, user.uid, note);
          setRedeeming(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  stars: { flexDirection: 'row', gap: spacing.lg },
  starStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starValue: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  starCaption: { fontSize: typography.size.caption, color: colors.textMuted },
  empty: { fontSize: typography.size.body, color: colors.textMuted },
  goal: { gap: spacing.xs, paddingVertical: spacing.xs },
  goalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalPeriod: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  goalProgress: { fontSize: typography.size.caption, color: colors.textMuted },
  goalMet: { color: colors.correct, fontWeight: typography.weight.medium },
  track: {
    flexDirection: 'row',
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: { borderRadius: radius.pill },
  actions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionDisabled: { opacity: 0.4 },
  actionText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.answerInk,
  },
  // Redeem dialog
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 40, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  dialogTitle: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  balance: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: typography.size.body,
    color: colors.text,
    marginTop: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 44,
    textAlign: 'center',
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.body,
    color: colors.text,
    marginTop: spacing.sm,
  },
  dialogActions: { gap: spacing.sm, marginTop: spacing.md },
});
