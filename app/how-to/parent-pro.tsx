import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import {
  ParentProDemo,
  SECTIONS,
} from '../../components/panels/parent/ParentProDemo';
import { Button, Header, IconButton, ScreenContainer } from '../../components/ui';
import { operationColors, spacing } from '../../constants/design';

const ACCENT = operationColors.multiplication.accent;

/**
 * "See what's included" — a tap-through preview of Parent Pro, one section per
 * page (Progress · Goals · Practice). Reached from the paywall. Plain Next/Back
 * navigation, no animation.
 */
export default function ParentProHowToScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const stageWidth = Math.min(width - 48, 360);
  const last = index === SECTIONS.length - 1;

  return (
    <ScreenContainer padded={false}>
      <View style={styles.top}>
        <Header
          title={t('parentPro.demo.title')}
          left={
            <IconButton
              name="arrow-back"
              accessibilityLabel={t('common.back')}
              onPress={() => router.back()}
            />
          }
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <ParentProDemo width={stageWidth} index={index} />
      </ScrollView>

      <View style={styles.bottom}>
        {index > 0 ? (
          <Button
            label={t('common.back')}
            icon="chevron-back"
            variant="secondary"
            onPress={() => setIndex((i) => i - 1)}
          />
        ) : null}
        <Button
          label={last ? t('howTo.gotIt') : t('common.next')}
          icon={last ? undefined : 'chevron-forward'}
          tone={ACCENT}
          onPress={() => (last ? router.back() : setIndex((i) => i + 1))}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  body: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  bottom: { padding: spacing.lg, gap: spacing.sm },
});
