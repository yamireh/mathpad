import { Canvas, Path } from '@shopify/react-native-skia';
import { forwardRef, useImperativeHandle } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';

import { colors, radius } from '../../../constants/design';
import { NotebookGrid } from '../NotebookGrid';
import { type InkStroke, strokeToFreehandPath, useInkCapture } from '../ink';

export interface HandwritingFieldHandle {
  /** Remove the last stroke. */
  undo: () => void;
  /** Erase all ink. */
  clear: () => void;
}

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
 * shared ink primitives (`useInkCapture`, `strokeToFreehandPath`, `NotebookGrid`) — the
 * same drawing stack as the scratch canvas — so it stays consistent and touches
 * no operation-specific code. Recognition is applied by the consumer.
 */
export const HandwritingField = forwardRef<
  HandwritingFieldHandle,
  HandwritingFieldProps
>(function HandwritingField(
  {
    width,
    height,
    initialStrokes,
    onStrokesChange,
    onDrawStart,
    onDrawEnd,
    accessibilityLabel,
  },
  ref,
) {
  const ink = useInkCapture(initialStrokes, onStrokesChange);
  useImperativeHandle(ref, () => ({ undo: ink.undo, clear: ink.clear }), [
    ink.undo,
    ink.clear,
  ]);
  // Pen weight scaled to this (smaller) field — tuned to sit between the big
  // pad's 12px (too bold here) and a strictly-proportional ~7px (too thin).
  const penSize = Math.max(9, Math.round(height * 0.05));
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
            path={strokeToFreehandPath(stroke, true, penSize)}
            color={colors.text}
            style="fill"
          />
        ))}
        {ink.currentStroke ? (
          <Path
            path={strokeToFreehandPath(ink.currentStroke, false, penSize)}
            color={colors.text}
            style="fill"
          />
        ) : null}
      </Canvas>
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
