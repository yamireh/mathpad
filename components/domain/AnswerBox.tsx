import { Ionicons } from '@expo/vector-icons';
import { Canvas, Path } from '@shopify/react-native-skia';
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { colors, radius } from '../../constants/design';
import { ANSWER_BOX_HEIGHT, DIGIT_COLUMN_WIDTH } from './layout';
import { type InkStroke, strokeToPath, useInkCapture } from './ink';

export interface AnswerBoxProps {
  /** Ink to seed the box with (restored on review/edit). */
  initialStrokes?: InkStroke[];
  /** Reports the full stroke list after each completed stroke or clear. */
  onStrokesChange?: (strokes: InkStroke[]) => void;
  /** Highlights the box as the active one. */
  selected?: boolean;
  onSelect?: () => void;
  accessibilityLabel: string;
  tone?: string;
  /** Column width — kept equal to the printed problem digit columns. */
  columnWidth?: number;
}

/** Stroke width for handwritten answer ink. */
const STROKE_WIDTH = 3;

/** One constrained handwriting box for a single answer digit. */
export function AnswerBox({
  initialStrokes,
  onStrokesChange,
  selected = false,
  onSelect,
  accessibilityLabel,
  tone = colors.text,
  columnWidth = DIGIT_COLUMN_WIDTH,
}: AnswerBoxProps) {
  const ink = useInkCapture(initialStrokes, onStrokesChange);

  const begin = (e: GestureResponderEvent) => {
    onSelect?.();
    ink.beginStroke(e.nativeEvent.locationX, e.nativeEvent.locationY);
  };
  const move = (e: GestureResponderEvent) => {
    ink.extendStroke(e.nativeEvent.locationX, e.nativeEvent.locationY);
  };

  return (
    <View style={[styles.column, { width: columnWidth }]}>
      <View style={styles.clearSlot}>
        {ink.isEmpty ? null : (
          <Pressable
            onPress={ink.clear}
            accessibilityRole="button"
            accessibilityLabel={`${accessibilityLabel} — clear`}
            hitSlop={8}
            style={styles.clearButton}
          >
            <Ionicons name="close" size={12} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      <View
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.box,
          { borderColor: selected ? tone : colors.border },
          selected && styles.boxSelected,
        ]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={begin}
        onResponderMove={move}
        onResponderRelease={ink.endStroke}
        onResponderTerminate={ink.endStroke}
      >
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {ink.strokes.map((stroke, i) => (
            <Path
              key={i}
              path={strokeToPath(stroke)}
              color={colors.text}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              strokeCap="round"
              strokeJoin="round"
            />
          ))}
          {ink.currentStroke ? (
            <Path
              path={strokeToPath(ink.currentStroke)}
              color={colors.text}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              strokeCap="round"
              strokeJoin="round"
            />
          ) : null}
        </Canvas>
      </View>
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
    width: DIGIT_COLUMN_WIDTH - 8,
    height: ANSWER_BOX_HEIGHT,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  boxSelected: { borderWidth: 2.5 },
});
