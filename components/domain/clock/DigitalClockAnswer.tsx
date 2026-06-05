import { StyleSheet, Text, View } from 'react-native';

import { clockColors, spacing, typography } from '../../../constants/design';
import { type InkStroke } from '../ink';
import { HandwritingField } from './HandwritingField';

export interface DigitalClockAnswerProps {
  onHourChange: (strokes: InkStroke[]) => void;
  onMinuteChange: (strokes: InkStroke[]) => void;
  /** Lock page scrolling while a field is being drawn in. */
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
  initialHour?: InkStroke[];
  initialMinute?: InkStroke[];
}

const FIELD_W = 116;
const FIELD_H = 148;

/**
 * "Write the time" answer surface: an hour field and a minute field separated
 * by a colon, each a {@link HandwritingField}. The consumer recognises each
 * field's strokes (as a number) and checks against the clock time.
 */
export function DigitalClockAnswer({
  onHourChange,
  onMinuteChange,
  onDrawStart,
  onDrawEnd,
  initialHour,
  initialMinute,
}: DigitalClockAnswerProps) {
  return (
    <View style={styles.row}>
      <HandwritingField
        width={FIELD_W}
        height={FIELD_H}
        initialStrokes={initialHour}
        onStrokesChange={onHourChange}
        onDrawStart={onDrawStart}
        onDrawEnd={onDrawEnd}
        accessibilityLabel="Hour"
      />
      <Text style={styles.colon}>:</Text>
      <HandwritingField
        width={FIELD_W}
        height={FIELD_H}
        initialStrokes={initialMinute}
        onStrokesChange={onMinuteChange}
        onDrawStart={onDrawStart}
        onDrawEnd={onDrawEnd}
        accessibilityLabel="Minutes"
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
