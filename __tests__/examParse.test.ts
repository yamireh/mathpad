import { parseCustomProblems, parseProblem } from '../lib/exams';

describe('parseProblem', () => {
  it('parses addition', () => {
    const r = parseProblem('13+7');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.core.operation).toBe('addition');
      expect(r.core.operands).toEqual([13, 7]);
      expect(r.core.answer).toEqual({ kind: 'integer', value: 20 });
    }
  });

  it('accepts *, x and × for multiplication, larger operand on top', () => {
    for (const s of ['24*6', '6 x 24', '6×24']) {
      const r = parseProblem(s);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.core.operation).toBe('multiplication');
        expect(r.core.operands).toEqual([24, 6]);
        expect(r.core.answer).toEqual({ kind: 'integer', value: 144 });
      }
    }
  });

  it('keeps subtraction non-negative (larger on top)', () => {
    const r = parseProblem('7 - 20');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.core.operands).toEqual([20, 7]);
      expect(r.core.answer).toEqual({ kind: 'integer', value: 13 });
    }
  });

  it('parses exact and remainder division', () => {
    const exact = parseProblem('48/6');
    expect(exact.ok && exact.core.answer).toEqual({ kind: 'integer', value: 8 });
    const rem = parseProblem('50 ÷ 6');
    expect(rem.ok && rem.core.answer).toEqual({
      kind: 'remainder',
      quotient: 8,
      remainder: 2,
    });
    if (rem.ok) expect(rem.core.layout).toBe('divisionLong');
  });

  it('rejects nonsense, divide-by-zero, and divisor > dividend', () => {
    expect(parseProblem('hello').ok).toBe(false);
    expect(parseProblem('12+').ok).toBe(false);
    expect(parseProblem('5/0').ok).toBe(false);
    expect(parseProblem('6/48').ok).toBe(false);
    expect(parseProblem('').ok).toBe(false);
  });
});

describe('parseCustomProblems', () => {
  it('parses a block, ids sequentially, ignores blanks, collects errors', () => {
    const { questions, errors } = parseCustomProblems(
      '24*6\n\n13+7\noops\n100-45',
    );
    expect(questions.map((q) => q.id)).toEqual(['q-1', 'q-2', 'q-3']);
    expect(questions.map((q) => q.operation)).toEqual([
      'multiplication',
      'addition',
      'subtraction',
    ]);
    expect(errors).toEqual(['oops']);
  });
});
