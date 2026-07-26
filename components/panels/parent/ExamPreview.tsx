/**
 * ExamPreview — a parent's read-only look at the questions in an assigned
 * practice set that a child hasn't submitted yet. Same tap target as the result
 * view, but instead of a score breakdown it just lists what was assigned (with
 * the answer key, since the parent authored it). Full-screen over the dashboard.
 */
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { formatAnswer, formatProblem } from '../../domain/format';
import { Header, IconButton, ScreenContainer } from '../../ui';
import { colors, operationColors, radius, spacing, typography } from '../../../constants/design';
import type { Exam } from '../../../lib/exams';

export interface ExamPreviewProps {
  visible: boolean;
  exam: Exam;
  childName: string;
  onClose: () => void;
}

export function ExamPreview({ visible, exam, childName, onClose }: ExamPreviewProps) {
  const { t } = useTranslation();
  const accent = operationColors[exam.operation].accent;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* A Modal renders in its own native tree, so it needs its own
          SafeAreaProvider or the header would sit under the status bar. */}
      <SafeAreaProvider>
        <ScreenContainer padded={false}>
          <View style={styles.topFixed}>
            <Header
              title={exam.title}
              left={
                <IconButton
                  name="arrow-back"
                  accessibilityLabel={t('exams.close')}
                  onPress={onClose}
                />
              }
            />
            <Text style={styles.subtitle}>
              {t('exams.previewFor', { name: childName })}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.list}>
              {exam.questions.map((q, i) => (
                <View key={q.id} style={styles.row}>
                  <Text style={[styles.num, { color: accent }]}>{i + 1}</Text>
                  <Text style={styles.q}>
                    {formatProblem(q)} = {formatAnswer(q.answer)}
                  </Text>
                </View>
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
  subtitle: {
    textAlign: 'center',
    marginTop: spacing.xs,
    fontSize: typography.size.body,
    color: colors.textMuted,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  num: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    minWidth: 20,
    fontVariant: ['tabular-nums'],
  },
  q: {
    fontSize: typography.size.bodyLarge,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
