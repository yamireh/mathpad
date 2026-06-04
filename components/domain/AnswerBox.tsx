import { Ionicons } from '@expo/vector-icons';
import { Canvas, Path } from '@shopify/react-native-skia';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '../../constants/design';
import type { BoxStatus } from '../../lib/review';
import { ANSWER_BOX_HEIGHT, DIGIT_COLUMN_WIDTH } from './layout';
import {
  type InkStroke,
  type PathTransform,
  strokeToPath,
  strokesBounds,
} from './ink';

export interface AnswerBoxProps {
  /** The box's ink (captured in the answer pad, shown here scaled to fit). */
  strokes: InkStroke[];
  /** Highlighted as the box the answer pad is currently writing into. */
  selected: boolean;
  /** Dimmed — an earlier box must be filled first (sequential fill order). */
  locked?: boolean;
  /** Tap to make this the active box. */
  onSelect: () => void;
  /** Clear this box's ink. */
  onClear: () => void;
  accessibilityLabel: string;
  tone?: string;
  /** Column width. Defaults to the full-size grid. */
  cellWidth?: number;
  /** Box height. Defaults to the full-size grid. */
  boxHeight?: number;
  /**
   * Render with a muted gray background instead of white — used for the
   * long-division draft grid's "extension" cells past the dividend width,
   * to read as scratch-like overflow space.
   */
  muted?: boolean;
  /**
   * Review error-highlight: green border when `'correct'`, coral when
   * `'incorrect'`. Overrides the selected/idle border. Null = no highlight.
   */
  status?: BoxStatus | null;
  /** The digit here was filled by a hint — draw it in the hint colour. */
  hinted?: boolean;
}

const FIT_PADDING = 8;
const MAX_SCALE = 3.5;

/** Fit a stroke set's bounding box, centred, into the answer box. */
function fitTransform(
  strokes: InkStroke[],
  innerWidth: number,
  innerHeight: number,
): PathTransform {
  const bounds = strokesBounds(strokes);
  if (!bounds) return { scale: 1, dx: 0, dy: 0 };
  const width = Math.max(bounds.maxX - bounds.minX, 4);
  const height = Math.max(bounds.maxY - bounds.minY, 4);
  const scale = Math.min(
    (innerWidth - 2 * FIT_PADDING) / width,
    (innerHeight - 2 * FIT_PADDING) / height,
    MAX_SCALE,
  );
  return {
    scale,
    dx: innerWidth / 2 - (bounds.minX + width / 2) * scale,
    dy: innerHeight / 2 - (bounds.minY + height / 2) * scale,
  };
}

/**
 * One answer digit cell. Displays the kid's ink (captured big in the answer
 * pad, scaled down here) and acts as a tap target to focus that pad on it.
 * It never shows a recognised digit — ink is converted only at Finish.
 */
export function AnswerBox({
  strokes,
  selected,
  locked = false,
  onSelect,
  onClear,
  accessibilityLabel,
  tone = colors.text,
  cellWidth = DIGIT_COLUMN_WIDTH,
  boxHeight = ANSWER_BOX_HEIGHT,
  muted = false,
  status = null,
  hinted = false,
}: AnswerBoxProps) {
  const inkColor = hinted ? colors.hint : colors.text;
  const boxInnerWidth = cellWidth - 12;
  const transform = fitTransform(strokes, boxInnerWidth, boxHeight);
  const hasInk = strokes.length > 0;
  const statusColor =
    status === 'incorrect'
      ? colors.wrong
      : status === 'correct'
        ? colors.correct
        : null;

  // Compact (smaller) boxes get a tighter clear-button slot — but the
  // round X button itself is 18pt, so the slot must be at least that tall
  // or the button gets clipped into the cell border below it.
  const clearSlotHeight = cellWidth < DIGIT_COLUMN_WIDTH ? 20 : 22;
  return (
    <View style={[styles.column, { width: cellWidth }]}>
      <View style={[styles.clearSlot, { height: clearSlotHeight }]}>
        {hasInk ? (
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel={`${accessibilityLabel} — clear`}
            hitSlop={8}
            style={styles.clearButton}
          >
            <Ionicons name="close" size={12} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected, disabled: locked }}
        onPress={onSelect}
        style={[
          styles.box,
          {
            width: boxInnerWidth,
            height: boxHeight,
            borderColor: statusColor ?? (selected ? tone : colors.border),
          },
          muted && styles.boxMuted,
          (selected || statusColor) && styles.boxSelected,
          locked && styles.boxLocked,
        ]}
      >
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {strokes.map((stroke, i) => (
            <Path
              key={i}
              path={strokeToPath(stroke, transform)}
              color={inkColor}
              style="stroke"
              strokeWidth={2.5}
              strokeCap="round"
              strokeJoin="round"
            />
          ))}
        </Canvas>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'center' },
  clearSlot: { justifyContent: 'center' },
  clearButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  boxSelected: { borderWidth: 2.5 },
  boxMuted: { backgroundColor: colors.surfaceAlt },
  boxLocked: { opacity: 0.4, backgroundColor: colors.surfaceAlt },
});
