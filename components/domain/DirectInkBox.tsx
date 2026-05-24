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

export interface DirectInkBoxProps {
  /** The box's ink. */
  strokes: InkStroke[];
  /** Reports the full stroke list after each completed stroke or clear. */
  onStrokesChange: (strokes: InkStroke[]) => void;
  accessibilityLabel: string;
  /** Box height. */
  height: number;
  /**
   * Fixed box width. When omitted the wrapper uses `flex: 1` to share the
   * row evenly (long-division quotient strips); when set the cell renders
   * at exactly that width (division draft grid cells).
   */
  width?: number;
}

const STROKE_WIDTH = 3.5;

/**
 * A handwriting box written into directly — no pop-up pad. Its width flexes to
 * fill the available row, so it is generously sized (the long-division
 * quotient).
 */
export function DirectInkBox({
  strokes,
  onStrokesChange,
  accessibilityLabel,
  height,
  width,
}: DirectInkBoxProps) {
  const ink = useInkCapture(strokes, onStrokesChange);

  return (
    <View style={width === undefined ? styles.wrap : { width }}>
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
        style={[styles.box, { height }]}
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
  /** Flexes to take an equal share of the row's width. */
  wrap: { flex: 1 },
  clearSlot: {
    height: 22,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 4,
  },
  clearButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    alignSelf: 'stretch',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
});
