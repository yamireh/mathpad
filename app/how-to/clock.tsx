import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import {
  ClockHowToView,
  type ClockHowToHandle,
} from '../../components/domain/clock';
import { Button, Header, IconButton, ScreenContainer } from '../../components/ui';
import { clockColors, spacing } from '../../constants/design';

/**
 * How to read a clock — a worked-example walkthrough for the Clock module.
 * Animates the hands into place while captions bridge analog → digital → words.
 * Reached from the Clock settings how-to button (and, later, the Clock unlock
 * screen's "Watch how it works").
 */
export default function ClockHowToScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const viewRef = useRef<ClockHowToHandle>(null);
  const [played, setPlayed] = useState(false);
  const size = Math.min(width * 0.62, 290);

  const watch = () => {
    setPlayed(true);
    viewRef.current?.play();
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
              onPress={() => router.back()}
            />
          }
        />
      </View>

      <View style={styles.body}>
        <ClockHowToView ref={viewRef} size={size} />
      </View>

      <View style={styles.bottom}>
        <Button
          label={played ? t('howTo.replay') : t('howTo.watch')}
          icon={played ? 'refresh' : 'play'}
          variant="secondary"
          onPress={watch}
        />
        <Button
          label={t('howTo.gotIt')}
          tone={clockColors.hourHand}
          onPress={() => router.back()}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { padding: spacing.lg, gap: spacing.sm },
});
