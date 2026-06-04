import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  QuestionWorkspace,
  type QuestionWorkspaceHandle,
} from '../../components/domain';
import {
  Button,
  Header,
  IconButton,
  ScreenContainer,
} from '../../components/ui';
import { operationColors, spacing } from '../../constants/design';
import { useHowToDemo } from '../../hooks';
import { howToQuestion } from '../../lib/howTo';
import type { Operation } from '../../types';

/**
 * How to solve — a worked-example walkthrough. Shows a fixed question for the
 * operation and animates the solver through it (tap Watch). Reached from the
 * How-to icon on the operation's settings screen.
 */
export default function HowToScreen() {
  const { operation } = useLocalSearchParams<{ operation: Operation }>();
  const router = useRouter();
  const { t } = useTranslation();
  const question = howToQuestion(operation);
  // Hooks must run unconditionally; Mix (no demo) redirects below.
  const { workspaceProps, reset } = useHowToDemo(
    question ?? howToQuestion('addition')!,
  );
  const workspaceRef = useRef<QuestionWorkspaceHandle>(null);
  const [played, setPlayed] = useState(false);

  if (!question) return <Redirect href="/" />;

  const accent = operationColors[operation].accent;

  const watch = () => {
    reset();
    setPlayed(true);
    // Let the reset render before the solver starts writing.
    requestAnimationFrame(() => workspaceRef.current?.solve());
  };

  return (
    <ScreenContainer padded={false}>
      <View style={styles.top}>
        <Header
          title={t('howTo.title', { operation: t(`operations.${operation}`) })}
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
        ref={workspaceRef}
        key={question.id}
        question={question}
        layout={question.layout}
        tone={accent}
        {...workspaceProps}
      />

      <View style={styles.bottom}>
        <Button
          label={played ? t('howTo.replay') : t('howTo.watch')}
          icon={played ? 'refresh' : 'play'}
          variant="secondary"
          onPress={watch}
        />
        <Button label={t('howTo.gotIt')} tone={accent} onPress={() => router.back()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  bottom: { padding: spacing.lg, gap: spacing.sm },
});
