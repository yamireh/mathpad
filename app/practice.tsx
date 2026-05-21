import { Redirect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { QuestionWorkspace, TimerDisplay } from '../components/domain';
import {
  Button,
  ConfirmDialog,
  IconButton,
  ScreenContainer,
} from '../components/ui';
import { colors, operationColors, radius, spacing, typography } from '../constants/design';
import { usePracticeSession, useRecognition, useTimer } from '../hooks';

/** Practice — solve the session's questions one at a time. */
export default function PracticeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    session,
    updateAnswerInk,
    updateScratchInk,
    setLayoutOverride,
    toggleBorrowMark,
    finish,
  } = usePracticeSession();
  const { recognizeAnswer } = useRecognition();

  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
  const layout = session.layoutOverrides[question.id] ?? question.layout;

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
        tone={accent}
      />

      <View style={styles.bottomBar}>
        {index > 0 ? (
          <Button
            label={t('common.back')}
            variant="secondary"
            fullWidth={false}
            onPress={() => setIndex((i) => Math.max(0, i - 1))}
          />
        ) : null}
        <View style={styles.primaryButton}>
          <Button
            label={isLast ? t('practice.finish') : t('common.next')}
            tone={accent}
            disabled={submitting}
            onPress={
              isLast
                ? () => {
                    stop();
                    void handleFinish();
                  }
                : () => setIndex((i) => Math.min(total - 1, i + 1))
            }
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
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  primaryButton: { flex: 1 },
});
