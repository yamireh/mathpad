import { Ionicons } from '@expo/vector-icons';
import { Canvas, Path } from '@shopify/react-native-skia';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '../../constants/design';
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
  /** Tap to make this the active box. */
  onSelect: () => void;
  /** Clear this box's ink. */
  onClear: () => void;
  accessibilityLabel: string;
  tone?: string;
  /** Column width — kept equal to the printed problem digit columns. */
  columnWidth?: number;
}

const BOX_INNER_WIDTH = DIGIT_COLUMN_WIDTH - 12;
const FIT_PADDING = 8;
const MAX_SCALE = 3.5;

/** Fit a stroke set's bounding box, centred, into the answer box. */
function fitTransform(strokes: InkStroke[]): PathTransform {
  const bounds = strokesBounds(strokes);
  if (!bounds) return { scale: 1, dx: 0, dy: 0 };
  const width = Math.max(bounds.maxX - bounds.minX, 4);
  const height = Math.max(bounds.maxY - bounds.minY, 4);
  const scale = Math.min(
    (BOX_INNER_WIDTH - 2 * FIT_PADDING) / width,
    (ANSWER_BOX_HEIGHT - 2 * FIT_PADDING) / height,
    MAX_SCALE,
  );
  return {
    scale,
    dx: BOX_INNER_WIDTH / 2 - (bounds.minX + width / 2) * scale,
    dy: ANSWER_BOX_HEIGHT / 2 - (bounds.minY + height / 2) * scale,
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
  onSelect,
  onClear,
  accessibilityLabel,
  tone = colors.text,
  columnWidth = DIGIT_COLUMN_WIDTH,
}: AnswerBoxProps) {
  const transform = fitTransform(strokes);
  const hasInk = strokes.length > 0;

  return (
    <View style={[styles.column, { width: columnWidth }]}>
      <View style={styles.clearSlot}>
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
        accessibilityState={{ selected }}
        onPress={onSelect}
        style={[
          styles.box,
          { borderColor: selected ? tone : colors.border },
          selected && styles.boxSelected,
        ]}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          {strokes.map((stroke, i) => (
            <Path
              key={i}
              path={strokeToPath(stroke, transform)}
              color={colors.text}
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
  clearSlot: { height: 22, justifyContent: 'center' },
  clearButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: BOX_INNER_WIDTH,
    height: ANSWER_BOX_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  boxSelected: { borderWidth: 2.5 },
});
