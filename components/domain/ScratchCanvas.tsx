import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import {
  type GestureResponderEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/design';
import { useScratchSound } from '../../hooks/useScratchSound';
import { type InkStroke, strokeToPath, useInkCapture } from './ink';

/** Notebook grid spacing, in px. */
const GRID_STEP = 26;
/** Faint graph-paper line colour. */
const GRID_COLOR = 'rgba(99, 112, 121, 0.10)';

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
  /** Faint corner watermark (e.g. "Workspace") so the blank area reads as
   *  intentional, like a notebook page. */
  label?: string;
}

const STROKE_WIDTH = 3;
/** Whole strokes within this radius of an eraser touch are removed. */
const ERASER_RADIUS = 24;
/**
 * Idle time after the last finger movement before the scratch sound is
 * paused. Any new move resets the timer, so the sound only plays while
 * the finger is actually moving — a stationary finger goes silent.
 */
const SCRATCH_IDLE_MS = 120;

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
    label,
  },
  ref,
) {
  const ink = useInkCapture(initialStrokes, onStrokesChange);
  const sound = useScratchSound();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notebook grid — rebuilt only when the surface is resized.
  const [size, setSize] = useState({ w: 0, h: 0 });
  const grid = useMemo(() => {
    const { w, h } = size;
    if (w === 0 || h === 0) return null;
    const path = Skia.Path.Make();
    for (let x = GRID_STEP; x < w; x += GRID_STEP) {
      path.moveTo(x, 0);
      path.lineTo(x, h);
    }
    for (let y = GRID_STEP; y < h; y += GRID_STEP) {
      path.moveTo(0, y);
      path.lineTo(w, y);
    }
    return path;
  }, [size]);

  useImperativeHandle(
    ref,
    () => ({ undo: ink.undo, clear: ink.clear }),
    [ink.undo, ink.clear],
  );

  // Clear any pending idle timer if the component unmounts mid-stroke so
  // it can't fire on a released player.
  useEffect(
    () => () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    },
    [],
  );

  const at = (e: GestureResponderEvent): [number, number] => [
    e.nativeEvent.locationX,
    e.nativeEvent.locationY,
  ];

  const scheduleMute = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      sound.mute();
      idleTimerRef.current = null;
    }, SCRATCH_IDLE_MS);
  };

  const cancelMute = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const begin = (e: GestureResponderEvent) => {
    const [x, y] = at(e);
    if (tool === 'eraser') ink.eraseNear(x, y, ERASER_RADIUS);
    else {
      ink.beginStroke(x, y);
      // Arm the player (start the silent looped audio) so the first
      // movement can crank the volume up without expo-audio start-up
      // latency. Stays silent until a move event arrives.
      sound.arm();
    }
  };
  const move = (e: GestureResponderEvent) => {
    const [x, y] = at(e);
    if (tool === 'eraser') {
      ink.eraseNear(x, y, ERASER_RADIUS);
      return;
    }
    ink.extendStroke(x, y);
    sound.audible();
    scheduleMute();
  };
  const release = () => {
    if (tool === 'pen') ink.endStroke();
    cancelMute();
    sound.release();
  };

  return (
    <View
      style={[styles.canvas, bordered ? styles.bordered : null]}
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) =>
        setSize({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={begin}
      onResponderMove={move}
      onResponderRelease={release}
      onResponderTerminate={release}
    >
      {label ? (
        <Text style={styles.label} pointerEvents="none">
          {label}
        </Text>
      ) : null}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {grid ? (
          <Path
            path={grid}
            color={GRID_COLOR}
            style="stroke"
            strokeWidth={1}
          />
        ) : null}
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
  label: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    zIndex: 1,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
    opacity: 0.45,
  },
});

