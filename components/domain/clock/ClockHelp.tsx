import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { clockColors, colors, typography } from '../../../constants/design';
import { pointOnClock } from '../../../lib/clock';

/**
 * The teaching "help" overlay: at each 5-minute mark, the phrase for that time
 * ("o'clock", "quarter past", "5 to", …), sitting inside the coloured quadrants
 * drawn by ClockFace. Purely additive on the *inside* of the dial — the outer
 * clock (rim, ticks, numbers, count-by-5 ring) is untouched. Pure RN text (like
 * ClockNumbers) so it layers cleanly on top of the Skia canvas and hands.
 */
export interface ClockHelpLabelsProps {
  /** Square edge length of the clock, in px. */
  size: number;
  /** Usable dial radius (px from centre). */
  radius: number;
}

/** The 12 marks (12 at top, clockwise) and the minute each stands for. */
const MARK_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
/** The in-between minutes (not multiples of 5) — help fills these in. */
const IN_BETWEEN = Array.from({ length: 60 }, (_, m) => m).filter(
  (m) => m % 5 !== 0,
);

function phraseFor(minute: number, t: (k: string) => string): string {
  const past = t('clock.words.past');
  const to = t('clock.words.to');
  if (minute === 0) return t('clock.words.oclock');
  if (minute === 15) return `${t('clock.words.quarter')} ${past}`;
  if (minute === 30) return `${t('clock.words.half')} ${past}`;
  if (minute === 45) return `${t('clock.words.quarter')} ${to}`;
  if (minute < 30) return `${minute} ${past}`;
  return `${60 - minute} ${to}`;
}

export function ClockHelpLabels({ size, radius: dialR }: ClockHelpLabelsProps) {
  const { t } = useTranslation();
  const centre = size / 2;
  // Narrow slots make only the long phrases ("quarter past/to") wrap to two
  // lines so they clear the 3 / 9 numbers, without pulling every label inward.
  const slot = size * 0.15;
  const fontSize = size * 0.032;
  const numSlot = size * 0.1;
  const tinyFont = size * 0.024;
  return (
    <>
      {/* Fine in-between minutes, filling the gaps between the bold 5s on the
          primary ring (which the base face already draws). */}
      {IN_BETWEEN.map((m) => {
        const { x, y } = pointOnClock(centre, dialR * 0.93, m * 6);
        return (
          <View
            key={`m${m}`}
            pointerEvents="none"
            style={[
              styles.slot,
              {
                width: numSlot,
                height: numSlot,
                left: x - numSlot / 2,
                top: y - numSlot / 2,
              },
            ]}
          >
            <Text style={[styles.tiny, { fontSize: tinyFont }]}>{m}</Text>
          </View>
        );
      })}
      {MARK_MINUTES.map((minute) => {
        const { x, y } = pointOnClock(centre, dialR * 0.52, minute * 6);
        return (
          <View
            key={minute}
            pointerEvents="none"
            style={[
              styles.slot,
              { width: slot, height: slot, left: x - slot / 2, top: y - slot / 2 },
            ]}
          >
            <Text style={[styles.text, { fontSize }]} numberOfLines={2}>
              {phraseFor(minute, t)}
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
    textAlign: 'center',
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  tiny: {
    textAlign: 'center',
    fontWeight: typography.weight.regular,
    color: clockColors.ring,
    fontVariant: ['tabular-nums'],
  },
});

