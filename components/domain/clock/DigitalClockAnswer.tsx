import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../ui';
import { clockColors, spacing, typography } from '../../../constants/design';
import { type InkStroke } from '../ink';
import { HandwritingField } from './HandwritingField';

export interface DigitalClockAnswerProps {
  onHourChange: (strokes: InkStroke[]) => void;
  onMinuteChange: (strokes: InkStroke[]) => void;
  /** Lock page scrolling while a field is being drawn in. */
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
}

const FIELD_W = 116;
const FIELD_H = 148;

/**
 * "Write the time" answer surface: an hour field and a minute field separated
 * by a colon, each a {@link HandwritingField}, plus a clear button. The
 * consumer recognises each field's strokes (as a number) and checks the time.
 */
export function DigitalClockAnswer({
  onHourChange,
  onMinuteChange,
  onDrawStart,
  onDrawEnd,
}: DigitalClockAnswerProps) {
  const { t } = useTranslation();
  // Bumping this remounts both fields with empty ink.
  const [nonce, setNonce] = useState(0);

  const clear = () => {
    setNonce((n) => n + 1);
    onHourChange([]);
    onMinuteChange([]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <HandwritingField
          key={`hour-${nonce}`}
          width={FIELD_W}
          height={FIELD_H}
          onStrokesChange={onHourChange}
          onDrawStart={onDrawStart}
          onDrawEnd={onDrawEnd}
          accessibilityLabel="Hour"
        />
        <Text style={styles.colon}>:</Text>
        <HandwritingField
          key={`minute-${nonce}`}
          width={FIELD_W}
          height={FIELD_H}
          onStrokesChange={onMinuteChange}
          onDrawStart={onDrawStart}
          onDrawEnd={onDrawEnd}
          accessibilityLabel="Minutes"
        />
      </View>

      <IconButton
        name="backspace-outline"
        accessibilityLabel={t('common.clear')}
        onPress={clear}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  colon: {
    fontSize: typography.size.display,
    fontWeight: typography.weight.medium,
    color: clockColors.minuteHand,
    marginHorizontal: spacing.xs,
  },
});
