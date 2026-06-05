import { Canvas, Path } from '@shopify/react-native-skia';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';

import { colors, radius } from '../../../constants/design';
import { NotebookGrid } from '../NotebookGrid';
import { type InkStroke, strokeToPath, useInkCapture } from '../ink';

const STROKE_WIDTH = 3;

export interface HandwritingFieldProps {
  width: number;
  height: number;
  /** Strokes to seed with (uncontrolled after mount; reset by changing `key`). */
  initialStrokes?: InkStroke[];
  onStrokesChange: (strokes: InkStroke[]) => void;
  /** Fired on touch-down / touch-up so a parent can lock page scrolling. */
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
  accessibilityLabel?: string;
}

/**
 * A small notebook-grid box the child writes a number into by hand. Reuses the
 * shared ink primitives (`useInkCapture`, `strokeToPath`, `NotebookGrid`) — the
 * same drawing stack as the scratch canvas — so it stays consistent and touches
 * no operation-specific code. Recognition is applied by the consumer.
 */
export function HandwritingField({
  width,
  height,
  initialStrokes,
  onStrokesChange,
  onDrawStart,
  onDrawEnd,
  accessibilityLabel,
}: HandwritingFieldProps) {
  const ink = useInkCapture(initialStrokes, onStrokesChange);
  const at = (e: GestureResponderEvent): [number, number] => [
    e.nativeEvent.locationX,
    e.nativeEvent.locationY,
  ];
  const endStroke = () => {
    ink.endStroke();
    onDrawEnd?.();
  };

  return (
    <View
      style={[styles.field, { width, height }]}
      accessibilityLabel={accessibilityLabel}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        const [x, y] = at(e);
        ink.beginStroke(x, y);
        onDrawStart?.();
      }}
      onResponderMove={(e) => {
        const [x, y] = at(e);
        ink.extendStroke(x, y);
      }}
      onResponderRelease={endStroke}
      onResponderTerminate={endStroke}
    >
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <NotebookGrid width={width} height={height} />
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
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
