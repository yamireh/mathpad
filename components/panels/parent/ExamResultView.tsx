/**
 * ExamResultView — a parent's READ-ONLY view of a child's submitted exam. Shows
 * the same per-question breakdown the kid's score screen does (status, the kid's
 * answer, the correct answer, hints) — but with no "check answers" / edit, just
 * a back button. Full-screen over the dashboard.
 */
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { QuestionResultRow } from '../../domain';
import { Header, IconButton, ScreenContainer } from '../../ui';
import { colors, operationColors, spacing, typography } from '../../../constants/design';
import type { ExamResult } from '../../../lib/exams';

export interface ExamResultViewProps {
  visible: boolean;
  childName: string;
  result: ExamResult;
  onClose: () => void;
}

export function ExamResultView({
  visible,
  childName,
  result,
  onClose,
}: ExamResultViewProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* A Modal renders in its own native tree, so it needs its own
          SafeAreaProvider or the header would sit under the status bar. */}
      <SafeAreaProvider>
        <ScreenContainer padded={false}>
          <View style={styles.topFixed}>
          <Header
            title={t('exams.resultTitle', { name: childName })}
            left={
              <IconButton
                name="arrow-back"
                accessibilityLabel={t('exams.close')}
                onPress={onClose}
              />
            }
          />
          <Text style={[styles.hero, { color: operationColors.addition.accent }]}>
            {t('exams.resultScore', {
              score: result.finalScore,
              total: result.totalQuestions,
            })}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.list}>
            {result.questions.map((q, i) => (
              // No onPress → read-only (no review/edit).
              <QuestionResultRow key={q.question.id} result={q} number={i + 1} />
            ))}
          </View>
        </ScrollView>
        </ScreenContainer>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topFixed: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  hero: {
    textAlign: 'center',
    marginTop: spacing.xs,
    fontSize: typography.size.display,
    lineHeight: typography.lineHeight.display,
    fontWeight: typography.weight.medium,
    fontVariant: ['tabular-nums'],
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  list: { gap: spacing.sm },
});
