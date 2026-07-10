/**
 * Synthetic ink-stroke shapes for digits 0–9. Used by the Solve animation
 * (and any future e2e flow) so the auto-solver writes "handwriting" into
 * cells the same way the kid does.
 *
 * Coordinates live in an arbitrary 0–100 box; `AnswerBox.fitTransform`
 * auto-scales each stroke set into whatever cell it's rendered in, so the
 * digits keep their relative shape regardless of cell width/height.
 */
import type { InkStroke } from '../../components/domain/ink';

/** One polyline (one pen-down → pen-up gesture). */
type Polyline = ReadonlyArray<readonly [number, number]>;

/** Digit shape: 1 or more polylines (strokes). Each stroke is a sequence of points. */
const SHAPES: Record<number, ReadonlyArray<Polyline>> = {
  0: [
    [
      [50, 8], [32, 12], [18, 30], [12, 50], [18, 72], [32, 90],
      [50, 95], [68, 90], [82, 72], [88, 50], [82, 30], [68, 12], [50, 8],
    ],
  ],
  1: [
    [[32, 25], [50, 10], [50, 92]],
  ],
  2: [
    [
      [15, 28], [22, 12], [40, 6], [62, 8], [80, 22], [82, 40],
      [62, 56], [38, 70], [20, 84], [15, 92], [85, 92],
    ],
  ],
  3: [
    [
      [15, 22], [30, 10], [55, 8], [75, 18], [78, 36], [62, 48], [42, 50],
      [62, 52], [80, 64], [78, 82], [58, 92], [32, 92], [15, 80],
    ],
  ],
  4: [
    [[58, 8], [12, 65], [86, 65]],
    [[62, 8], [62, 92]],
  ],
  5: [
    [[80, 10], [22, 10], [18, 48]],
    [
      [18, 48], [40, 42], [62, 46], [80, 58], [82, 76], [68, 90], [42, 94], [18, 86],
    ],
  ],
  6: [
    [
      [78, 12], [56, 14], [38, 22], [22, 38], [14, 60], [16, 80], [32, 92],
      [54, 94], [74, 88], [84, 72], [82, 56], [68, 48], [48, 48], [30, 54], [20, 66],
    ],
  ],
  7: [
    [[16, 10], [84, 10], [70, 30], [50, 60], [40, 92]],
  ],
  8: [
    [
      [50, 50], [32, 46], [20, 32], [22, 18], [38, 8], [56, 8], [74, 16],
      [80, 30], [72, 44], [56, 52], [38, 58], [22, 70], [20, 84],
      [34, 92], [56, 94], [76, 88], [82, 74], [74, 60], [56, 52], [50, 50],
    ],
  ],
  9: [
    [
      [78, 50], [60, 54], [40, 50], [22, 38], [18, 24], [28, 12], [48, 8],
      [68, 10], [82, 22], [86, 40], [82, 60], [70, 76], [54, 92], [32, 96],
    ],
  ],
};

/** A flat timestamp grows by `dt` per point so the stroke type is well-formed. */
const POINT_DT = 8;

/** Build the synthetic ink strokes for a single digit (0–9). */
export function digitInk(digit: number): InkStroke[] {
  const polylines = SHAPES[digit];
  if (!polylines) return [];
  return polylines.map((line) => {
    let t = 0;
    return line.map(([x, y]) => {
      const point: [number, number, number] = [x, y, t];
      t += POINT_DT;
      return point;
    });
  });
}

/**
 * Inverse of {@link digitInk}: because `digitInk(d)` is deterministic, a cell
 * whose ink is exactly a canonical glyph maps 1:1 back to its digit. Lets a
 * recognized cell render a clean printed number instead of the glyph ink, with
 * no change to the strokes-as-source-of-truth model. Raw, mid-writing
 * handwriting (or a non-digit mark like the minus sign) matches nothing and
 * returns null.
 */
const CANONICAL_DIGIT: ReadonlyMap<string, number> = new Map(
  Array.from(
    { length: 10 },
    (_, d) => [JSON.stringify(digitInk(d)), d] as const,
  ),
);

export function canonicalDigit(strokes: InkStroke[]): number | null {
  if (strokes.length === 0) return null;
  return CANONICAL_DIGIT.get(JSON.stringify(strokes)) ?? null;
}

/**
 * A timed fingertip path for "writing" a digit, used by the demo HandCursor.
 *
 * Returns offsets relative to a centre point (so the caller adds them to the
 * pad centre), plus a per-segment duration so the hand moves at a steady
 * writing pace and slows for nothing. The path eases in from rest, traces each
 * stroke, makes a quick pen-up hop between multi-stroke digits, and returns to
 * rest at the end.
 */
/** One stroke of a digit: its points plus when it's drawn within the trace. */
export interface DigitStroke {
  /** Points (centred offsets, px) of this stroke. */
  pts: Array<[number, number]>;
  /** Ms from trace start until this stroke begins drawing. */
  delay: number;
  /** Ms spent drawing this stroke. */
  duration: number;
}

export interface DigitWriting {
  /** Fingertip X offsets through the path, starting and ending at 0 (rest). */
  xs: number[];
  /** Fingertip Y offsets, paired with `xs`. */
  ys: number[];
  /** Ms to travel from point i to i+1. Length is `xs.length - 1`. */
  durations: number[];
  /** Sum of `durations`. */
  total: number;
  /** Per-stroke geometry + timing, for revealing the ink under the fingertip. */
  strokes: DigitStroke[];
}

/** Duration of a pen-up move (lead-in, stroke break, trail-out). */
const MOVE_MS = 130;

/**
 * Plan how the demo hand writes `digit`: the fingertip path (`xs`/`ys`/
 * `durations`) and the per-stroke ink reveal (`strokes`), both derived from the
 * same shape so the black lines appear exactly under the moving fingertip. The
 * glyph is ~`size` px tall and the drawing shares `drawMs` by stroke length.
 */
export function digitWriting(
  digit: number,
  size = 64,
  drawMs = 900,
): DigitWriting | null {
  const polylines = SHAPES[digit];
  if (!polylines) return null;
  const scale = size / 100;
  const at = ([x, y]: readonly [number, number]): [number, number] => [
    (x - 50) * scale,
    (y - 50) * scale,
  ];

  // Per-stroke points + length, to split drawMs and time each stroke.
  const strokePts = polylines.map((line) => line.map(at));
  const strokeLen = strokePts.map((pts) => {
    let len = 0;
    for (let i = 1; i < pts.length; i += 1) {
      len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    return len;
  });
  const totalLen = strokeLen.reduce((a, b) => a + b, 0) || 1;

  const strokes: DigitStroke[] = [];
  let cursor = MOVE_MS; // lead-in move to the first point
  strokePts.forEach((pts, i) => {
    const duration = (strokeLen[i] / totalLen) * drawMs;
    strokes.push({ pts, delay: cursor, duration });
    cursor += duration + MOVE_MS; // + pen-up hop to the next stroke / trail-out
  });

  // Fingertip path: rest → first point (lead-in), the strokes (with a quick
  // hop between them), last point → rest.
  const xs = [0];
  const ys = [0];
  const durations: number[] = [];
  strokePts.forEach((pts, si) => {
    pts.forEach((p, pi) => {
      const isHop = si > 0 && pi === 0; // jump to a later stroke's start
      const isLead = si === 0 && pi === 0; // first move out of rest
      const prevX = xs[xs.length - 1];
      const prevY = ys[ys.length - 1];
      const segLen = Math.hypot(p[0] - prevX, p[1] - prevY);
      xs.push(p[0]);
      ys.push(p[1]);
      durations.push(
        isHop || isLead ? MOVE_MS : (segLen / totalLen) * drawMs,
      );
    });
  });
  xs.push(0);
  ys.push(0);
  durations.push(MOVE_MS); // trail-out back to rest
  const total = durations.reduce((a, b) => a + b, 0);

  return { xs, ys, durations, total, strokes };
}
