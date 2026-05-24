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
