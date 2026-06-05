import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  clockColors,
  colors,
  operationColors,
  radius,
  spacing,
  typography,
} from '../../../constants/design';

export interface SetClockPromptProps {
  /** The target time, already formatted (e.g. "7:15"). */
  time: string;
}

/** "Set the time" label with the target digital time in a highlighted box. */
export function SetClockPrompt({ time }: SetClockPromptProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('clock.setTitle')}</Text>
      <View style={styles.box}>
        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  label: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
  box: {
    backgroundColor: operationColors.addition.tint,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: clockColors.rim,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
  },
  time: {
    fontSize: typography.size.heading,
    lineHeight: typography.lineHeight.heading,
    fontWeight: typography.weight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
