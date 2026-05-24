/**
 * Borrowing display logic for vertical subtraction.
 *
 * The kid taps a top-operand digit to "borrow from it": that digit loses 1 and
 * the digit to its right gains 10. A lender that would go negative (a 0)
 * cascades the borrow further left automatically.
 */

/** How one top-operand digit should display after borrowing. */
export interface BorrowDigit {
  /** Value to show (the adjusted value when crossed out). */
  value: number;
  /** Whether the original digit is crossed out and re-annotated. */
  crossedOut: boolean;
}

/**
 * Compute the borrowing display for a subtraction's top operand.
 *
 * @param digits  Top-operand digits, most-significant first.
 * @param lenders Indices (into `digits`) the kid tapped to borrow from.
 */
export function computeBorrowDisplay(
  digits: number[],
  lenders: number[],
): BorrowDigit[] {
  const delta = digits.map(() => 0);

  for (const i of lenders) {
    // The last digit (units) has nothing on its right to lend to.
    if (i < 0 || i >= digits.length - 1) continue;
    delta[i] -= 1;
    delta[i + 1] += 10;
  }

  // Cascade: a lender driven negative borrows from its own left neighbour.
  for (let guard = 0; guard < 64; guard += 1) {
    let underflow = -1;
    for (let i = digits.length - 1; i >= 1; i -= 1) {
      if (digits[i] + delta[i] < 0) {
        underflow = i;
        break;
      }
    }
    if (underflow < 0) break;
    delta[underflow] += 10;
    delta[underflow - 1] -= 1;
  }

  return digits.map((d, i) => ({
    value: d + delta[i],
    crossedOut: delta[i] !== 0,
  }));
}

/** True when computing `op1 - op2` column-by-column needs at least one borrow. */
export function needsBorrow(op1: number, op2: number): boolean {
  let a = Math.abs(op1);
  let b = Math.abs(op2);
  while (a > 0 || b > 0) {
    if (a % 10 < b % 10) return true;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return false;
}
