import { StyleSheet, Text, View } from 'react-native';

import { clockColors } from '../../../constants/design';
import { pointOnClock } from '../../../lib/clock';

export interface ClockRingProps {
  /** Square edge length of the clock, in px. */
  size: number;
  /** Radius (px from centre) at which to place the minute numbers. */
  radius: number;
}

/**
 * The primary minute scale: the multiples of 5 (0, 5, 10 … 55) in bold, in the
 * minute-hand colour, around the rim. The fine in-between minutes are added
 * only by the help overlay, so the base face stays uncluttered.
 */
const MARKS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export function ClockRing({ size, radius }: ClockRingProps) {
  const centre = size / 2;
  const slot = size * 0.1;
  const fontSize = size * 0.036;
  return (
    <>
      {MARKS.map((m) => {
        const { x, y } = pointOnClock(centre, radius, m * 6);
        return (
          <View
            key={m}
            style={[
              styles.slot,
              { width: slot, height: slot, left: x - slot / 2, top: y - slot / 2 },
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.five, { fontSize }]}>{m}</Text>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  five: {
    textAlign: 'center',
    fontWeight: '700',
    color: clockColors.minuteHand,
    fontVariant: ['tabular-nums'],
  },
});
