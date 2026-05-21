import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { DigitRangeSelector, ModeRadioGroup } from '../../components/domain';
import {
  Button,
  Chip,
  Header,
  IconButton,
  ScreenContainer,
} from '../../components/ui';
import {
  colors,
  operationColors,
  spacing,
  typography,
} from '../../constants/design';
import { usePracticeSession, useSettings } from '../../hooks';
import type {
  DivisionAnswerType,
  ModeOption,
  NegativeAnswerOption,
  Operation,
  QuestionCount,
  Settings,
  TimerDuration,
} from '../../types';

const QUESTION_COUNTS: QuestionCount[] = [5, 10, 15, 20];
const TIMER_DURATIONS: TimerDuration[] = [3, 5, 10, 15];

/** Settings — per-operation session setup, adapts to the chosen topic. */
export default function SettingsScreen() {
  const { operation } = useLocalSearchParams<{ operation: Operation }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { settings, update } = useSettings(operation);
  const { start } = usePracticeSession();

  const accent = operationColors[operation].accent;

  if (!settings) {
    return (
      <ScreenContainer>
        <Header
          left={
            <IconButton
              name="arrow-back"
              accessibilityLabel={t('common.back')}
              onPress={() => router.back()}
            />
          }
        />
      </ScreenContainer>
    );
  }

  /** Apply a patch and persist. */
  const patch = (changes: Partial<Settings>) =>
    update({ ...settings, ...changes } as Settings);

  const startPracticing = () => {
    start(settings);
    router.push('/practice');
  };

  return (
    <ScreenContainer scroll>
      <Header
        title={t('settings.title', {
          operation: t(`operations.${operation}`),
        })}
        left={
          <IconButton
            name="arrow-back"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
          />
        }
      />

      <Section title={t('settings.digits')}>
        <DigitRangeSelector
          value={settings.digitRange}
          onChange={(digitRange) => patch({ digitRange })}
          fromLabel={t('settings.digitsFrom')}
          toLabel={t('settings.digitsTo')}
          tone={accent}
        />
      </Section>

      <Section title={t('settings.questionCount')}>
        <View style={styles.chipRow}>
          {QUESTION_COUNTS.map((count) => (
            <Chip
              key={count}
              label={String(count)}
              selected={settings.questionCount === count}
              onPress={() => patch({ questionCount: count })}
              tone={accent}
            />
          ))}
        </View>
      </Section>

      <Section title={t('settings.timer')}>
        <View style={styles.timerRow}>
          <Text style={styles.timerHint}>{t('settings.timerHint')}</Text>
          <Switch
            value={settings.timer.enabled}
            onValueChange={(enabled) =>
              patch({ timer: { ...settings.timer, enabled } })
            }
            trackColor={{ true: accent, false: colors.border }}
          />
        </View>
        {settings.timer.enabled ? (
          <View style={styles.chipRow}>
            {TIMER_DURATIONS.map((minutes) => (
              <Chip
                key={minutes}
                label={t('settings.timerDuration', { minutes })}
                selected={settings.timer.durationMinutes === minutes}
                onPress={() =>
                  patch({
                    timer: { ...settings.timer, durationMinutes: minutes },
                  })
                }
                tone={accent}
              />
            ))}
          </View>
        ) : null}
      </Section>

      <OperationOptions
        settings={settings}
        accent={accent}
        onChange={patch}
      />

      <Text style={styles.summary}>{summarise(settings, t)}</Text>

      <Button
        label={t('settings.start')}
        tone={accent}
        onPress={startPracticing}
      />
    </ScreenContainer>
  );
}

/** Operation-specific options (carrying, borrowing, etc.). */
function OperationOptions({
  settings,
  accent,
  onChange,
}: {
  settings: Settings;
  accent: string;
  onChange: (changes: Partial<Settings>) => void;
}) {
  const { t } = useTranslation();
  const modeOptions = (['with', 'without', 'random'] as ModeOption[]).map(
    (value) => ({ value, label: t(`settings.mode.${value}`) }),
  );

  if (settings.operation === 'addition') {
    return (
      <Section title={t('settings.carrying')}>
        <ModeRadioGroup
          options={modeOptions}
          value={settings.carrying}
          onChange={(carrying) => onChange({ carrying })}
          tone={accent}
        />
      </Section>
    );
  }
  if (settings.operation === 'subtraction') {
    const negativeOptions = (
      ['off', 'on', 'random'] as NegativeAnswerOption[]
    ).map((value) => ({ value, label: t(`settings.negative.${value}`) }));
    return (
      <>
        <Section title={t('settings.borrowing')}>
          <ModeRadioGroup
            options={modeOptions}
            value={settings.borrowing}
            onChange={(borrowing) => onChange({ borrowing })}
            tone={accent}
          />
        </Section>
        <Section title={t('settings.allowNegative')}>
          <ModeRadioGroup
            options={negativeOptions}
            value={settings.allowNegative}
            onChange={(allowNegative) => onChange({ allowNegative })}
            tone={accent}
          />
        </Section>
      </>
    );
  }
  if (settings.operation === 'multiplication') {
    return (
      <Section title={t('settings.regrouping')}>
        <ModeRadioGroup
          options={modeOptions}
          value={settings.regrouping}
          onChange={(regrouping) => onChange({ regrouping })}
          tone={accent}
        />
      </Section>
    );
  }
  if (settings.operation === 'division') {
    const answerOptions = (
      ['noRemainder', 'remainder', 'decimal', 'random'] as DivisionAnswerType[]
    ).map((value) => ({
      value,
      label: t(`settings.divisionAnswer.${value}`),
    }));
    return (
      <Section title={t('settings.answerType')}>
        <ModeRadioGroup
          options={answerOptions}
          value={settings.answerType}
          onChange={(answerType) => onChange({ answerType })}
          tone={accent}
        />
      </Section>
    );
  }
  return null; // mix has no extra options
}

/** A labelled settings group. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** Build the live summary line. */
function summarise(
  settings: Settings,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const parts = [
    t('settings.summaryQuestions', { count: settings.questionCount }),
    t('settings.summaryDigits', {
      min: settings.digitRange.min,
      max: settings.digitRange.max,
    }),
    settings.timer.enabled
      ? t('settings.summaryTimed', {
          minutes: settings.timer.durationMinutes,
        })
      : t('settings.summaryUntimed'),
  ];
  return parts.join('  ·  ');
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl, gap: spacing.md },
  sectionTitle: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerHint: {
    flex: 1,
    fontSize: typography.size.body,
    color: colors.textMuted,
  },
  summary: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
