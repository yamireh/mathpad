import { Ionicons } from '@expo/vector-icons';
import { Canvas, Path } from '@shopify/react-native-skia';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '../../constants/design';
import { fitStrokes, type InkStroke, strokeToPath } from './ink';

export interface CarryBoxProps {
  /** The box's carry ink (captured in the answer pad, shown here scaled). */
  strokes: InkStroke[];
  /** Highlighted as the box the answer pad is currently writing into. */
  selected: boolean;
  /** Tap to focus the writing pad on this carry box. */
  onSelect: () => void;
  /** Clear this carry box. */
  onClear: () => void;
  accessibilityLabel: string;
  tone?: string;
  width: number;
  height: number;
}

/**
 * A small carry box above a problem column. Tapping it focuses the writing
 * pad (same as an answer box); the kid's carry digit shows here scaled. It is
 * the kid's own working — never recognised, never used for marking.
 */
export function CarryBox({
  strokes,
  selected,
  onSelect,
  onClear,
  accessibilityLabel,
  tone = colors.text,
  width,
  height,
}: CarryBoxProps) {
  const transform = fitStrokes(strokes, width, height, 5);
  const hasInk = strokes.length > 0;

  return (
    <View style={{ width, height }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected }}
        onPress={onSelect}
        style={[
          styles.box,
          StyleSheet.absoluteFill,
          { borderColor: selected ? tone : colors.border },
          selected && styles.boxSelected,
        ]}
      >
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {strokes.map((stroke, i) => (
            <Path
              key={i}
              path={strokeToPath(stroke, transform)}
              color={colors.textMuted}
              style="stroke"
              strokeWidth={2.5}
              strokeCap="round"
              strokeJoin="round"
            />
          ))}
        </Canvas>
      </Pressable>

      {hasInk ? (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel={`${accessibilityLabel} — clear`}
          hitSlop={8}
          style={styles.clear}
        >
          <Ionicons name="close" size={9} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  boxSelected: { borderWidth: 2, borderStyle: 'solid' },
  clear: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
