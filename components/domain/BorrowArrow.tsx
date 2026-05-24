import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

import { colors, typography } from '../../constants/design';
import { DIGIT_COLUMN_WIDTH } from './layout';

export interface BorrowArrowProps {
  /** Index of the borrowed-from column within the borrow row (0 = leftmost). */
  column: number;
  /** Number of digit cells in the borrow row. */
  cellCount: number;
  /** Currently unused — colour is fixed to the "correct" green so the
   *  borrow reads as a positive, teacher-y prompt rather than the
   *  operation's accent. Kept on the prop API for future overrides. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tone?: string;
  /** Cell width — should match the BorrowDigitRow so coords align. */
  cellWidth?: number;
  /** Fired once the in/hold/out animation finishes. */
  onDone: () => void;
}

const ARROW_HEIGHT = 96;
const STROKE = 3;
/** Slow, "watching the marker move" pace for the trace itself. */
const TRACE_MS = 1500;
/** Time the arrow + label rest at the destination so the kid can read. */
const HOLD_MS = 1800;
/** Fixed green — friendlier than the subtraction accent (coral). */
const ARROW_COLOR = colors.correct;
/**
 * How far above the anchor line the arc peaks. Bump it up for a more
 * dramatic curve or down for a flatter one — this is the single
 * "amount of arc" knob.
 */
const ARC_LIFT = 16;
/** Vertical position of the arrow's feet, measured down from the top of
 *  the cell. Sits right at the annotation / digit border so the arrow
 *  hovers immediately above the numbers, not high up near the top edge. */
const ANCHOR_Y = 28;
/** Horizontal inset from the inner cell boundary where each foot lands.
 *  Larger = feet sit closer to their cell's digit (further from the
 *  boundary between the two cells). */
const ANCHOR_X_INSET = 12;

/**
 * One-shot curved arrow that traces from the borrowed-from digit's
 * annotation toward the receiving column with a `+10` label arriving at
 * the destination. Pace is deliberately slow so a kid sees the borrow
 * happen, not just the result.
 */
export function BorrowArrow({
  column,
  cellCount,
  cellWidth = DIGIT_COLUMN_WIDTH,
  onDone,
}: BorrowArrowProps) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const traceValue = useRef(new Animated.Value(0)).current;
  // Mirror the Skia trim progress as React state so the `Path`'s `end`
  // prop re-renders. Cheap — only updates while the trace is running.
  const [trace, setTrace] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const sub = traceValue.addListener(({ value }) => setTrace(value));
    const seq = Animated.sequence([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(traceValue, {
        toValue: 1,
        duration: TRACE_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(HOLD_MS),
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 420,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(labelOpacity, {
          toValue: 0,
          duration: 420,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);
    seq.start(({ finished }) => {
      if (finished) doneRef.current();
    });
    return () => {
      traceValue.removeListener(sub);
      seq.stop();
    };
  }, [labelOpacity, overlayOpacity, traceValue]);

  const { curve, head, width, label } = useMemo(
    () => buildArrow(column, cellCount, cellWidth),
    [column, cellCount, cellWidth],
  );

  const arrowheadVisible = trace >= 1;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.overlay,
        { width, height: ARROW_HEIGHT, opacity: overlayOpacity },
      ]}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Path
          path={curve}
          color={ARROW_COLOR}
          style="stroke"
          strokeWidth={STROKE}
          strokeCap="round"
          start={0}
          end={trace}
        />
        {arrowheadVisible ? (
          <Path
            path={head}
            color={ARROW_COLOR}
            style="stroke"
            strokeWidth={STROKE}
            strokeCap="round"
            strokeJoin="round"
          />
        ) : null}
      </Canvas>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.label,
          {
            left: label.x,
            top: label.y,
            opacity: labelOpacity,
            backgroundColor: ARROW_COLOR,
          },
        ]}
      >
        <Text style={styles.labelText}>+10</Text>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Build the curve + arrowhead paths and the "+10" label position for a
 * borrow from `column` into `column+1`. All coords live in the overlay's
 * local space (left = 0, top = 0).
 */
function buildArrow(column: number, cellCount: number, cellWidth: number) {
  const cw = cellWidth;
  const width = cellCount * cw;

  // Symmetric design: the arrow's two "feet" anchor at the inner top
  // corners of the source and destination cells — top-right corner of
  // the source, top-left corner of the destination — both at the same
  // y. That means the entry / exit tangent angles mirror each other.
  // The curve arcs UP into the gap between the cells (never inside any
  // cell), so it never touches the digit text or the annotations.
  const startX = (column + 1) * cw - ANCHOR_X_INSET;
  const startY = ANCHOR_Y;
  const endX = (column + 1) * cw + ANCHOR_X_INSET;
  const endY = ANCHOR_Y;

  // Control point sits centred between the feet, lifted above the row.
  // `ARC_LIFT` is the single knob — larger = more dramatic arc, smaller
  // = flatter.
  const ctrlX = (startX + endX) / 2;
  const ctrlY = ANCHOR_Y - ARC_LIFT;

  const curve = Skia.Path.Make();
  curve.moveTo(startX, startY);
  curve.quadTo(ctrlX, ctrlY, endX, endY);

  // Tangent at t=1 of the quadratic Bézier = 2 * (end - control).
  const tx = endX - ctrlX;
  const ty = endY - ctrlY;
  const tlen = Math.hypot(tx, ty) || 1;
  const ux = tx / tlen;
  const uy = ty / tlen;
  // Smaller arrowhead — `back` is the length from tip to base, `spread`
  // is the half-width at the base.
  const back = 6;
  const spread = 4;
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

  // Bezier midpoint (t=0.5) — peak of the arc. Place the "+10" label
  // above the peak so it sits over the arrow's apex without overlapping
  // either digit cell. Label is ~36×20pt.
  const peakX = 0.25 * startX + 0.5 * ctrlX + 0.25 * endX;
  const peakY = 0.25 * startY + 0.5 * ctrlY + 0.25 * endY;
  const label = { x: peakX - 18, y: peakY - 24 };

  return { curve, head, width, label };
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0 },
  label: {
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  labelText: {
    color: colors.surface,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },
});
