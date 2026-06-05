import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, IconButton, ScreenContainer } from '../../ui';
import { clockColors, colors, spacing, typography } from '../../../constants/design';
import { errorFeedback, successFeedback } from '../../../lib/feedback';
import { prepareModel, recognizeNumber } from '../../../lib/recognition';
import {
  checkPattern,
  checkSet,
  clockPhrase,
  formatDigital,
  generateClockQuestions,
  patternBank,
  type ClockResult,
  type ClockSettings,
  type ClockTime,
  type ClockToken,
} from '../../../lib/clock';
import { type InkStroke } from '../ink';
import { ClockFace } from './ClockFace';
import { ClockLegend } from './ClockLegend';
import { DigitalClockAnswer } from './DigitalClockAnswer';
import { PatternBuilder } from './PatternBuilder';
import { SettableClock } from './SettableClock';

// Hands always start at 9 o'clock (hour on 9, minute on 12) — two clearly
// separate, movable hands.
const SET_START: ClockTime = { hour: 9, minute: 0 };
const CLOCK_SIZE = 264;

export interface ClockPracticeViewProps {
  settings: ClockSettings;
  onFinish: (results: ClockResult[]) => void;
  onExit: () => void;
}

/** Reads `digits` ("05") into a number, or NaN if blank. */
function digitsToNumber(digits: number[]): number {
  return digits.length === 0 ? NaN : Number(digits.join(''));
}

/** The clock question loop: show the face, answer, judge, advance. */
export function ClockPracticeView({
  settings,
  onFinish,
  onExit,
}: ClockPracticeViewProps) {
  const { t } = useTranslation();
  const questions = useMemo(
    () =>
      generateClockQuestions({
        count: settings.questionCount,
        step: settings.step,
        type: settings.type,
      }),
    [settings],
  );

  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<ClockResult[]>([]);
  const [built, setBuilt] = useState<ClockToken[]>([]);
  const [setValue, setSetValue] = useState<ClockTime>(SET_START);
  const [selectedHand, setSelectedHand] = useState<'hour' | 'minute'>('hour');
  const [resetNonce, setResetNonce] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const hourRef = useRef<InkStroke[]>([]);
  const minuteRef = useRef<InkStroke[]>([]);

  // Warm the recognition model so the first digital check isn't a cold start.
  useEffect(() => {
    void prepareModel();
  }, []);

  const q = questions[index];
  const total = questions.length;
  const isLast = index === total - 1;
  const bank = useMemo(() => patternBank(clockPhrase(q.time)), [q]);
  const showRing = q.step === 'quarter';

  const judge = async (): Promise<boolean> => {
    if (q.answerWith === 'pattern') return checkPattern(q.time, built);
    if (q.answerWith === 'set') return checkSet(q.time, setValue);
    try {
      const [h, m] = await Promise.all([
        recognizeNumber(hourRef.current),
        recognizeNumber(minuteRef.current),
      ]);
      return (
        digitsToNumber(h.integerDigits) === q.time.hour &&
        digitsToNumber(m.integerDigits) === q.time.minute
      );
    } catch {
      return false;
    }
  };

  const advance = async () => {
    setSubmitting(true);
    const correct = await judge();
    if (correct) successFeedback();
    else errorFeedback();
    const next = [...results, { question: q, correct }];
    setSubmitting(false);
    if (isLast) {
      onFinish(next);
      return;
    }
    setResults(next);
    setIndex((i) => i + 1);
    setBuilt([]);
    setSetValue(SET_START);
    setSelectedHand('hour');
    hourRef.current = [];
    minuteRef.current = [];
    setResetNonce((n) => n + 1);
  };

  return (
    <ScreenContainer padded={false}>
      <View style={styles.top}>
        <IconButton
          name="close"
          accessibilityLabel={t('common.back')}
          onPress={onExit}
        />
        <Text style={styles.progress}>
          {t('practice.progress', { current: index + 1, total })}
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        // In Set mode the clock fits and must own the drag gesture, so the page
        // never scrolls; in the write/tiles modes, lock scrolling while drawing.
        scrollEnabled={q.answerWith === 'set' ? false : !drawing}
        keyboardShouldPersistTaps="handled"
      >
        {q.answerWith === 'set' ? (
          <>
            <Text style={styles.prompt}>
              {t('clock.setPrompt', { time: formatDigital(q.time) })}
            </Text>
            <SettableClock
              value={setValue}
              onChange={setSetValue}
              selected={selectedHand}
              size={CLOCK_SIZE}
              step={q.step}
              showRing={showRing}
            />
            <ClockLegend selected={selectedHand} onSelect={setSelectedHand} />
          </>
        ) : (
          <>
            <ClockFace time={q.time} size={CLOCK_SIZE} showRing={showRing} />
            <Text style={styles.prompt}>{t('clock.readPrompt')}</Text>
            {q.answerWith === 'pattern' ? (
              <PatternBuilder
                bank={bank}
                built={built}
                onAdd={(token) => setBuilt((b) => [...b, token])}
                onRemove={(i) => setBuilt((b) => b.filter((_, idx) => idx !== i))}
              />
            ) : (
              <DigitalClockAnswer
                key={resetNonce}
                onHourChange={(s) => {
                  hourRef.current = s;
                }}
                onMinuteChange={(s) => {
                  minuteRef.current = s;
                }}
                onDrawStart={() => setDrawing(true)}
                onDrawEnd={() => setDrawing(false)}
              />
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={isLast ? t('practice.finish') : t('common.next')}
          tone={clockColors.hourHand}
          disabled={submitting}
          onPress={advance}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  progress: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
  spacer: { width: 40 },
  body: {
    alignItems: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  prompt: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
