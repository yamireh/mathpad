/**
 * Multiplication walk math — locks the per-partial times-carry logic and the
 * sum-step carry expectations so the auto-advance can't silently regress.
 *
 * Reproduces the carry computations used by `QuestionWorkspace.fillSequence`
 * without dragging the full component in.
 */
import {
  partialMultiplicationCarries,
  partialWidths,
} from '../components/domain/layout';

/** Mirror of `multiOperandCarries` from QuestionWorkspace. */
function multiOperandCarries(operands: number[], columns: number): boolean[] {
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

/** Mirror of `partialProductValues` from QuestionWorkspace. */
function partialProductValues(op1: number, op2: number): number[] {
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

function expectedSumCarries(op1: number, op2: number): boolean[] {
  const columns = String(Math.abs(op1 * op2)).length;
  return multiOperandCarries(partialProductValues(op1, op2), columns);
}

describe('multiplication — sum-step expected carries', () => {
  it('no carries when no column sum overflows', () => {
    // 13 × 49 = 637 — sums per column: 7, 4, 6. None overflow.
    expect(expectedSumCarries(13, 49)).toEqual([false, false, false]);
    // 13 × 12 = 156 — 6, 5, 1.
    expect(expectedSumCarries(13, 12)).toEqual([false, false, false]);
    // 12 × 56 = 672 — 2, 7, 6.
    expect(expectedSumCarries(12, 56)).toEqual([false, false, false]);
    // 33 × 22 = 726 — units 6 (single digit), tens 6+6=12 carries, hundreds 0+6+1=7.
    // Wait: 33×22: partials [66, 660]. units 6+0=6 (no carry).
    // tens 6+6=12 (carry 1 into hundreds). hundreds 0+6+1=7 (no carry).
    expect(expectedSumCarries(33, 22)).toEqual([true, false, false]);
  });

  it('flags a carry only on the columns that actually overflow', () => {
    // 39 × 17 = 663 — partials [273, 390].
    //   units 3+0=3 (no carry)
    //   tens 7+9=16 (carry 1 into hundreds) ← carry at column-from-left 0
    //   hundreds 2+3+1=6 (no carry)
    expect(expectedSumCarries(39, 17)).toEqual([true, false, false]);

    // 23 × 22 = 506 — partials [46, 460].
    //   units 6+0=6 (no carry)
    //   tens 4+6=10 (carry 1) ← receiver at col 0
    //   hundreds 0+4+1=5 (no carry)
    expect(expectedSumCarries(23, 22)).toEqual([true, false, false]);

    // 78 × 13 = 1014 — partials [234, 780]. 4-digit answer.
    //   units 4+0=4
    //   tens 3+8=11 (carry into col 1)
    //   hundreds 2+7+1=10 (carry into col 0)
    //   thousands 0+0+1=1
    expect(expectedSumCarries(78, 13)).toEqual([true, true, false, false]);

    // 99 × 99 = 9801 — partials [891, 8910]. 4-digit answer.
    //   units 1+0=1
    //   tens 9+1=10 (carry into col 1)
    //   hundreds 8+9+1=18 (carry into col 0)
    //   thousands 0+8+1=9
    expect(expectedSumCarries(99, 99)).toEqual([true, true, false, false]);
  });

  it('units column never carries — partial 1+ contribute 0 to units', () => {
    // Whatever the multiplier, units sum is just partial_0_units (everything
    // else is shifted). It is always < 10, so out[columns-2] is always false.
    for (const [a, b] of [
      [99, 99],
      [78, 13],
      [11, 19],
      [23, 22],
      [39, 17],
      [33, 22],
    ]) {
      const expected = expectedSumCarries(a, b);
      const columns = expected.length;
      expect(expected[columns - 2]).toBe(false);
    }
  });

  it('no carry past the leftmost column (would land out-of-bounds)', () => {
    // For columns=N, only out[0..N-2] can be true; out[N-1] is the units
    // column itself which receives nothing from its right.
    for (const [a, b] of [
      [99, 99],
      [78, 13],
      [50, 50],
    ]) {
      const expected = expectedSumCarries(a, b);
      const columns = expected.length;
      expect(expected[columns - 1]).toBe(false);
    }
  });
});

describe('multiplication — per-partial times-carry expectations', () => {
  it('flags the right op1 column that receives the carry', () => {
    // 5 × 23: 5×3=15 (carry 1 into op1 tens col), then 5×2+1=11.
    // op1Cols=2 → output has length 1 (only above op1's tens col).
    expect(partialMultiplicationCarries(23, 5, 2)).toEqual([true]);

    // 4 × 23: 4×3=12 (carry 1), 4×2+1=9.
    expect(partialMultiplicationCarries(23, 4, 2)).toEqual([true]);

    // 1 × 23: 1×3=3 (no carry), 1×2=2.
    expect(partialMultiplicationCarries(23, 1, 2)).toEqual([false]);

    // 7 × 234: 7×4=28 (carry), 7×3+2=23 (carry), 7×2+2=16 (overflow, no slot).
    // out length = 2 (op1Cols 3 − 1 = 2). Both slots true.
    expect(partialMultiplicationCarries(234, 7, 3)).toEqual([true, true]);
  });

  it('per-digit step that does not carry is left false', () => {
    // 1 × 234: 1×4=4, 1×3=3, 1×2=2. No carries.
    expect(partialMultiplicationCarries(234, 1, 3)).toEqual([false, false]);
    // 2 × 234: 2×4=8, 2×3=6, 2×2=4. No carries.
    expect(partialMultiplicationCarries(234, 2, 3)).toEqual([false, false]);
  });
});

describe('partialWidths', () => {
  it('returns null for single-digit multipliers (no partial UI needed)', () => {
    expect(partialWidths(23, 5)).toBeNull();
    expect(partialWidths(234, 9)).toBeNull();
  });

  it('one width per non-zero op2 digit, sized to the partial product', () => {
    // 23 × 45 → partials are 5×23=115 (3 digits), 4×23=92 (2 digits).
    // The order of widths in the array mirrors op2 right-to-left.
    expect(partialWidths(23, 45)).toEqual([3, 2]);

    // 99 × 99 → 9×99=891 (3 digits), 9×99=891 (3 digits).
    expect(partialWidths(99, 99)).toEqual([3, 3]);
  });

  it('zero op2 digit produces a width-1 placeholder row', () => {
    // 23 × 105 → 5×23=115 (3), 0 (1), 1×23=23 (2).
    expect(partialWidths(23, 105)).toEqual([3, 1, 2]);
  });
});
