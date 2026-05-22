import { Ionicons } from '@expo/vector-icons';
import { Canvas, Path } from '@shopify/react-native-skia';
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { colors, radius } from '../../constants/design';
import { type InkStroke, strokeToPath, useInkCapture } from './ink';

export interface CarryBoxProps {
  /** The box's ink. */
  strokes: InkStroke[];
  onStrokesChange: (strokes: InkStroke[]) => void;
  accessibilityLabel: string;
  width: number;
  height: number;
}

const STROKE_WIDTH = 2.5;

/**
 * A small write-in box above a problem column for the kid's carry digit.
 * It is the kid's own working — never recognised, never used for marking.
 */
export function CarryBox({
  strokes,
  onStrokesChange,
  accessibilityLabel,
  width,
  height,
}: CarryBoxProps) {
  const ink = useInkCapture(strokes, onStrokesChange);

  return (
    <View style={{ width, height }}>
      <View
        style={[styles.box, StyleSheet.absoluteFill]}
        accessibilityLabel={accessibilityLabel}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e: GestureResponderEvent) =>
          ink.beginStroke(e.nativeEvent.locationX, e.nativeEvent.locationY)
        }
        onResponderMove={(e: GestureResponderEvent) =>
          ink.extendStroke(e.nativeEvent.locationX, e.nativeEvent.locationY)
        }
        onResponderRelease={ink.endStroke}
        onResponderTerminate={ink.endStroke}
      >
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {ink.strokes.map((stroke, i) => (
            <Path
              key={i}
              path={strokeToPath(stroke)}
              color={colors.textMuted}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              strokeCap="round"
              strokeJoin="round"
            />
          ))}
          {ink.currentStroke ? (
            <Path
              path={strokeToPath(ink.currentStroke)}
              color={colors.textMuted}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              strokeCap="round"
              strokeJoin="round"
            />
          ) : null}
        </Canvas>
      </View>

      {ink.isEmpty ? null : (
        <Pressable
          onPress={ink.clear}
          accessibilityRole="button"
          accessibilityLabel={`${accessibilityLabel} — clear`}
          hitSlop={8}
          style={styles.clear}
        >
          <Ionicons name="close" size={9} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
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
