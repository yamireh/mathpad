import { Redirect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  QuestionWorkspace,
  type QuestionWorkspaceHandle,
  TimerDisplay,
} from '../components/domain';
import {
  Button,
  ConfirmDialog,
  IconButton,
  ScreenContainer,
} from '../components/ui';
import { colors, operationColors, radius, spacing, typography } from '../constants/design';
import {
  useDevPreferences,
  usePracticeSession,
  useRecognition,
  useTimer,
} from '../hooks';
import { errorFeedback, successFeedback } from '../lib/feedback';
import { isAnswerCorrect } from '../lib/scoring';

/** Practice — solve the session's questions one at a time. */
export default function PracticeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    session,
    updateAnswerInk,
    updateScratchInk,
    toggleBorrowMark,
    toggleDivisionBorrowMark,
    updateCarryInk,
    updatePartialInk,
    updateTimesCarryInk,
    updateDivisionDraftInk,
    updateDivisionCarryInk,
    undoLastAction,
    clearUndoHistory,
    markSolved,
    markHinted,
    finish,
  } = usePracticeSession();
  const { recognizeAnswer } = useRecognition();

  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const workspaceRef = useRef<QuestionWorkspaceHandle>(null);
  const { prefs: devPrefs } = useDevPreferences();

  const handleFinish = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await finish(recognizeAnswer);
      router.replace('/score');
    } catch {
      submittedRef.current = false;
      setSubmitting(false);
      Alert.alert(t('app.name'), t('practice.helpMessage'));
    }
  }, [finish, recognizeAnswer, router, t]);

  // Recognise the current question's ink and play success/error sound.
  // Awaited before advancing so the sound feels tied to the click.
  const judgeCurrentAnswer = useCallback(async () => {
    if (!session) return;
    const q = session.questions[index];
    const layout = q.layout;
    try {
      const submitted = await recognizeAnswer(session.answerInk[q.id], layout);
      if (isAnswerCorrect(q, submitted)) successFeedback();
      else errorFeedback();
    } catch {
      // recognition failed — skip the sound rather than fake a verdict.
    }
  }, [session, index, recognizeAnswer]);

  const timerSeconds =
    session && session.settings.timer.enabled
      ? session.settings.timer.durationMinutes * 60
      : null;
  const { secondsRemaining, stop } = useTimer(timerSeconds, handleFinish);

  if (!session) return <Redirect href="/" />;

  const total = session.questions.length;
  const question = session.questions[index];
  const accent = operationColors[session.settings.operation].accent;
  const isLast = index === total - 1;
  const layout = question.layout;

  // Hint: animate the next single step (write the next digit / do its borrow),
  // and flag the question as hinted for the Results screen.
  const onHint = () => {
    markHinted(question.id);
    workspaceRef.current?.solveStep();
  };

  // Has the current question any answer written (ink in any answer box)?
  const ink = session.answerInk[question.id];
  const hasAnswer =
    !!ink &&
    (ink.sign.length > 0 ||
      [ink.integer, ink.decimal, ink.remainder].some((rows) =>
        rows.some((box) => box.length > 0),
      ));

  // Judge the current answer, then advance to the next question (or finish).
  const advance = async () => {
    await judgeCurrentAnswer();
    if (isLast) {
      stop();
      void handleFinish();
    } else {
      setIndex((i) => Math.min(total - 1, i + 1));
    }
  };

  // Next / Finish: confirm first if nothing has been written for this question.
  const onPrimary = () => {
    if (!hasAnswer) {
      setConfirmSkip(true);
      return;
    }
    void advance();
  };

  return (
    <ScreenContainer padded={false}>
      <View style={styles.topBar}>
        <IconButton
          name="close"
          accessibilityLabel={t('a11y.closeButton')}
          onPress={() => setLeaving(true)}
        />
        <View style={styles.progress}>
          <Text style={styles.progressText}>
            {t('practice.progress', { current: index + 1, total })}
          </Text>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityLabel={t('a11y.progressBar', {
              current: index + 1,
              total,
            })}
          >
            <View style={{ flex: index + 1, backgroundColor: accent }} />
            <View style={{ flex: total - index - 1 }} />
          </View>
        </View>
        {timerSeconds !== null ? (
          <TimerDisplay secondsRemaining={secondsRemaining} />
        ) : null}
        {devPrefs.showSolveButton ? (
          <IconButton
            name="sparkles-outline"
            accessibilityLabel={t('practice.solve')}
            onPress={() => workspaceRef.current?.solve()}
          />
        ) : null}
        <IconButton
          name="bulb-outline"
          color={colors.amber}
          accessibilityLabel={t('hints.button')}
          onPress={onHint}
        />
      </View>

      <QuestionWorkspace
        ref={workspaceRef}
        key={question.id}
        question={question}
        layout={layout}
        answerInk={session.answerInk[question.id]}
        onAnswerInkChange={(ink) => updateAnswerInk(question.id, ink)}
        scratchInk={session.scratchInk[question.id]}
        onScratchInkChange={(strokes) =>
          updateScratchInk(question.id, strokes)
        }
        borrowMarks={session.borrowMarks[question.id]}
        onToggleBorrow={(column) => toggleBorrowMark(question.id, column)}
        divisionBorrowMarks={session.divisionBorrowMarks[question.id]}
        onToggleDivisionBorrow={(step, lenderIndex) =>
          toggleDivisionBorrowMark(question.id, step, lenderIndex)
        }
        carryInk={session.carryInk[question.id]}
        onCarryInkChange={(column, strokes) =>
          updateCarryInk(question.id, column, strokes)
        }
        partialInk={session.partialInk[question.id]}
        onPartialInkChange={(row, column, strokes) =>
          updatePartialInk(question.id, row, column, strokes)
        }
        timesCarryInk={session.timesCarryInk[question.id]}
        onTimesCarryInkChange={(partialRow, op1Col, strokes) =>
          updateTimesCarryInk(question.id, partialRow, op1Col, strokes)
        }
        divisionDraftInk={session.divisionDraftInk[question.id]}
        onDivisionDraftInkChange={(row, col, strokes) =>
          updateDivisionDraftInk(question.id, row, col, strokes)
        }
        divisionCarryInk={session.divisionCarryInk[question.id]}
        onDivisionCarryInkChange={(step, col, strokes) =>
          updateDivisionCarryInk(question.id, step, col, strokes)
        }
        onUndo={() => undoLastAction(question.id)}
        canUndo={(session.undoStacks[question.id]?.length ?? 0) > 0}
        onClearUndoHistory={() => clearUndoHistory(question.id)}
        onSolved={() => markSolved(question.id)}
        tone={accent}
      />

      <View style={styles.bottomBar}>
        <View style={styles.primaryButton}>
          <Button
            label={isLast ? t('practice.finish') : t('common.next')}
            tone={accent}
            disabled={submitting}
            onPress={onPrimary}
          />
        </View>
      </View>

      <ConfirmDialog
        visible={leaving}
        title={t('practice.leaveTitle')}
        message={t('practice.leaveMessage')}
        confirmLabel={t('practice.leaveConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          setLeaving(false);
          router.dismissAll();
        }}
        onCancel={() => setLeaving(false)}
      />

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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  progress: { flex: 1, gap: spacing.xs },
  progressText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
    textAlign: 'center',
  },
  track: {
    flexDirection: 'row',
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  primaryButton: { flex: 1 },
});
