/**
 * Ink model and capture for handwriting (Skia + RN gesture responder).
 *
 * Reuses the stroke-capture pattern validated in the recognition POC: touches
 * are captured via the RN responder system as timed `[x, y, t]` points; Skia
 * renders them. Strokes feed straight into the recognition adapter.
 */
import { useCallback, useReducer, useRef } from 'react';
import { Skia, type SkPath } from '@shopify/react-native-skia';

import type { AnswerShape } from './layout';

/** A captured point: x, y (surface-local px) and t (ms since stroke start). */
export type InkPoint = [x: number, y: number, t: number];

/** A single pen stroke. */
export type InkStroke = InkPoint[];

/** A scale + translate applied when rendering a stroke. */
export interface PathTransform {
  scale: number;
  dx: number;
  dy: number;
}

const IDENTITY: PathTransform = { scale: 1, dx: 0, dy: 0 };

/** Build a Skia path from a stroke, optionally scaled/translated. */
export function strokeToPath(
  stroke: InkStroke,
  transform: PathTransform = IDENTITY,
): SkPath {
  const path = Skia.Path.Make();
  if (stroke.length === 0) return path;
  const tx = (x: number) => x * transform.scale + transform.dx;
  const ty = (y: number) => y * transform.scale + transform.dy;
  path.moveTo(tx(stroke[0][0]), ty(stroke[0][1]));
  for (let i = 1; i < stroke.length; i += 1) {
    path.lineTo(tx(stroke[i][0]), ty(stroke[i][1]));
  }
  if (stroke.length === 1) {
    path.lineTo(tx(stroke[0][0]) + 0.5, ty(stroke[0][1]) + 0.5);
  }
  return path;
}

/** Axis-aligned bounds of a stroke set, or null when there is no ink. */
export interface StrokeBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function strokesBounds(strokes: InkStroke[]): StrokeBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;
  for (const stroke of strokes) {
    for (const [x, y] of stroke) {
      found = true;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return found ? { minX, minY, maxX, maxY } : null;
}

/** Squared distance from a point to (x, y). */
function distanceSquared(point: InkPoint, x: number, y: number): number {
  const dx = point[0] - x;
  const dy = point[1] - y;
  return dx * dx + dy * dy;
}

/** Imperative handle over a surface's strokes. */
export interface InkCapture {
  strokes: InkStroke[];
  currentStroke: InkStroke | null;
  isEmpty: boolean;
  beginStroke: (x: number, y: number) => void;
  extendStroke: (x: number, y: number) => void;
  endStroke: () => void;
  /** Erase whole strokes passing within `radius` of (x, y). */
  eraseNear: (x: number, y: number, radius: number) => void;
  undo: () => void;
  clear: () => void;
}

/**
 * Capture pen strokes for one surface (the answer pad or the scratch canvas).
 *
 * Uncontrolled with an initial value: drawing updates internal refs (cheap, no
 * re-render storms), and `onCommit` reports the full stroke list after each
 * completed stroke / erase / clear so a parent can persist it.
 */
export function useInkCapture(
  initialStrokes: InkStroke[] = [],
  onCommit?: (strokes: InkStroke[]) => void,
): InkCapture {
  const strokesRef = useRef<InkStroke[]>(initialStrokes.map((s) => [...s]));
  const currentRef = useRef<InkStroke | null>(null);
  const startRef = useRef(0);
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  const beginStroke = useCallback((x: number, y: number) => {
    startRef.current = Date.now();
    currentRef.current = [[x, y, 0]];
    forceRender();
  }, []);

  const extendStroke = useCallback((x: number, y: number) => {
    if (!currentRef.current) return;
    currentRef.current.push([x, y, Date.now() - startRef.current]);
    forceRender();
  }, []);

  const endStroke = useCallback(() => {
    if (currentRef.current && currentRef.current.length > 0) {
      strokesRef.current = [...strokesRef.current, currentRef.current];
      onCommit?.(strokesRef.current);
    }
    currentRef.current = null;
    forceRender();
  }, [onCommit]);

  const eraseNear = useCallback(
    (x: number, y: number, radius: number) => {
      const r2 = radius * radius;
      const remaining = strokesRef.current.filter(
        (stroke) => !stroke.some((p) => distanceSquared(p, x, y) <= r2),
      );
      if (remaining.length !== strokesRef.current.length) {
        strokesRef.current = remaining;
        onCommit?.(strokesRef.current);
        forceRender();
      }
    },
    [onCommit],
  );

  const undo = useCallback(() => {
    strokesRef.current = strokesRef.current.slice(0, -1);
    onCommit?.(strokesRef.current);
    forceRender();
  }, [onCommit]);

  const clear = useCallback(() => {
    strokesRef.current = [];
    currentRef.current = null;
    onCommit?.([]);
    forceRender();
  }, [onCommit]);

  return {
    strokes: strokesRef.current,
    currentStroke: currentRef.current,
    isEmpty: strokesRef.current.length === 0 && currentRef.current === null,
    beginStroke,
    extendStroke,
    endStroke,
    eraseNear,
    undo,
    clear,
  };
}

/* -------------------------------------------------------------------------- */
/* Answer-area ink                                                              */
/* -------------------------------------------------------------------------- */

/** Ink for a whole answer area — one stroke list per box. */
export interface AnswerInk {
  /** Strokes in the leading minus-sign box. */
  sign: InkStroke[];
  /** Strokes per integer digit box. */
  integer: InkStroke[][];
  /** Strokes per decimal digit box. */
  decimal: InkStroke[][];
  /** Strokes per remainder digit box. */
  remainder: InkStroke[][];
}

/** An empty AnswerInk matching the box counts of a question's answer shape. */
export function emptyAnswerInk(shape: AnswerShape): AnswerInk {
  const rows = (n: number): InkStroke[][] =>
    Array.from({ length: n }, () => []);
  return {
    sign: [],
    integer: rows(shape.integerBoxes),
    decimal: rows(shape.decimalBoxes),
    remainder: rows(shape.remainderBoxes),
  };
}

/** Box id scheme: `sign`, `int-N`, `dec-N`, `rem-N`. */
export function getBoxStrokes(ink: AnswerInk, boxId: string): InkStroke[] {
  if (boxId === 'sign') return ink.sign;
  const [kind, idx] = boxId.split('-');
  const i = Number(idx);
  if (kind === 'int') return ink.integer[i] ?? [];
  if (kind === 'dec') return ink.decimal[i] ?? [];
  if (kind === 'rem') return ink.remainder[i] ?? [];
  return [];
}

/** Return a copy of `ink` with one box's strokes replaced. */
export function setBoxStrokes(
  ink: AnswerInk,
  boxId: string,
  strokes: InkStroke[],
): AnswerInk {
  if (boxId === 'sign') return { ...ink, sign: strokes };
  const [kind, idx] = boxId.split('-');
  const i = Number(idx);
  const replace = (rows: InkStroke[][]) =>
    rows.map((s, r) => (r === i ? strokes : s));
  if (kind === 'int') return { ...ink, integer: replace(ink.integer) };
  if (kind === 'dec') return { ...ink, decimal: replace(ink.decimal) };
  if (kind === 'rem') return { ...ink, remainder: replace(ink.remainder) };
  return ink;
}
