import type { InkStroke } from '../ink';

/** Highest row index in the division-draft ink that has any strokes, or -1. */
export function lastDraftInkRow(ink: InkStroke[][][] | undefined): number {
  if (!ink) return -1;
  for (let r = ink.length - 1; r >= 0; r -= 1) {
    if (ink[r]?.some((cell) => cell.length > 0)) return r;
  }
  return -1;
}
