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
