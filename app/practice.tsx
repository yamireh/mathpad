import { Redirect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  type AnswerInk,
  DecimalAnswerRow,
  ProblemDisplay,
  RemainderAnswerRow,
  ScratchCanvas,
  type ScratchCanvasHandle,
  type ScratchTool,
  SignedAnswerRow,
  TimerDisplay,
  answerShape,
} from '../components/domain';
import {
  Button,
  ConfirmDialog,
  IconButton,
  ScreenContainer,
} from '../components/ui';
import {
  colors,
  operationColors,
  radius,
  spacing,
  typography,
} from '../constants/design';
import { usePracticeSession, useRecognition, useTimer } from '../hooks';
import type { Question } from '../types';

/** Picks the answer-area component for a question's answer kind. */
function AnswerArea(props: {
  question: Question;
  ink: AnswerInk;
  onChange: (ink: AnswerInk) => void;
  selectedBox: string | null;
  onSelectBox: (boxId: string) => void;
  tone: string;
}) {
  const shape = answerShape(props.question);
  const shared = {
    shape,
    ink: props.ink,
    onChange: props.onChange,
    selectedBox: props.selectedBox,
    onSelectBox: props.onSelectBox,
    tone: props.tone,
  };
  if (props.question.answer.kind === 'decimal') {
    return <DecimalAnswerRow {...shared} />;
  }
  if (props.question.answer.kind === 'remainder') {
    return <RemainderAnswerRow {...shared} />;
  }
  return <SignedAnswerRow {...shared} />;
}

/** Practice — solve the session's questions one at a time. */
export default function PracticeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session, updateAnswerInk, updateScratchInk, finish } =
    usePracticeSession();
  const { recognizeAnswer } = useRecognition();

  const [index, setIndex] = useState(0);
  const [tool, setTool] = useState<ScratchTool>('pen');
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const scratchRef = useRef<ScratchCanvasHandle>(null);
  const submittedRef = useRef(false);

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

  const goNext = () => {
    setSelectedBox(null);
    setIndex((i) => Math.min(total - 1, i + 1));
  };
  const goPrev = () => {
    setSelectedBox(null);
    setIndex((i) => Math.max(0, i - 1));
  };
  const onFinishPress = () => {
    stop();
    void handleFinish();
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
        <IconButton
          name="help-circle-outline"
          accessibilityLabel={t('practice.help')}
          onPress={() =>
            Alert.alert(t('practice.helpTitle'), t('practice.helpMessage'))
          }
        />
      </View>

      <View style={styles.problemArea}>
        <ProblemDisplay
          key={question.id}
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
          key={question.id}
          ref={scratchRef}
          tool={tool}
          initialStrokes={session.scratchInk[question.id]}
          onStrokesChange={(strokes) =>
            updateScratchInk(question.id, strokes)
          }
          accessibilityLabel={t('a11y.scratchCanvas')}
        />
      </View>

      <View style={styles.bottomBar}>
        {index > 0 ? (
          <Button
            label={t('common.back')}
            variant="secondary"
            fullWidth={false}
            onPress={goPrev}
          />
        ) : null}
        <View style={styles.primaryButton}>
          <Button
            label={isLast ? t('practice.finish') : t('common.next')}
            tone={accent}
            disabled={submitting}
            onPress={isLast ? onFinishPress : goNext}
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
  problemArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  scratchArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
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
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  primaryButton: { flex: 1 },
});
