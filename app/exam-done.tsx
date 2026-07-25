import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ScreenContainer } from '../components/ui';
import { colors, operationColors, spacing, typography } from '../constants/design';
import { usePracticeSession } from '../hooks';

/**
 * Blind exam-submitted screen. Shown after a kid finishes a parent-assigned
 * exam — a friendly acknowledgement with NO score (the parent sees the result).
 */
export default function ExamDoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { reset } = usePracticeSession();

  const goHome = () => {
    reset();
    router.dismissAll();
  };

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Ionicons
          name="checkmark-circle"
          size={72}
          color={operationColors.addition.accent}
        />
        <Text style={styles.title}>{t('exams.doneTitle')}</Text>
        <Text style={styles.subtitle}>{t('exams.doneBody')}</Text>
      </View>
      <View style={styles.footer}>
        <Button label={t('score.home')} onPress={goHome} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.size.heading,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.size.bodyLarge,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  footer: { paddingBottom: spacing.xl },
});
