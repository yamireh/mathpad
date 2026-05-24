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
    setLayoutOverride,
    toggleBorrowMark,
    updateCarryInk,
    updatePartialInk,
    updateTimesCarryInk,
    updateDivisionDraftInk,
    reviewSubmit,
  } = usePracticeSession();
  const { recognizeAnswer } = useRecognition();
  const [submitting, setSubmitting] = useState(false);

  if (!session || !session.results) return <Redirect href="/" />;
  const questionIndex = Number(index);
  const question = session.questions[questionIndex];
  if (!question) return <Redirect href="/" />;

  const accent = operationColors[session.settings.operation].accent;
  const layout = session.layoutOverrides[question.id] ?? question.layout;

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
        onLayoutChange={(next) => setLayoutOverride(question.id, next)}
        answerInk={session.answerInk[question.id]}
        onAnswerInkChange={(ink) => updateAnswerInk(question.id, ink)}
        scratchInk={session.scratchInk[question.id]}
        onScratchInkChange={(strokes) =>
          updateScratchInk(question.id, strokes)
        }
        borrowMarks={session.borrowMarks[question.id]}
        onToggleBorrow={(column) => toggleBorrowMark(question.id, column)}
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
        tone={accent}
      />

      <View style={styles.bottom}>
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
  bottom: { padding: spacing.lg },
});
