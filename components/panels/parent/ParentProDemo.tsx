import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  colors,
  operationColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';
import { Button, Chip, type IoniconName } from '../../ui';
import { Avatar, childColor, StatBadge } from './kit';

const noop = () => {};

const ACCENT = operationColors.multiplication.accent; // Parent Pro purple

/** The three parent-mode sections — mirrors the dashboard tabs. */
export const SECTIONS = ['progress', 'goals', 'practice'] as const;
export type ParentProSection = (typeof SECTIONS)[number];

const SECTION_ICON: Record<ParentProSection, IoniconName> = {
  progress: 'stats-chart',
  goals: 'star',
  practice: 'document-text',
};

export interface ParentProDemoProps {
  /** Stage width in px. */
  width: number;
  /** Which section to show (0..2). */
  index: number;
}

/**
 * "See what's included" — a tap-through preview of Parent Pro, one section per
 * page (Progress · Goals · Practice), built from the REAL dashboard primitives
 * so it looks exactly like the app. Static (navigation is driven by the caller).
 */
export function ParentProDemo({ width, index }: ParentProDemoProps) {
  const { t } = useTranslation();
  const section = SECTIONS[Math.max(0, Math.min(index, SECTIONS.length - 1))];

  return (
    <View style={styles.wrap}>
      <View style={styles.chip}>
        <Ionicons name={SECTION_ICON[section]} size={18} color={ACCENT} />
        <Text style={styles.chipText}>{t(`parentPro.demo.${section}.title`)}</Text>
      </View>

      <View style={[styles.stage, { width }]}>
        {section === 'progress' ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Avatar name="Sara" index={0} size={40} />
              <Text style={styles.name}>Sara</Text>
              <View style={styles.spacer} />
              <Text style={[styles.pct, { color: childColor(0) }]}>85%</Text>
            </View>
            <View style={styles.stats}>
              <StatBadge
                icon="albums-outline"
                iconColor={operationColors.addition.accent}
                background={operationColors.addition.tint}
                value="24"
                valueColor={operationColors.addition.accent}
                caption={t('dashboard.sessions')}
              />
              <StatBadge
                icon="help-circle-outline"
                iconColor={operationColors.multiplication.accent}
                background={operationColors.multiplication.tint}
                value="240"
                valueColor={operationColors.multiplication.accent}
                caption={t('dashboard.questions')}
              />
              <StatBadge
                icon="ribbon-outline"
                iconColor={colors.correct}
                background="#E6F7EC"
                value="85%"
                valueColor={colors.correct}
                caption={t('dashboard.accuracy')}
              />
            </View>
          </View>
        ) : section === 'goals' ? (
          <View style={styles.card}>
            {/* Set a goal (snapshot of the real dialog) */}
            <Text style={styles.cardTitle}>{t('rewards.setGoal')}</Text>
            <View style={styles.chipRow}>
              <Chip label={t('rewards.periodDaily')} selected={false} onPress={noop} tone={ACCENT} />
              <Chip label={t('rewards.periodWeekly')} selected onPress={noop} tone={ACCENT} />
              <Chip label={t('rewards.periodMonthly')} selected={false} onPress={noop} tone={ACCENT} />
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('rewards.goalTotal')}</Text>
              <Text style={styles.totalValue}>4</Text>
            </View>
            <Button
              label={t('rewards.setGoal')}
              icon="flag"
              tone={ACCENT}
              onPress={noop}
            />

            <View style={styles.divider} />

            {/* …then kids earn stars toward it */}
            <View style={styles.stats}>
              <StatBadge
                icon="star"
                iconColor="#F5B301"
                background="#FFF7E6"
                value="24"
                caption={t('rewards.starsEarned')}
              />
              <StatBadge
                icon="gift"
                iconColor={colors.correct}
                background="#EAF7EE"
                value="12"
                caption={t('rewards.starsToSpend')}
              />
            </View>
            <View style={styles.goal}>
              <View style={styles.goalHead}>
                <Text style={styles.goalPeriod}>{t('parentPro.demo.goals.goal')}</Text>
                <Text style={styles.goalMet}>{t('rewards.met')}</Text>
              </View>
              <View style={styles.track}>
                <View style={styles.fill} />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            {/* Create a practice set (snapshot of the real dialog) */}
            <Text style={styles.cardTitle}>{t('exams.createTitle')}</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('exams.name')}</Text>
              <Text style={styles.fieldValue}>{t('parentPro.demo.practice.exam')}</Text>
            </View>
            {/* Random or custom */}
            <View style={styles.chipRow}>
              <Chip label={t('exams.modeRandom')} selected onPress={noop} tone={ACCENT} />
              <Chip label={t('exams.modeCustom')} selected={false} onPress={noop} tone={ACCENT} />
            </View>
            {/* Topic + question count */}
            <View style={styles.chipRow}>
              <Chip label={t('operations.addition')} selected onPress={noop} tone={operationColors.addition.accent} />
              <Chip label={t('operations.subtraction')} selected={false} onPress={noop} tone={operationColors.addition.accent} />
              <Chip label={t('operations.multiplication')} selected={false} onPress={noop} tone={operationColors.addition.accent} />
            </View>
            <View style={styles.chipRow}>
              <Chip label="5" selected={false} onPress={noop} tone={ACCENT} />
              <Chip label="10" selected onPress={noop} tone={ACCENT} />
              <Chip label="15" selected={false} onPress={noop} tone={ACCENT} />
              <Chip label="20" selected={false} onPress={noop} tone={ACCENT} />
            </View>
            {/* Assign to any child */}
            <Text style={styles.fieldLabel}>{t('exams.assignTo')}</Text>
            <View style={styles.chipRow}>
              <Chip label="Sara" selected onPress={noop} tone={ACCENT} />
              <Chip label="Leo" selected onPress={noop} tone={ACCENT} />
            </View>
            <Button
              label={t('exams.save')}
              icon="add"
              tone={ACCENT}
              onPress={noop}
            />

            <View style={styles.divider} />

            {/* …then see how each child scored */}
            <View style={styles.resultRow}>
              <Avatar name="Sara" index={0} size={30} />
              <Text style={styles.name}>Sara</Text>
              <View style={styles.spacer} />
              <Text style={styles.score}>9/10</Text>
            </View>
          </View>
        )}
      </View>

      <Text style={styles.caption}>{t(`parentPro.demo.${section}.sub`)}</Text>

      <View style={styles.dots}>
        {SECTIONS.map((s, i) => (
          <View key={s} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  chipText: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  stage: { alignItems: 'stretch' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  spacer: { flex: 1 },
  pct: { fontSize: typography.size.bodyLarge, fontWeight: '700' },
  cardTitle: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  totalValue: {
    fontSize: typography.size.title,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  field: { gap: 2 },
  fieldLabel: { fontSize: typography.size.caption, color: colors.textMuted },
  fieldValue: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  stats: { flexDirection: 'row', gap: spacing.sm },
  goal: { gap: spacing.xs },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between' },
  goalPeriod: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  goalMet: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.correct,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: { flex: 1, borderRadius: radius.pill, backgroundColor: colors.correct },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  score: {
    fontSize: typography.size.bodyLarge,
    fontWeight: '700',
    color: colors.correct,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    minHeight: 44,
  },
  dots: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: ACCENT, width: 20 },
});
