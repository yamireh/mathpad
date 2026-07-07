import {
  additionCarries,
  leadingCarrySkip,
  multiplicationCarries,
  partialProductValues,
} from '../components/domain/workspace/multiOperand';

describe('leadingCarrySkip', () => {
  it('is 1 when the sum is wider than both operands', () => {
    expect(leadingCarrySkip(70, 60, 3)).toBe(1); // 130
    expect(leadingCarrySkip(5, 5, 2)).toBe(1); // 10
    expect(leadingCarrySkip(75, 68, 3)).toBe(1); // 143
  });

  it('is 0 when the sum fits the operand width', () => {
    expect(leadingCarrySkip(12, 34, 2)).toBe(0); // 46
    expect(leadingCarrySkip(21, 34, 2)).toBe(0); // 55
  });
});

describe('additionCarries', () => {
  it('suppresses the redundant final carry-out (70 + 60)', () => {
    // Tens column makes 13, but the leading 1 has no column to add into — the
    // kid writes it straight into the answer, so NO carry box anywhere.
    expect(additionCarries(70, 60, 3, 0)).toEqual([false, false, false]);
  });

  it('keeps a genuine internal carry but drops the leading one (75 + 68)', () => {
    // units→tens carry stays (index 1); tens→hundreds leading carry dropped.
    expect(additionCarries(75, 68, 3, 0)).toEqual([false, true, false]);
  });

  it('drops the only carry when it is the leading one (5 + 5)', () => {
    expect(additionCarries(5, 5, 2, 0)).toEqual([false, false]);
  });

  it('leaves a same-width sum untouched (12 + 34, no carries)', () => {
    expect(additionCarries(12, 34, 2, 0)).toEqual([false, false]);
  });

  it('keeps the internal carry when the sum stays the same width (21 + 19)', () => {
    // 21 + 19 = 40: units 1+9=10 carries into tens (index 0); tens fits, no
    // leading column, so the carry box stays.
    expect(additionCarries(21, 19, 2, 0)).toEqual([true, false]);
  });
});

describe('multiplicationCarries', () => {
  it('never puts a carry box over the leftmost answer digit (89 × 13 = 1157)', () => {
    // Carries into hundreds (internal, kept) and into thousands (leftmost).
    const carries = multiplicationCarries(partialProductValues(89, 13), 4);
    expect(carries[0]).toBe(false); // thousands (last box) — always suppressed
    expect(carries[1]).toBe(true); // hundreds — internal carry, kept
  });

  it('drops the leftmost carry even when a partial reaches it (12 × 34 = 408)', () => {
    // The only carry is tens→hundreds, i.e. into the last box — so no boxes.
    expect(multiplicationCarries(partialProductValues(12, 34), 3)).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('suppresses the leftmost carry for a single-digit multiplier (68 × 5 = 340)', () => {
    const carries = multiplicationCarries(partialProductValues(68, 5), 3);
    expect(carries[0]).toBe(false); // hundreds (last box)
  });
});
