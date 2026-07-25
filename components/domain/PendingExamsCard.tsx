/**
 * PendingExamsCard — kid-facing list of parent-assigned practice sets waiting
 * to be done, shown on the home screen. Tapping one starts it in the practice
 * workspace (blind results). Renders nothing unless Parent Pro is enabled, the
 * device is linked, and there's at least one pending exam.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  operationColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../constants/design';
import { PARENT_PRO_ENABLED } from '../../lib/featureFlags';
import { auth } from '../../lib/firebase';
import { useFamilyLink, usePendingExams, usePracticeSession } from '../../hooks';
import { tapFeedback } from '../../lib/feedback';

export function PendingExamsCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { link } = useFamilyLink();
  const { startExam } = usePracticeSession();
  const { exams, loading, error, reload } = usePendingExams(
    link?.familyId ?? null,
    link?.childId ?? null,
  );

  // Re-check whenever the home regains focus — so a newly-assigned practice
  // shows up without a relaunch, and a just-finished one drops off the list.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (!PARENT_PRO_ENABLED) return null;

  // Dev-only diagnostic: the card is otherwise invisible when empty, which makes
  // "why do I see nothing?" impossible to debug. Shows link/query state.
  if (exams.length === 0) {
    if (!__DEV__) return null;
    return (
      <View style={styles.debug}>
        <Text style={styles.debugTitle}>pending exams (dev)</Text>
        <Text style={styles.debugLine}>linked: {link ? 'yes' : 'NO — not a child device'}</Text>
        <Text style={styles.debugLine}>family: {link?.familyId ?? '—'}</Text>
        <Text style={styles.debugLine}>link child: {link?.childId ?? '—'}</Text>
        <Text style={styles.debugLine}>auth uid: {auth.currentUser?.uid ?? '—'}</Text>
        <Text
          style={[
            styles.debugLine,
            link?.childId !== auth.currentUser?.uid && styles.debugErr,
          ]}
        >
          uid matches childId: {link?.childId === auth.currentUser?.uid ? 'yes' : 'NO'}
        </Text>
        <Text style={styles.debugLine}>
          {loading ? 'loading…' : `pending: ${exams.length}`}
        </Text>
        {error ? <Text style={styles.debugErr}>error: {error}</Text> : null}
      </View>
    );
  }

  const open = (examId: string) => {
    const exam = exams.find((e) => e.id === examId);
    if (!exam) return;
    tapFeedback();
    startExam(exam.questions, exam.settings, exam.id);
    router.push('/practice');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{t('exams.kidHeading')}</Text>
      {exams.map((exam) => (
        <Pressable
          key={exam.id}
          onPress={() => open(exam.id)}
          accessibilityRole="button"
          accessibilityLabel={exam.title}
          style={styles.card}
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name="reader-outline"
              size={22}
              color={operationColors.addition.accent}
            />
          </View>
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={1}>
              {exam.title}
            </Text>
            <Text style={styles.meta}>
              {t(`operations.${exam.operation}`)} · {exam.questions.length}
            </Text>
          </View>
          <View style={styles.startPill}>
            <Text style={styles.startText}>{t('exams.kidStart')}</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.lg },
  debug: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 2,
  },
  debugTitle: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  debugLine: { fontSize: typography.size.caption, color: colors.textMuted },
  debugErr: { fontSize: typography.size.caption, color: colors.wrong },
  heading: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: operationColors.addition.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  title: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  meta: { fontSize: typography.size.caption, color: colors.textMuted },
  startPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: operationColors.addition.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  startText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: '#FFFFFF',
  },
});
