import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Button, Header, IconButton, ScreenContainer } from '../../ui';
import { clockColors, colors, spacing } from '../../../constants/design';
import { errorFeedback, successFeedback } from '../../../lib/feedback';
import type { ClockQuestion, ClockResult } from '../../../lib/clock';
import {
  ClockQuestionView,
  type ClockQuestionHandle,
} from './ClockQuestionView';

export interface ClockFixViewProps {
  question: ClockQuestion;
  /** 1-based number, for the title. */
  number: number;
  onDone: (result: ClockResult) => void;
  onCancel: () => void;
}

/** Re-answer one clock question and re-check it (the "fix" flow from results). */
export function ClockFixView({
  question,
  number,
  onDone,
  onCancel,
}: ClockFixViewProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const clockSize = Math.min(Math.round(width * 0.82), 460);
  const qRef = useRef<ClockQuestionHandle>(null);
  const [submitting, setSubmitting] = useState(false);
  const [drawing, setDrawing] = useState(false);

  const check = async () => {
    setSubmitting(true);
    const { correct, given } = (await qRef.current?.judge()) ?? {
      correct: false,
      given: '—',
    };
    if (correct) successFeedback();
    else errorFeedback();
    setSubmitting(false);
    onDone({ question, correct, given, fixed: correct });
  };

  return (
    <ScreenContainer padded={false}>
      <View style={styles.headerWrap}>
        <Header
          title={t('review.title', { number })}
          left={
            <IconButton
              name="arrow-back"
              accessibilityLabel={t('common.back')}
              onPress={onCancel}
            />
          }
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        scrollEnabled={question.answerWith === 'set' ? false : !drawing}
        keyboardShouldPersistTaps="handled"
      >
        <ClockQuestionView
          key={question.id}
          ref={qRef}
          question={question}
          clockSize={clockSize}
          onDrawStart={() => setDrawing(true)}
          onDrawEnd={() => setDrawing(false)}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('review.submit')}
          tone={clockColors.hourHand}
          disabled={submitting}
          onPress={check}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
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
