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
 * The "count by 5" training ring — 00, 05, 10 … 55 around the rim. Shown as a
 * scaffold for younger kids / easier complexity, hidden as it gets harder.
 */
const MARKS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const SLOT = 20;

export function ClockRing({ size, radius }: ClockRingProps) {
  const centre = size / 2;
  return (
    <>
      {MARKS.map((m) => {
        const { x, y } = pointOnClock(centre, radius, m * 6);
        return (
          <View
            key={m}
            style={[styles.slot, { left: x - SLOT / 2, top: y - SLOT / 2 }]}
            pointerEvents="none"
          >
            <Text style={styles.text}>{m.toString().padStart(2, '0')}</Text>
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
    fontSize: typography.size.caption,
    fontWeight: typography.weight.regular,
    color: clockColors.ring,
    fontVariant: ['tabular-nums'],
  },
});
