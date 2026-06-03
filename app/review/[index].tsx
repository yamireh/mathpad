import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { QuestionWorkspace } from '../../components/domain';
import {
  Button,
  Header,
  IconButton,
  ScreenContainer,
} from '../../components/ui';
import { operationColors, spacing } from '../../constants/design';
import { usePracticeSession, useRecognition } from '../../hooks';
import { type ReviewMarks, computeReviewMarks } from '../../lib/review';

/**
 * Question review/edit — reopens one question with its original ink preserved
 * so the kid can fix a wrong answer. Submitting re-marks it and updates the
 * final score (SPEC § Question review/edit).
 */
export default function ReviewScreen() {
  const { index } = useLocalSearchParams<{ index: string }>();
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
    reviewSubmit,
  } = usePracticeSession();
  const { recognizeAnswer } = useRecognition();
  const [submitting, setSubmitting] = useState(false);
  // "Show errors": opt-in green/red box borders. Off by default so the kid can
  // re-attempt unaided. The marks are a snapshot — any edit clears them
  // (`markStale`) so stale highlights never linger.
  const [showErrors, setShowErrors] = useState(false);
  const [errorMarks, setErrorMarks] = useState<ReviewMarks | null>(null);
  const [computing, setComputing] = useState(false);

  if (!session || !session.results) return <Redirect href="/" />;
  const questionIndex = Number(index);
  const question = session.questions[questionIndex];
  if (!question) return <Redirect href="/" />;

  const accent = operationColors[session.settings.operation].accent;
  const layout = question.layout;
  const qid = question.id;

  /** Drop stale highlights the moment the kid changes any ink. */
  const markStale = () => {
    if (showErrors) {
      setShowErrors(false);
      setErrorMarks(null);
    }
  };

  const toggleErrors = async () => {
    if (showErrors) {
      setShowErrors(false);
      setErrorMarks(null);
      return;
    }
    setComputing(true);
    try {
      const marks = await computeReviewMarks({
        question,
        layout,
        answerInk: session.answerInk[qid],
        carryInk: session.carryInk[qid],
        partialInk: session.partialInk[qid],
        timesCarryInk: session.timesCarryInk[qid],
        divisionDraftInk: session.divisionDraftInk[qid],
        divisionCarryInk: session.divisionCarryInk[qid],
      });
      setErrorMarks(marks);
      setShowErrors(true);
    } catch {
      Alert.alert(t('app.name'), t('practice.helpMessage'));
    } finally {
      setComputing(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await reviewSubmit(question.id, recognizeAnswer);
      router.back();
    } catch {
      setSubmitting(false);
      Alert.alert(t('app.name'), t('practice.helpMessage'));
    }
  };

  return (
    <ScreenContainer padded={false}>
      <View style={styles.top}>
        <Header
          title={t('review.title', { number: questionIndex + 1 })}
          left={
            <IconButton
              name="arrow-back"
              accessibilityLabel={t('common.back')}
              onPress={() => router.back()}
            />
          }
        />
      </View>

      <QuestionWorkspace
        key={question.id}
        question={question}
        layout={layout}
        answerInk={session.answerInk[question.id]}
        onAnswerInkChange={(ink) => {
          markStale();
          updateAnswerInk(question.id, ink);
        }}
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
        onCarryInkChange={(column, strokes) => {
          markStale();
          updateCarryInk(question.id, column, strokes);
        }}
        partialInk={session.partialInk[question.id]}
        onPartialInkChange={(row, column, strokes) => {
          markStale();
          updatePartialInk(question.id, row, column, strokes);
        }}
        timesCarryInk={session.timesCarryInk[question.id]}
        onTimesCarryInkChange={(partialRow, op1Col, strokes) => {
          markStale();
          updateTimesCarryInk(question.id, partialRow, op1Col, strokes);
        }}
        divisionDraftInk={session.divisionDraftInk[question.id]}
        onDivisionDraftInkChange={(row, col, strokes) => {
          markStale();
          updateDivisionDraftInk(question.id, row, col, strokes);
        }}
        divisionCarryInk={session.divisionCarryInk[question.id]}
        onDivisionCarryInkChange={(step, col, strokes) => {
          markStale();
          updateDivisionCarryInk(question.id, step, col, strokes);
        }}
        errorMarks={showErrors ? errorMarks : null}
        cascadeClear
        tone={accent}
      />

      <View style={styles.bottom}>
        <Button
          label={showErrors ? t('review.hideErrors') : t('review.showErrors')}
          variant="secondary"
          disabled={computing || submitting}
          onPress={toggleErrors}
        />
        <Button
          label={t('review.submit')}
          tone={accent}
          disabled={submitting}
          onPress={submit}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  bottom: { padding: spacing.lg, gap: spacing.sm },
});
