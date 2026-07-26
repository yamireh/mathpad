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
import type { ClockDirection } from '../../../lib/clock';

/** Human-readable duration: "1 hour", "1 hour 20 min", "45 min". */
function formatDuration(minutes: number, t: (k: string) => string): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? t('clock.hour') : t('clock.hoursUnit')}`);
  if (m > 0) parts.push(`${m} ${t('clock.min')}`);
  return parts.join(' ');
}

export interface ElapsedPromptProps {
  shift: { minutes: number; dir: ClockDirection };
}

/** "What time will it be in 1 hour?" banner for an elapsed-time question. */
export function ElapsedPrompt({ shift }: ElapsedPromptProps) {
  const { t } = useTranslation();
  const dur = formatDuration(shift.minutes, t);
  return (
    <View style={styles.box}>
      <Text style={styles.text}>
        {t(shift.dir === 'after' ? 'clock.elapsedAfter' : 'clock.elapsedBefore', {
          dur,
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'stretch',
    backgroundColor: operationColors.addition.tint,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: clockColors.rim,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: {
    textAlign: 'center',
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
});
