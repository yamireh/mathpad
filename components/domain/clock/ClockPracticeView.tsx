import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Button, IconButton, ScreenContainer } from '../../ui';
import { clockColors, colors, spacing, typography } from '../../../constants/design';
import { errorFeedback, successFeedback } from '../../../lib/feedback';
import {
  generateClockQuestions,
  type ClockResult,
  type ClockSettings,
} from '../../../lib/clock';
import {
  ClockQuestionView,
  type ClockQuestionHandle,
} from './ClockQuestionView';

export interface ClockPracticeViewProps {
  settings: ClockSettings;
  onFinish: (results: ClockResult[]) => void;
  onExit: () => void;
}

/** The clock question loop: show a question, answer, judge, advance. */
export function ClockPracticeView({
  settings,
  onFinish,
  onExit,
}: ClockPracticeViewProps) {
  const { t } = useTranslation();
  // Responsive clock: a share of the screen width, larger on iPad (capped).
  const { width } = useWindowDimensions();
  const clockSize = Math.min(Math.round(width * 0.82), 460);
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
  const [submitting, setSubmitting] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const qRef = useRef<ClockQuestionHandle>(null);

  const q = questions[index];
  const total = questions.length;
  const isLast = index === total - 1;

  const advance = async () => {
    setSubmitting(true);
    const { correct, given } = (await qRef.current?.judge()) ?? {
      correct: false,
      given: '—',
    };
    if (correct) successFeedback();
    else errorFeedback();
    const next = [...results, { question: q, correct, given }];
    setSubmitting(false);
    if (isLast) {
      onFinish(next);
      return;
    }
    setResults(next);
    setIndex((i) => i + 1);
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
        scrollEnabled={q.answerWith === 'set' ? false : !drawing}
        keyboardShouldPersistTaps="handled"
      >
        <ClockQuestionView
          key={q.id}
          ref={qRef}
          question={q}
          clockSize={clockSize}
          onDrawStart={() => setDrawing(true)}
          onDrawEnd={() => setDrawing(false)}
        />
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
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
