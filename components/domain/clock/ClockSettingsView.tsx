import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AttentionPulse,
  Button,
  Card,
  Header,
  IconButton,
  type IoniconName,
  Pill,
  RadioRow,
  ScreenContainer,
} from '../../ui';
import { clockColors, colors, spacing, typography } from '../../../constants/design';
import { usePurchases } from '../../../hooks';
import { isSignedInParent } from '../../../lib/firebase/auth';
import type {
  ClockAnswerType,
  ClockSettings,
  ClockStep,
} from '../../../lib/clock';

// Each mode gets an icon that encodes its meaning, so it's recognised at a
// glance: write a digit, speak the words, move the hands, or a mix.
const TYPES: { value: ClockAnswerType; key: string; icon: IoniconName }[] = [
  { value: 'digital', key: 'typeDigital', icon: 'create-outline' },
  { value: 'pattern', key: 'typePattern', icon: 'chatbubbles-outline' },
  { value: 'set', key: 'typeSet', icon: 'time-outline' },
  { value: 'mixed', key: 'typeMixed', icon: 'shuffle' },
];
// Complexity icons read as a granularity ramp: quarter slices → 5-min timer →
// any-minute stopwatch.
const STEPS: { value: ClockStep; key: string; icon: IoniconName }[] = [
  { value: 'quarter', key: 'stepQuarter', icon: 'pie-chart-outline' },
  { value: 'five', key: 'stepFive', icon: 'timer-outline' },
  { value: 'minute', key: 'stepMinute', icon: 'stopwatch-outline' },
];
// 1 and 2 are dev-only quick options (for recording short demos); prod stays 5–20.
const COUNTS = __DEV__ ? [1, 2, 5, 10, 15, 20] : [5, 10, 15, 20];
const stepCount = (current: number, dir: -1 | 1): number => {
  const i = COUNTS.indexOf(current);
  const next = Math.min(COUNTS.length - 1, Math.max(0, (i < 0 ? 0 : i) + dir));
  return COUNTS[next];
};

/** A titled settings section: label above an elevated card. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card>{children}</Card>
    </View>
  );
}

export interface ClockSettingsViewProps {
  initial: ClockSettings;
  onStart: (settings: ClockSettings) => void;
}

/** Clock session setup: number of questions, answer type, complexity. */
export function ClockSettingsView({ initial, onStart }: ClockSettingsViewProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { devSetClockOwned } = usePurchases();
  const [count, setCount] = useState(initial.questionCount);
  const [type, setType] = useState<ClockAnswerType>(initial.type);
  const [step, setStep] = useState<ClockStep>(initial.step);

  return (
    <ScreenContainer
      header={
        <Header
          title={t('topics.clock')}
          left={
            <IconButton
              name="arrow-back"
              accessibilityLabel={t('common.back')}
              onPress={() => router.back()}
            />
          }
          right={
            <AttentionPulse active>
              <IconButton
                name="bulb"
                color={colors.amber}
                accessibilityLabel={t('howTo.button')}
                onPress={() => router.push('/how-to/clock')}
              />
            </AttentionPulse>
          }
        />
      }
    >
      <View style={styles.container}>
        {/* Settings scroll if they don't fit; header + footer stay pinned. */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Section title={t('clock.settings.count')}>
            <View style={styles.stepper}>
              <IconButton
                name="remove"
                accessibilityLabel={t('a11y.decrease')}
                onPress={() => setCount((c) => stepCount(c, -1))}
              />
              <Text style={styles.count}>{count}</Text>
              <IconButton
                name="add"
                accessibilityLabel={t('a11y.increase')}
                onPress={() => setCount((c) => stepCount(c, 1))}
              />
            </View>
          </Section>

          <Section title={t('clock.settings.type')}>
            {TYPES.map((o) => (
              <RadioRow
                key={o.value}
                label={t(`clock.settings.${o.key}`)}
                description={t(`clock.settings.${o.key}Desc`)}
                icon={o.icon}
                selected={type === o.value}
                onPress={() => setType(o.value)}
                tone={clockColors.hourHand}
              />
            ))}
          </Section>

          <Section title={t('clock.settings.complexity')}>
            {STEPS.map((o) => (
              <RadioRow
                key={o.value}
                label={t(`clock.settings.${o.key}`)}
                description={t(`clock.settings.${o.key}Desc`)}
                icon={o.icon}
                selected={step === o.value}
                onPress={() => setStep(o.value)}
                tone={clockColors.hourHand}
              />
            ))}
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={t('settings.start')}
            tone={clockColors.hourHand}
            onPress={() => onStart({ questionCount: count, type, step })}
          />
          <View style={styles.footerLinks}>
            {/* Hidden for a parent preview — they shouldn't see/log kid history. */}
            {!isSignedInParent() ? (
              <Pill
                label={t('home.history')}
                icon="time-outline"
                onPress={() => router.push('/clock-history')}
              />
            ) : null}
            {__DEV__ ? (
              <Pill
                label="DEV: clock owned ✓"
                icon="bug-outline"
                onPress={() => devSetClockOwned(false)}
              />
            ) : null}
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: spacing.md },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  section: { marginBottom: spacing.lg, gap: spacing.sm },
  sectionTitle: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  count: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: typography.size.heading,
    fontWeight: typography.weight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
