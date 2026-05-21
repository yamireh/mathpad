import { forwardRef, useImperativeHandle } from 'react';
import { Canvas, Path } from '@shopify/react-native-skia';
import {
  type GestureResponderEvent,
  StyleSheet,
  View,
} from 'react-native';

import { colors, radius } from '../../constants/design';
import { type InkStroke, strokeToPath, useInkCapture } from './ink';

export type ScratchTool = 'pen' | 'eraser';

export interface ScratchCanvasHandle {
  undo: () => void;
  clear: () => void;
}

export interface ScratchCanvasProps {
  /** Active tool. */
  tool: ScratchTool;
  /** Ink to seed the canvas with (restored on review/edit). */
  initialStrokes?: InkStroke[];
  onStrokesChange?: (strokes: InkStroke[]) => void;
  accessibilityLabel?: string;
  /** Draw the surface's own border. Off when an outer frame supplies one. */
  bordered?: boolean;
}

const STROKE_WIDTH = 3;
/** Whole strokes within this radius of an eraser touch are removed. */
const ERASER_RADIUS = 24;

/**
 * Large free-form drawing surface for the kid's working out. Never recognised
 * and never used for marking — it is just for the kid (SPEC § Practice).
 */
export const ScratchCanvas = forwardRef<
  ScratchCanvasHandle,
  ScratchCanvasProps
>(function ScratchCanvas(
  {
    tool,
    initialStrokes,
    onStrokesChange,
    accessibilityLabel,
    bordered = true,
  },
  ref,
) {
  const ink = useInkCapture(initialStrokes, onStrokesChange);

  useImperativeHandle(
    ref,
    () => ({ undo: ink.undo, clear: ink.clear }),
    [ink.undo, ink.clear],
  );

  const at = (e: GestureResponderEvent): [number, number] => [
    e.nativeEvent.locationX,
    e.nativeEvent.locationY,
  ];

  const begin = (e: GestureResponderEvent) => {
    const [x, y] = at(e);
    if (tool === 'eraser') ink.eraseNear(x, y, ERASER_RADIUS);
    else ink.beginStroke(x, y);
  };
  const move = (e: GestureResponderEvent) => {
    const [x, y] = at(e);
    if (tool === 'eraser') ink.eraseNear(x, y, ERASER_RADIUS);
    else ink.extendStroke(x, y);
  };
  const release = () => {
    if (tool === 'pen') ink.endStroke();
  };

  return (
    <View
      style={[styles.canvas, bordered ? styles.bordered : null]}
      accessibilityLabel={accessibilityLabel}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={begin}
      onResponderMove={move}
      onResponderRelease={release}
      onResponderTerminate={release}
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
  );
});

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  bordered: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
