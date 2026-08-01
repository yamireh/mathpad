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

import { AttentionPulse } from '../ui';
import {
  colors,
  operationColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../constants/design';
import { PARENT_PRO_ENABLED } from '../../lib/featureFlags';

// Themed in the Parent Pro purple so an assignment stands apart from the kid's
// own module cards — it's a special "from your grown-up" thing.
const ACCENT = operationColors.multiplication.accent;
const ACCENT_TINT = operationColors.multiplication.tint;
import { usePendingExams, usePracticeIdentity, usePracticeSession } from '../../hooks';
import { tapFeedback } from '../../lib/feedback';

export function PendingExamsCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { startExam } = usePracticeSession();
  // Who this device is practicing as (a parent-as-child via membership, or a
  // kid device with a matching uid). usePracticeIdentity already excludes a
  // stale/mismatched kid link, so a query here is always authorized.
  const identity = usePracticeIdentity();
  const { exams, reload } = usePendingExams(
    identity?.familyId ?? null,
    identity?.childId ?? null,
  );

  // Re-check whenever the home regains focus — so a newly-assigned practice
  // shows up without a relaunch, and a just-finished one drops off the list.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (!PARENT_PRO_ENABLED || !identity || exams.length === 0) return null;

  const open = (examId: string) => {
    const exam = exams.find((e) => e.id === examId);
    if (!exam) return;
    tapFeedback();
    startExam(exam.questions, exam.settings, exam.id);
    router.push('/practice');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <Ionicons name="sparkles" size={13} color={ACCENT} />
        <Text style={styles.heading}>{t('exams.kidHeading')}</Text>
      </View>
      {exams.map((exam) => (
        <Pressable
          key={exam.id}
          onPress={() => open(exam.id)}
          accessibilityRole="button"
          accessibilityLabel={exam.title}
          style={styles.card}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="gift" size={22} color="#FFFFFF" />
            {/* A gently pulsing "new" dot to draw the kid's eye. */}
            <AttentionPulse active style={styles.badge}>
              <View style={styles.badgeDot} />
            </AttentionPulse>
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
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heading: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: ACCENT,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    // Tinted fill + a bold accent border so it clearly isn't a plain module card.
    backgroundColor: ACCENT_TINT,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: ACCENT,
    padding: spacing.md,
    ...shadows.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { position: 'absolute', top: -4, right: -4 },
  badgeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: ACCENT_TINT,
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
    backgroundColor: ACCENT,
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
