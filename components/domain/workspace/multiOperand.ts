/**
 * For an N-operand column addition over `columns` digit columns, return a
 * per-column flag (indexed left-to-right) marking columns that *receive* a
 * carry from the column to their right. Used by both addition (`op1 + op2`)
 * and the multiplication sum step (adding the partial products together) so
 * the auto-advance skips carry slots the math says aren't needed.
 */
export function multiOperandCarries(
  operands: number[],
  columns: number,
): boolean[] {
  const out = new Array<boolean>(columns).fill(false);
  const remaining = operands.map((o) => Math.abs(o));
  let carry = 0;
  for (let pos = 0; pos < columns; pos += 1) {
    let sum = carry;
    for (let i = 0; i < remaining.length; i += 1) {
      sum += remaining[i] % 10;
      remaining[i] = Math.floor(remaining[i] / 10);
    }
    const nextCarry = Math.floor(sum / 10);
    if (nextCarry > 0) {
      const receiverFromLeft = columns - 2 - pos;
      if (receiverFromLeft >= 0) out[receiverFromLeft] = true;
    }
    carry = nextCarry;
  }
  return out;
}

/** Integer-part digit count of `n` (e.g. 7.5 → 1, 130 → 3). */
function intDigits(n: number): number {
  return String(Math.abs(Math.trunc(n))).length;
}

/**
 * How many leading answer columns exist only to hold a final carry-out — i.e.
 * columns to the left of *both* operands' most-significant digit. For a
 * two-operand sum this is 0 or 1. The carry into such a column has no digit to
 * be added to, so the kid writes it straight into the answer's leading box
 * instead of carrying it up and bringing it back down.
 */
export function leadingCarrySkip(
  op1: number,
  op2: number,
  intCols: number,
): number {
  return Math.max(0, intCols - Math.max(intDigits(op1), intDigits(op2)));
}

/**
 * Per-column carry flags for `op1 + op2` on the vertical grid, with the final
 * carry-out of the most-significant operand column suppressed (see
 * {@link leadingCarrySkip}). Used for the answer scaffold so no carry box is
 * scaffolded above a purely-carry leading column.
 */
export function additionCarries(
  op1: number,
  op2: number,
  intCols: number,
  decCols: number,
): boolean[] {
  const scale = 10 ** decCols;
  const carries = multiOperandCarries(
    [Math.round(Math.abs(op1) * scale), Math.round(Math.abs(op2) * scale)],
    intCols + decCols,
  );
  const skip = leadingCarrySkip(op1, op2, intCols);
  for (let i = 0; i < skip; i += 1) carries[i] = false;
  return carries;
}

/** Partial-product values for `op1 × op2`, shifted into their place values. */
export function partialProductValues(op1: number, op2: number): number[] {
  const values: number[] = [];
  let m = Math.abs(op2);
  let shift = 1;
  while (m > 0) {
    values.push(Math.abs(op1) * (m % 10) * shift);
    m = Math.floor(m / 10);
    shift *= 10;
  }
  return values;
}
