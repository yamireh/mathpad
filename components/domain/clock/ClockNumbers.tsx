import { StyleSheet, Text, View } from 'react-native';

import { clockColors, typography } from '../../../constants/design';
import { pointOnClock } from '../../../lib/clock';

export interface ClockNumbersProps {
  /** Square edge length of the clock, in px. */
  size: number;
  /** Radius (px from centre) at which to place the 1–12 numbers. */
  radius: number;
}

/** The 1–12 hour numbers, placed around the dial (RN text over the Skia face). */
const NUMBERS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const SLOT = 28;

export function ClockNumbers({ size, radius }: ClockNumbersProps) {
  const centre = size / 2;
  return (
    <>
      {NUMBERS.map((n) => {
        const { x, y } = pointOnClock(centre, radius, n * 30);
        return (
          <View
            key={n}
            style={[styles.slot, { left: x - SLOT / 2, top: y - SLOT / 2 }]}
            pointerEvents="none"
          >
            <Text style={styles.text}>{n}</Text>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    width: SLOT,
    height: SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: clockColors.face,
    fontVariant: ['tabular-nums'],
  },
});
