import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Button, ConfirmDialog, IconButton, ScreenContainer } from '../../ui';
import {
  clockColors,
  colors,
  spacing,
  typography,
} from '../../../constants/design';
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
        skill: settings.skill,
        jump: settings.jump,
      }),
    [settings],
  );

  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<ClockResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [helpOn, setHelpOn] = useState(false);
  const qRef = useRef<ClockQuestionHandle>(null);

  const q = questions[index];
  const total = questions.length;
  const isLast = index === total - 1;

  const advance = async () => {
    setSubmitting(true);
    // If the kid tapped Next before the convert pause, recognize the handwriting
    // now and hold a short beat so they SEE the clean number before we move on.
    const flushed = await qRef.current?.flush();
    if (flushed) await new Promise((r) => setTimeout(r, 450));
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

  // Next / Finish: confirm first if nothing has been entered for this question.
  const onPrimary = () => {
    if (qRef.current?.hasAnswer() === false) {
      setConfirmSkip(true);
      return;
    }
    void advance();
  };

  return (
    <ScreenContainer padded={false}>
      <View style={styles.top}>
        <View style={styles.topRow}>
          <IconButton
            name="close"
            accessibilityLabel={t('common.back')}
            onPress={onExit}
          />
          <Text style={styles.progressText}>
            {t('practice.progress', { current: index + 1, total })}
          </Text>
          {/* Reading modes get a hint bulb (matches Operations): it toggles the
              past/to teaching overlay on the clock. */}
          {q.skill === 'read' ? (
            <IconButton
              name={helpOn ? 'bulb' : 'bulb-outline'}
              color={colors.amber}
              accessibilityLabel={t('hints.button')}
              onPress={() => setHelpOn((h) => !h)}
            />
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
        {/* The progress bar doubles as the header divider: a thin full-width
            fill that grows across the bottom edge as the kid advances. */}
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityLabel={t('a11y.progressBar', {
            current: index + 1,
            total,
          })}
        >
          <View style={{ flex: index + 1, backgroundColor: clockColors.hourHand }} />
          <View style={{ flex: total - index - 1 }} />
        </View>
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
          help={helpOn}
          onDrawStart={() => setDrawing(true)}
          onDrawEnd={() => setDrawing(false)}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={isLast ? t('practice.finish') : t('common.next')}
          tone={clockColors.hourHand}
          disabled={submitting}
          onPress={onPrimary}
        />
      </View>

      <ConfirmDialog
        visible={confirmSkip}
        title={t('practice.skipTitle')}
        message={t('practice.skipMessage')}
        confirmLabel={t('practice.skipConfirm')}
        cancelLabel={t('practice.skipCancel')}
        onConfirm={() => {
          setConfirmSkip(false);
          void advance();
        }}
        onCancel={() => setConfirmSkip(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Solid background so the (scrolling) clock can't show through the header;
  // the progress bar below forms the divider instead of a hard line.
  top: { backgroundColor: colors.background },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  progressText: {
    flex: 1,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Full-width, edge-to-edge sliver along the header's bottom — both the
  // progress indicator and the header/content divider.
  track: {
    flexDirection: 'row',
    height: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
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
