import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  AnswerArea,
  ProblemDisplay,
  ScratchCanvas,
  type ScratchCanvasHandle,
  type ScratchTool,
} from '../../components/domain';
import {
  Button,
  Header,
  IconButton,
  ScreenContainer,
} from '../../components/ui';
import { colors, operationColors, spacing, typography } from '../../constants/design';
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
  const { session, updateAnswerInk, updateScratchInk, reviewSubmit } =
    usePracticeSession();
  const { recognizeAnswer } = useRecognition();

  const [tool, setTool] = useState<ScratchTool>('pen');
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scratchRef = useRef<ScratchCanvasHandle>(null);

  if (!session || !session.results) return <Redirect href="/" />;
  const questionIndex = Number(index);
  const question = session.questions[questionIndex];
  if (!question) return <Redirect href="/" />;

  const accent = operationColors[session.settings.operation].accent;

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

      <View style={styles.problemArea}>
        <ProblemDisplay
          question={question}
          answerSlot={
            <AnswerArea
              question={question}
              ink={session.answerInk[question.id]}
              onChange={(ink) => updateAnswerInk(question.id, ink)}
              selectedBox={selectedBox}
              onSelectBox={setSelectedBox}
              tone={accent}
            />
          }
        />
      </View>

      <View style={styles.scratchArea}>
        <View style={styles.scratchToolbar}>
          <Text style={styles.scratchLabel}>{t('practice.scratchHint')}</Text>
          <View style={styles.tools}>
            <Button
              label={t('practice.eraser')}
              variant={tool === 'eraser' ? 'primary' : 'secondary'}
              tone={accent}
              fullWidth={false}
              onPress={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
            />
            <IconButton
              name="arrow-undo-outline"
              accessibilityLabel={t('practice.undo')}
              onPress={() => scratchRef.current?.undo()}
            />
            <IconButton
              name="trash-outline"
              accessibilityLabel={t('practice.clearScratch')}
              onPress={() => scratchRef.current?.clear()}
            />
          </View>
        </View>
        <ScratchCanvas
          ref={scratchRef}
          tool={tool}
          initialStrokes={session.scratchInk[question.id]}
          onStrokesChange={(strokes) =>
            updateScratchInk(question.id, strokes)
          }
          accessibilityLabel={t('a11y.scratchCanvas')}
        />
      </View>

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
  problemArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  scratchArea: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.sm },
  scratchToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scratchLabel: {
    flex: 1,
    fontSize: typography.size.caption,
    color: colors.textMuted,
  },
  tools: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bottom: { padding: spacing.lg },
});
