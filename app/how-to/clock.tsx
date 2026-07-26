import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { HowToIntroScrim } from '../../components/domain';
import {
  ClockHowToView,
  type ClockHowToHandle,
} from '../../components/domain/clock';
import { Button, Header, IconButton, ScreenContainer } from '../../components/ui';
import { clockColors, spacing } from '../../constants/design';
import { markHowToIntroSeen } from '../../lib/howToIntro';

/**
 * How to read a clock — a worked-example walkthrough for the Clock module.
 * Animates the hands into place while captions bridge analog → digital → words.
 * Reached from the Clock settings how-to button, and auto-opened (in "intro"
 * mode) the first time the module is opened.
 */
export default function ClockHowToScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { intro } = useLocalSearchParams<{ intro?: string }>();
  const isIntro = intro === '1';
  const { width } = useWindowDimensions();
  const viewRef = useRef<ClockHowToHandle>(null);
  const [played, setPlayed] = useState(false);
  const [finished, setFinished] = useState(false);
  const size = Math.min(width * 0.62, 290);

  const watch = () => {
    setFinished(false);
    setPlayed(true);
    viewRef.current?.play();
  };
  // Leaving mid-demo must halt the animation + sounds.
  const leave = () => {
    viewRef.current?.stop();
    router.back();
  };
  const dontShowAgain = () => {
    viewRef.current?.stop();
    void markHowToIntroSeen('clock');
    router.back();
  };

  return (
    <ScreenContainer padded={false}>
      <View style={styles.top}>
        <Header
          title={t('clock.howTo.title')}
          left={
            <IconButton
              name="arrow-back"
              accessibilityLabel={t('common.back')}
              onPress={leave}
            />
          }
        />
      </View>

      <View style={styles.body}>
        <ClockHowToView
          ref={viewRef}
          size={size}
          onDone={() => setFinished(true)}
        />
      </View>

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
          <Button label={t('howTo.gotIt')} tone={clockColors.hourHand} onPress={leave} />
        ) : null}
      </View>

      {/* First-open veil: dim the page; only "Watch now" (+ "Don't show
          again") are lit. */}
      {isIntro && !played ? (
        <HowToIntroScrim
          watchLabel={t('howTo.watchNow')}
          dontShowLabel={t('howTo.dontShowAgain')}
          tone={clockColors.hourHand}
          onWatch={watch}
          onDontShow={dontShowAgain}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { padding: spacing.lg, gap: spacing.sm },
});
