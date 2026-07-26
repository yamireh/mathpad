import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  HowToIntroScrim,
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
import { markHowToIntroSeen } from '../../lib/howToIntro';
import { howToQuestion } from '../../lib/howTo';
import type { Operation } from '../../types';

/**
 * How to solve — a worked-example walkthrough. Shows a fixed question for the
 * operation and animates the solver through it. Reached from the how-to icon on
 * the operation's settings screen, and auto-opened (in "intro" mode) the first
 * time the operation is opened.
 */
export default function HowToScreen() {
  const { operation, intro } = useLocalSearchParams<{
    operation: Operation;
    intro?: string;
  }>();
  const isIntro = intro === '1';
  const router = useRouter();
  const { t } = useTranslation();
  const question = howToQuestion(operation);
  // Hooks must run unconditionally; Mix (no demo) redirects below.
  const { workspaceProps, reset } = useHowToDemo(
    question ?? howToQuestion('addition')!,
  );
  const workspaceRef = useRef<QuestionWorkspaceHandle>(null);
  const [played, setPlayed] = useState(false);
  const [finished, setFinished] = useState(false);

  if (!question) return <Redirect href="/" />;

  const accent = operationColors[operation].accent;

  const watch = () => {
    reset();
    setFinished(false);
    setPlayed(true);
    // Let the reset render before the solver starts writing.
    requestAnimationFrame(() => workspaceRef.current?.solve());
  };
  const dontShowAgain = () => {
    void markHowToIntroSeen(operation);
    router.back();
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
        onSolveComplete={() => setFinished(true)}
        {...workspaceProps}
      />

      <View style={styles.bottom}>
        <Button
          label={played ? t('howTo.replay') : t('howTo.watch')}
          icon={played ? 'refresh' : 'play'}
          variant="secondary"
          // "Watch again" stays disabled until the demo has finished.
          disabled={played && !finished}
          onPress={watch}
        />
        {!isIntro || played ? (
          <Button
            label={t('howTo.gotIt')}
            tone={accent}
            onPress={() => router.back()}
          />
        ) : null}
      </View>

      {/* First-open veil: dim the page; only "Watch now" (+ "Don't show
          again") are lit. */}
      {isIntro && !played ? (
        <HowToIntroScrim
          watchLabel={t('howTo.watchNow')}
          dontShowLabel={t('howTo.dontShowAgain')}
          tone={accent}
          onWatch={watch}
          onDontShow={dontShowAgain}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  bottom: { padding: spacing.lg, gap: spacing.sm },
});
