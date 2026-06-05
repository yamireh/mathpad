import { StyleSheet, Text, View } from 'react-native';

import { clockColors, typography } from '../../../constants/design';
import { pointOnClock } from '../../../lib/clock';

export interface ClockRingProps {
  /** Square edge length of the clock, in px. */
  size: number;
  /** Radius (px from centre) at which to place the minute labels. */
  radius: number;
}

/**
 * The "count by 5" minute numbers — 00, 05, 10 … 55 around the rim. A scaffold
 * for younger kids / easier complexity, hidden as it gets harder.
 */
const MARKS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export function ClockRing({ size, radius }: ClockRingProps) {
  const centre = size / 2;
  const slot = size * 0.072; // scales with the clock
  const fontSize = size * 0.043;
  return (
    <>
      {MARKS.map((m) => {
        const { x, y } = pointOnClock(centre, radius, m * 6);
        return (
          <View
            key={m}
            style={[styles.slot, { width: slot, height: slot, left: x - slot / 2, top: y - slot / 2 }]}
            pointerEvents="none"
          >
            <Text style={[styles.text, { fontSize }]}>
              {m.toString().padStart(2, '0')}
            </Text>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  text: {
    fontWeight: typography.weight.regular,
    color: clockColors.ring,
    fontVariant: ['tabular-nums'],
  },
});
