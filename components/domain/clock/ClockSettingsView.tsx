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
import { useHowToIntro, usePurchases } from '../../../hooks';
import { isSignedInParent } from '../../../lib/firebase/auth';
import { resetHowToIntros } from '../../../lib/howToIntro';
import type {
  ClockAnswerType,
  ClockComplexity,
  ClockJump,
  ClockSettings,
  ClockSkill,
} from '../../../lib/clock';

// The top axis: what the child practises.
const SKILLS: { value: ClockSkill; key: string; icon: IoniconName }[] = [
  { value: 'read', key: 'skillRead', icon: 'eye-outline' },
  { value: 'set', key: 'skillSet', icon: 'time-outline' },
  { value: 'elapsed', key: 'skillElapsed', icon: 'hourglass-outline' },
];
// How the child answers. "Set the hands" is offered only for elapsed (for
// "read" it's just copying the clock; for the "set" skill it's implied).
const ANSWERS: { value: ClockAnswerType; key: string; icon: IoniconName }[] = [
  { value: 'digital', key: 'typeDigital', icon: 'create-outline' },
  { value: 'pattern', key: 'typePattern', icon: 'chatbubbles-outline' },
  { value: 'set', key: 'typeSet', icon: 'time-outline' },
  { value: 'mixed', key: 'typeMixed', icon: 'shuffle' },
];
// Complexity icons read as a granularity ramp: quarter slices → 5-min timer →
// any-minute stopwatch → a shuffled mix.
const STEPS: { value: ClockComplexity; key: string; icon: IoniconName }[] = [
  { value: 'quarter', key: 'stepQuarter', icon: 'pie-chart-outline' },
  { value: 'five', key: 'stepFive', icon: 'timer-outline' },
  { value: 'minute', key: 'stepMinute', icon: 'stopwatch-outline' },
  { value: 'any', key: 'stepAny', icon: 'shuffle' },
];
// Elapsed jump size: the school ramp from whole hours down to any minute.
const JUMPS: { value: ClockJump; key: string; icon: IoniconName }[] = [
  { value: 'hour', key: 'jumpHour', icon: 'time-outline' },
  { value: 'half', key: 'jumpHalf', icon: 'timer-outline' },
  { value: 'five', key: 'jumpFive', icon: 'stopwatch-outline' },
  { value: 'any', key: 'jumpAny', icon: 'shuffle' },
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

/** Clock session setup: number of questions, skill, answer, complexity. */
export function ClockSettingsView({ initial, onStart }: ClockSettingsViewProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { devSetClockOwned } = usePurchases();
  // First time the Clock module is opened, auto-open the how-to.
  useHowToIntro({ id: 'clock', path: '/how-to/clock' });
  const [count, setCount] = useState(initial.questionCount);
  const [skill, setSkill] = useState<ClockSkill>(initial.skill);
  const [type, setType] = useState<ClockAnswerType>(initial.type);
  const [step, setStep] = useState<ClockComplexity>(initial.step);
  const [jump, setJump] = useState<ClockJump>(initial.jump);

  // "Read" can't answer by setting hands (that's just copying the clock) — so
  // if we switch to Read while "Set the hands" was chosen, fall back to Write.
  const chooseSkill = (s: ClockSkill) => {
    setSkill(s);
    if (s === 'read' && type === 'set') setType('digital');
  };
  // Answer options depend on the skill: Read offers write/say/mixed; elapsed
  // adds "set the hands". (For the Set skill this section is hidden entirely.)
  const answerOptions =
    skill === 'read' ? ANSWERS.filter((a) => a.value !== 'set') : ANSWERS;

  return (
    <ScreenContainer
      // Tighten the gap under the pinned header — the header already sits at
      // the safe-area top, so the body's default xl top padding is too airy.
      contentStyle={{ paddingTop: spacing.md }}
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

          <Section title={t('clock.settings.skill')}>
            {SKILLS.map((o) => (
              <RadioRow
                key={o.value}
                label={t(`clock.settings.${o.key}`)}
                description={t(`clock.settings.${o.key}Desc`)}
                icon={o.icon}
                selected={skill === o.value}
                onPress={() => chooseSkill(o.value)}
                tone={clockColors.hourHand}
              />
            ))}
          </Section>

          {/* How to answer — not shown for "Set the hands" (it's implied). */}
          {skill !== 'set' ? (
            <Section title={t('clock.settings.answer')}>
              {answerOptions.map((o) => (
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
          ) : null}

          {/* Jump size — only relevant to elapsed-time questions. */}
          {skill === 'elapsed' ? (
            <Section title={t('clock.settings.jump')}>
              {JUMPS.map((o) => (
                <RadioRow
                  key={o.value}
                  label={t(`clock.settings.${o.key}`)}
                  description={t(`clock.settings.${o.key}Desc`)}
                  icon={o.icon}
                  selected={jump === o.value}
                  onPress={() => setJump(o.value)}
                  tone={clockColors.hourHand}
                />
              ))}
            </Section>
          ) : null}

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
            onPress={() =>
              onStart({
                questionCount: count,
                skill,
                // A "Set the hands" session always answers by setting.
                type: skill === 'set' ? 'set' : type,
                step,
                jump,
              })
            }
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
            {__DEV__ ? (
              <Pill
                label="DEV: how-to intro"
                icon="play-circle-outline"
                onPress={() =>
                  void resetHowToIntros().then(() =>
                    router.push('/how-to/clock?intro=1'),
                  )
                }
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
