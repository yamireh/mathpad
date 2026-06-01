import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

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
import { primaryFeedback } from '../../lib/feedback';
import type {
  DigitCount,
  DivisionAnswerType,
  DivisionFormat,
  DivisionSettings,
  ModeOption,
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
    primaryFeedback();
    start(settings);
    router.push('/practice');
  };

  return (
    <ScreenContainer padded={false}>
      <View style={styles.header}>
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
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title={t('settings.digits')} tone={accent}>
          {settings.operation === 'division' ? (
            <DivisionDigitSelectors
              dividendDigits={settings.dividendDigits}
              divisorDigits={settings.divisorDigits}
              onChange={(changes) => patch(changes)}
              tone={accent}
            />
          ) : (
            <DigitCountsSelector
              value={settings.digitCounts}
              onChange={(digitCounts) => patch({ digitCounts })}
              tone={accent}
            />
          )}
        </Section>

        <Section title={t('settings.questionCount')} tone={accent}>
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

        <OperationOptions
          settings={settings}
          accent={accent}
          onChange={patch}
        />

        {/* Timer is always the last setting. */}
        <ToggleRow
          title={t('settings.timer')}
          hint={t('settings.timerHint')}
          value={settings.timer.enabled}
          onValueChange={(enabled) =>
            patch({ timer: { ...settings.timer, enabled } })
          }
          tone={accent}
        />
        {settings.timer.enabled ? (
          <View style={[styles.chipRow, styles.timerChips]}>
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

        <Text style={styles.summary}>{summarise(settings, t)}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('settings.start')}
          tone={accent}
          onPress={startPracticing}
        />
      </View>
    </ScreenContainer>
  );
}

const DIGIT_CHOICES: DigitCount[] = [1, 2, 3, 4];

/**
 * Multi-select chip picker for `digitCounts` (addition / subtraction /
 * multiplication). The kid taps to toggle each count on or off; at
 * least one stays selected at all times.
 */
function DigitCountsSelector({
  value,
  onChange,
  tone,
}: {
  value: DigitCount[];
  onChange: (next: DigitCount[]) => void;
  tone: string;
}) {
  const toggle = (n: DigitCount) => {
    const next = value.includes(n)
      ? value.filter((v) => v !== n)
      : [...value, n].sort((a, b) => a - b);
    // Always keep at least one selected — taps on a single-selected
    // chip become a no-op rather than leaving the kid with no choices.
    if (next.length === 0) return;
    onChange(next);
  };
  return (
    <View style={styles.chipRow}>
      {DIGIT_CHOICES.map((n) => (
        <Chip
          key={n}
          label={String(n)}
          selected={value.includes(n)}
          onPress={() => toggle(n)}
          tone={tone}
        />
      ))}
    </View>
  );
}

/**
 * Division-specific digit picker — separate chip row for the dividend and
 * for the divisor (single value each, not a range). Replaces the
 * `DigitRangeSelector` shown to other operations.
 */
function DivisionDigitSelectors({
  dividendDigits,
  divisorDigits,
  onChange,
  tone,
}: {
  dividendDigits: DigitCount;
  divisorDigits: DigitCount;
  onChange: (changes: Partial<DivisionSettings>) => void;
  tone: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.divisionDigits}>
      <View style={styles.divisionDigitsRow}>
        <Text style={styles.divisionDigitsLabel}>
          {t('settings.dividendDigits')}
        </Text>
        <View style={styles.chipRow}>
          {DIGIT_CHOICES.map((n) => (
            <Chip
              key={n}
              label={String(n)}
              selected={dividendDigits === n}
              onPress={() => onChange({ dividendDigits: n })}
              tone={tone}
            />
          ))}
        </View>
      </View>
      <View style={styles.divisionDigitsRow}>
        <Text style={styles.divisionDigitsLabel}>
          {t('settings.divisorDigits')}
        </Text>
        <View style={styles.chipRow}>
          {DIGIT_CHOICES.map((n) => (
            <Chip
              key={n}
              label={String(n)}
              selected={divisorDigits === n}
              onPress={() => onChange({ divisorDigits: n })}
              tone={tone}
            />
          ))}
        </View>
      </View>
    </View>
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
  // With/Without/Random modes are shown as simple On/Off toggles for now
  // (random is ignored): On = with carrying/borrowing/regrouping.
  const modeOn = (m: ModeOption) => m === 'with';
  const toMode = (on: boolean): ModeOption => (on ? 'with' : 'without');

  if (settings.operation === 'addition') {
    return (
      <>
        <ToggleRow
          title={t('settings.carrying')}
          value={modeOn(settings.carrying)}
          onValueChange={(on) => onChange({ carrying: toMode(on) })}
          tone={accent}
        />
        <ToggleRow
          title={t('settings.decimals')}
          value={settings.decimals === 'on'}
          onValueChange={(on) => onChange({ decimals: on ? 'on' : 'off' })}
          tone={accent}
        />
      </>
    );
  }
  if (settings.operation === 'subtraction') {
    return (
      <>
        <ToggleRow
          title={t('settings.borrowing')}
          value={modeOn(settings.borrowing)}
          onValueChange={(on) => onChange({ borrowing: toMode(on) })}
          tone={accent}
        />
        <ToggleRow
          title={t('settings.allowNegative')}
          value={settings.allowNegative === 'on'}
          onValueChange={(on) => onChange({ allowNegative: on ? 'on' : 'off' })}
          tone={accent}
        />
        <ToggleRow
          title={t('settings.decimals')}
          value={settings.decimals === 'on'}
          onValueChange={(on) => onChange({ decimals: on ? 'on' : 'off' })}
          tone={accent}
        />
      </>
    );
  }
  if (settings.operation === 'multiplication') {
    return (
      <>
        <ToggleRow
          title={t('settings.regrouping')}
          value={modeOn(settings.regrouping)}
          onValueChange={(on) => onChange({ regrouping: toMode(on) })}
          tone={accent}
        />
        <ToggleRow
          title={t('settings.decimals')}
          value={settings.decimals === 'on'}
          onValueChange={(on) => onChange({ decimals: on ? 'on' : 'off' })}
          tone={accent}
        />
      </>
    );
  }
  if (settings.operation === 'division') {
    // Answer type is a 3-way choice (not a binary toggle), so it uses the
    // same Chip row as digits / question count. Random is ignored for now.
    const answerTypes: DivisionAnswerType[] = [
      'noRemainder',
      'remainder',
      'decimal',
      'all',
    ];
    const formats: DivisionFormat[] = ['long', 'row'];
    return (
      <>
        <Section title={t('settings.divisionType')} tone={accent}>
          <View style={styles.chipRow}>
            {formats.map((value) => (
              <Chip
                key={value}
                label={t(`settings.divisionFormat.${value}`)}
                selected={settings.divisionType === value}
                onPress={() => onChange({ divisionType: value })}
                tone={accent}
              />
            ))}
          </View>
        </Section>
        <Section title={t('settings.answerType')} tone={accent}>
          <View style={styles.chipRow}>
            {answerTypes.map((value) => (
              <Chip
                key={value}
                label={t(`settings.divisionAnswer.${value}`)}
                selected={settings.answerType === value}
                onPress={() => onChange({ answerType: value })}
                tone={accent}
              />
            ))}
          </View>
        </Section>
      </>
    );
  }
  return null; // mix has no extra options
}

/** A labelled section title with a small accent bar for emphasis. */
function SectionTitle({ title, tone }: { title: string; tone: string }) {
  return (
    <View style={styles.titleRow}>
      <View style={[styles.titleBar, { backgroundColor: tone }]} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/** A setting rendered as an On/Off toggle (like the timer), with its title
 *  emphasized and an optional hint below. */
function ToggleRow({
  title,
  hint,
  value,
  onValueChange,
  tone,
}: {
  title: string;
  hint?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  tone: string;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLabel}>
        <SectionTitle title={title} tone={tone} />
        {hint ? <Text style={styles.toggleHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: tone, false: colors.border }}
      />
    </View>
  );
}

/** A labelled settings group. */
function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <SectionTitle title={title} tone={tone} />
      {children}
    </View>
  );
}

/** Build the live summary line. */
function summarise(
  settings: Settings,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const digitSummary =
    settings.operation === 'division'
      ? t('settings.summaryDivisionDigits', {
          dividend: settings.dividendDigits,
          divisor: settings.divisorDigits,
        })
      : t('settings.summaryDigits', {
          list: settings.digitCounts.join(', '),
        });
  const parts = [
    t('settings.summaryQuestions', { count: settings.questionCount }),
    digitSummary,
    settings.timer.enabled
      ? t('settings.summaryTimed', {
          minutes: settings.timer.durationMinutes,
        })
      : t('settings.summaryUntimed'),
  ];
  return parts.join('  ·  ');
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  // Pinned Start Practice strip: top border separates it from the
  // scrolling content above so it doesn't feel like it's floating.
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  divisionDigits: { gap: spacing.md },
  divisionDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  divisionDigitsLabel: {
    width: 100,
    fontSize: typography.size.body,
    color: colors.textMuted,
  },
  section: { marginTop: spacing.xl, gap: spacing.md },
  // Title with a short accent bar to its left for emphasis.
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleBar: { width: 4, height: 20, borderRadius: 2 },
  sectionTitle: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  // A setting shown as a toggle: emphasized title (+ optional hint) on the
  // left, Switch on the right.
  toggleRow: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleLabel: { flex: 1, gap: spacing.xs },
  toggleHint: {
    marginLeft: spacing.sm + 4,
    fontSize: typography.size.body,
    color: colors.textMuted,
  },
  timerChips: { marginTop: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summary: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
