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

export function ClockNumbers({ size, radius }: ClockNumbersProps) {
  const centre = size / 2;
  const slot = size * 0.1; // scales with the clock
  const fontSize = size * 0.055;
  return (
    <>
      {NUMBERS.map((n) => {
        const { x, y } = pointOnClock(centre, radius, n * 30);
        return (
          <View
            key={n}
            style={[styles.slot, { width: slot, height: slot, left: x - slot / 2, top: y - slot / 2 }]}
            pointerEvents="none"
          >
            <Text style={[styles.text, { fontSize }]}>{n}</Text>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  text: {
    fontWeight: typography.weight.medium,
    color: clockColors.face,
    fontVariant: ['tabular-nums'],
  },
});
