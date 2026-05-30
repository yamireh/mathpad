/**
 * Helpers for parsing the structured box-id strings the workspace uses to
 * key per-cell ink: `carry-{col}`, `pp-{row}-{col}`, `tcarry-{row}-{col}`,
 * and `dd-{row}-{col}`. Kept here so every component that needs to know
 * what kind of cell an id refers to shares one source of truth.
 */

export interface RowCol {
  row: number;
  col: number;
}

/** Multi-digit × info threaded through fill-sequence + sizing logic. */
export interface MultiplicationInfo {
  op1: number;
  op2: number;
  op1Cols: number;
  partials: number[];
}

/** Parse a partial-product box id (`pp-{row}-{col}`) or return null. */
export function parsePartialId(id: string): RowCol | null {
  const m = /^pp-(\d+)-(\d+)$/.exec(id);
  return m ? { row: Number(m[1]), col: Number(m[2]) } : null;
}

/** Parse a times-carry box id (`tcarry-{row}-{op1Col}`) or return null. */
export function parseTimesCarryId(id: string): RowCol | null {
  const m = /^tcarry-(\d+)-(\d+)$/.exec(id);
  return m ? { row: Number(m[1]), col: Number(m[2]) } : null;
}

/** Parse a division-draft box id (`dd-{row}-{col}`) or return null. */
export function parseDivisionDraftId(id: string): RowCol | null {
  const m = /^dd-(\d+)-(\d+)$/.exec(id);
  return m ? { row: Number(m[1]), col: Number(m[2]) } : null;
}
