import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  Header,
  IconButton,
  RadioRow,
  ScreenContainer,
} from '../../ui';
import { clockColors, colors, spacing, typography } from '../../../constants/design';
import type {
  ClockAnswerType,
  ClockSettings,
  ClockStep,
} from '../../../lib/clock';

const TYPES: { value: ClockAnswerType; key: string }[] = [
  { value: 'digital', key: 'typeDigital' },
  { value: 'pattern', key: 'typePattern' },
  { value: 'set', key: 'typeSet' },
  { value: 'mixed', key: 'typeMixed' },
];
const STEPS: { value: ClockStep; key: string }[] = [
  { value: 'quarter', key: 'stepQuarter' },
  { value: 'five', key: 'stepFive' },
  { value: 'minute', key: 'stepMinute' },
];
const COUNT_MIN = 5;
const COUNT_MAX = 20;
const COUNT_STEP = 5;

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
  const [count, setCount] = useState(initial.questionCount);
  const [type, setType] = useState<ClockAnswerType>(initial.type);
  const [step, setStep] = useState<ClockStep>(initial.step);

  return (
    <ScreenContainer scroll>
      <Header
        title={t('topics.clock')}
        left={
          <IconButton
            name="arrow-back"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
          />
        }
      />

      <Section title={t('clock.settings.count')}>
        <View style={styles.stepper}>
          <IconButton
            name="remove"
            accessibilityLabel={t('a11y.decrease')}
            onPress={() => setCount((c) => Math.max(COUNT_MIN, c - COUNT_STEP))}
          />
          <Text style={styles.count}>{count}</Text>
          <IconButton
            name="add"
            accessibilityLabel={t('a11y.increase')}
            onPress={() => setCount((c) => Math.min(COUNT_MAX, c + COUNT_STEP))}
          />
        </View>
      </Section>

      <Section title={t('clock.settings.type')}>
        {TYPES.map((o) => (
          <RadioRow
            key={o.value}
            label={t(`clock.settings.${o.key}`)}
            description={t(`clock.settings.${o.key}Desc`)}
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
            selected={step === o.value}
            onPress={() => setStep(o.value)}
            tone={clockColors.hourHand}
          />
        ))}
      </Section>

      <Button
        label={t('settings.start')}
        tone={clockColors.hourHand}
        onPress={() => onStart({ questionCount: count, type, step })}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
