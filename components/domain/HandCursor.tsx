/**
 * HandCursor — the little pointing hand used in the auto-solve demo (and ad
 * capture). It hovers over the writing pad and actually *writes* each digit:
 * the fingertip traces the digit's pen-path while the black ink is revealed
 * under it, then the number reflects into the box above (mirroring the kid).
 *
 * Purely presentational: `target` says where the pad surface is; each change
 * of `traceNonce` writes the current `digit`. On/off gating + the pad position
 * live in `OperationsWorkspace`.
 */
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion, operationColors } from '../../constants/design';
import { digitWriting } from '../../lib/solver/digitInk';
import type { CursorTarget } from './cursorTarget';

/** Hand colour — a distinct blue so it reads clearly over the black ink. */
const HAND_COLOR = operationColors.addition.accent;

/** Hand glyph size; the pointing fingertip sits near its top-centre. */
const SIZE = 46;
/** Glyph height of the written digit, in px. */
const TRACE_SIZE = 66;
/** Skia canvas box around the digit (room for the round stroke caps). */
const CANVAS = TRACE_SIZE + 20;
const HALF = CANVAS / 2;
/** Ink stroke width on the pad. */
const INK_WIDTH = 6;
/** Time spent on the drawing strokes of a digit (pen-up hops add a little). */
const DRAW_MS = 900;
/** How long the hand takes to glide from one spot to the next. */
const MOVE_MS = 650;
/** Max strokes any digit needs (4 and 5 use two; the rest one). */
const MAX_STROKES = 3;

export interface HandCursorProps {
  /** Point to hover over (workspace-root coords), or null to hide. */
  target: CursorTarget | null;
  /** `write` traces a digit on the pad; `tap` is a press (e.g. a borrow). */
  mode: 'write' | 'tap';
  /** The digit currently being written (write mode). */
  digit: number;
  /** Bumped once per action to (re)play the writing or tap. */
  actionNonce: number;
}

/** Animated pointing-hand overlay that writes digits / taps for the demo. */
export function HandCursor({
  target,
  mode,
  digit,
  actionNonce,
}: HandCursorProps) {
  // Base hover position over the pad.
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  // Fingertip writing offset, layered on top of the hover position.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  // Per-stroke ink reveal (0 → 1 trims each stroke into view). Fixed-size pool.
  const e0 = useSharedValue(0);
  const e1 = useSharedValue(0);
  const e2 = useSharedValue(0);
  const ends = useMemo(() => [e0, e1, e2], [e0, e1, e2]);
  // Skip the move animation on first placement so the hand doesn't fly in.
  const placed = useSharedValue(false);
  // Latest target, read inside the action effect without making it a dep (which
  // would replay the write/tap whenever the target is re-measured).
  const targetRef = useRef(target);
  targetRef.current = target;

  // Skia paths for the current digit's strokes (canvas-local coordinates).
  const paths = useMemo(() => {
    const w = digitWriting(digit, TRACE_SIZE, DRAW_MS);
    if (!w) return [];
    return w.strokes.slice(0, MAX_STROKES).map((stroke) => {
      const p = Skia.Path.Make();
      stroke.pts.forEach(([px, py], i) => {
        if (i === 0) p.moveTo(px + HALF, py + HALF);
        else p.lineTo(px + HALF, py + HALF);
      });
      return p;
    });
  }, [digit]);

  useEffect(() => {
    if (!target) {
      opacity.value = withTiming(0, { duration: motion.duration.base });
      return;
    }
    if (placed.value) {
      const ease = Easing.inOut(Easing.ease);
      x.value = withTiming(target.x, { duration: MOVE_MS, easing: ease });
      y.value = withTiming(target.y, { duration: MOVE_MS, easing: ease });
    } else {
      x.value = target.x;
      y.value = target.y;
      placed.value = true;
    }
    opacity.value = withTiming(1, { duration: motion.duration.fast });
  }, [target, opacity, placed, x, y]);

  useEffect(() => {
    if (actionNonce <= 0) return;
    // If the hand has to travel to this target, hold the action until it lands.
    const t = targetRef.current;
    const dx = (t?.x ?? x.value) - x.value;
    const dy = (t?.y ?? y.value) - y.value;
    const startDelay = Math.hypot(dx, dy) > 40 ? MOVE_MS : 0;

    if (mode === 'tap') {
      // No ink — just a press at the target (used for borrows).
      ends.forEach((e) => {
        e.value = 0;
      });
      tx.value = 0;
      ty.value = 0;
      scale.value = withDelay(
        startDelay,
        withSequence(
          withTiming(0.84, { duration: 130 }),
          withSpring(1, { damping: 9 }),
        ),
      );
      return;
    }
    const w = digitWriting(digit, TRACE_SIZE, DRAW_MS);
    if (!w) return;
    const { xs, ys, durations, total, strokes } = w;
    // Fingertip steps through the pen-path at a steady writing pace.
    tx.value = withDelay(
      startDelay,
      withSequence(
        ...durations.map((d, i) =>
          withTiming(xs[i + 1], { duration: d, easing: Easing.linear }),
        ),
      ),
    );
    ty.value = withDelay(
      startDelay,
      withSequence(
        ...durations.map((d, i) =>
          withTiming(ys[i + 1], { duration: d, easing: Easing.linear }),
        ),
      ),
    );
    // Reveal each stroke's ink over the same window the fingertip draws it.
    ends.forEach((e, i) => {
      const stroke = strokes[i];
      e.value = 0;
      if (stroke) {
        e.value = withDelay(
          startDelay + stroke.delay,
          withTiming(1, { duration: stroke.duration, easing: Easing.linear }),
        );
      }
    });
    // A gentle "pen-press" held through the writing.
    scale.value = withDelay(
      startDelay,
      withSequence(
        withTiming(0.93, { duration: 120 }),
        withTiming(0.93, { duration: Math.max(0, total - 240) }),
        withTiming(1, { duration: 120 }),
      ),
    );
  }, [actionNonce, mode, digit, ends, scale, tx, ty, x, y]);

  const inkStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value - HALF },
      { translateY: y.value - HALF },
    ],
  }));

  const handStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      // Align the fingertip (top-centre of the glyph) onto the writing point.
      { translateX: x.value + tx.value - SIZE / 2 },
      { translateY: y.value + ty.value - 2 },
      { scale: scale.value },
    ],
  }));

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.ink, inkStyle]}>
        <Canvas style={styles.canvas}>
          {paths.map((p, i) => (
            <Path
              key={i}
              path={p}
              color={colors.text}
              style="stroke"
              strokeWidth={INK_WIDTH}
              strokeCap="round"
              strokeJoin="round"
              start={0}
              end={ends[i]}
            />
          ))}
        </Canvas>
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.hand, handStyle]}>
        <MaterialCommunityIcons
          name="hand-pointing-up"
          size={SIZE}
          color={HAND_COLOR}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  ink: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CANVAS,
    height: CANVAS,
  },
  canvas: { flex: 1 },
  hand: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    // Lift it off the surface so it stays legible over the pad.
    shadowColor: '#1C1C28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
});
