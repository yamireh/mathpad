import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { DIGIT_COLUMN_WIDTH } from './layout';

export interface BorrowArrowProps {
  /** Index of the borrowed-from column within the borrow row (0 = leftmost). */
  column: number;
  /** Number of digit cells in the borrow row. */
  cellCount: number;
  tone: string;
  /** Fired once the in/hold/out animation finishes. */
  onDone: () => void;
}

const ARROW_HEIGHT = 96;
const STROKE = 3;

/**
 * A one-shot curved arrow that flows from the borrowed-from digit's
 * annotation down-right toward the receiving column. Fades in, holds, fades
 * out, then signals `onDone` so the tip can be marked seen.
 */
export function BorrowArrow({
  column,
  cellCount,
  tone,
  onDone,
}: BorrowArrowProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const seq = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(1100),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 360,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    seq.start(({ finished }) => {
      if (finished) doneRef.current();
    });
    return () => seq.stop();
  }, [opacity]);

  const { curve, head, width } = useMemo(
    () => buildArrow(column, cellCount),
    [column, cellCount],
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, { width, height: ARROW_HEIGHT, opacity }]}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Path
          path={curve}
          color={tone}
          style="stroke"
          strokeWidth={STROKE}
          strokeCap="round"
        />
        <Path
          path={head}
          color={tone}
          style="stroke"
          strokeWidth={STROKE}
          strokeCap="round"
          strokeJoin="round"
        />
      </Canvas>
    </Animated.View>
  );
}

/**
 * Build the curve + arrowhead paths for a borrow from `column` into `column+1`.
 * Coordinates live in the overlay's own space (left = 0, top = 0).
 */
function buildArrow(column: number, cellCount: number) {
  const cw = DIGIT_COLUMN_WIDTH;
  const width = cellCount * cw;

  // Start: near the top of the source column's annotation slot.
  const startX = column * cw + cw * 0.7;
  const startY = 6;

  // End: hovering just above the next column's digit.
  const endX = (column + 1) * cw + cw * 0.5;
  const endY = 64;

  // Control: pulled up and to the right, giving the curve a gentle arc.
  const ctrlX = (column + 1) * cw + cw * 0.35;
  const ctrlY = -6;

  const curve = Skia.Path.Make();
  curve.moveTo(startX, startY);
  curve.quadTo(ctrlX, ctrlY, endX, endY);

  // Tangent at t=1 of the quadratic Bézier = 2 * (end - control).
  const tx = endX - ctrlX;
  const ty = endY - ctrlY;
  const tlen = Math.hypot(tx, ty) || 1;
  const ux = tx / tlen;
  const uy = ty / tlen;
  // Step back from the tip along the arrow direction, then offset perpendicularly.
  const back = 9;
  const spread = 6;
  const baseX = endX - ux * back;
  const baseY = endY - uy * back;
  const leftX = baseX - uy * spread;
  const leftY = baseY + ux * spread;
  const rightX = baseX + uy * spread;
  const rightY = baseY - ux * spread;

  const head = Skia.Path.Make();
  head.moveTo(leftX, leftY);
  head.lineTo(endX, endY);
  head.lineTo(rightX, rightY);

  return { curve, head, width };
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0 },
});
