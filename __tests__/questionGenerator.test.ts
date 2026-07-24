import {
  additionHasCarry,
  generateSession,
  multiplicationHasRegroup,
  subtractionHasBorrow,
} from '../lib/questionGenerator';
import type {
  AdditionSettings,
  DivisionSettings,
  MixSettings,
  MultiplicationSettings,
  Question,
  SubtractionSettings,
} from '../types';

const timer = { enabled: false, durationMinutes: 5 } as const;

function additionSettings(over: Partial<AdditionSettings> = {}): AdditionSettings {
  return {
    operation: 'addition',
    digitCounts: [2, 3],
    questionCount: 20,
    timer,
    carrying: 'random',
    decimals: 'off',
    ...over,
  };
}
function subtractionSettings(
  over: Partial<SubtractionSettings> = {},
): SubtractionSettings {
  return {
    operation: 'subtraction',
    digitCounts: [2, 3],
    questionCount: 20,
    timer,
    borrowing: 'random',
    allowNegative: 'off',
    decimals: 'off',
    ...over,
  };
}
function multiplicationSettings(
  over: Partial<MultiplicationSettings> = {},
): MultiplicationSettings {
  return {
    operation: 'multiplication',
    digitCounts: [1, 2],
    questionCount: 20,
    timer,
    regrouping: 'random',
    decimals: 'off',
    ...over,
  };
}
function divisionSettings(over: Partial<DivisionSettings> = {}): DivisionSettings {
  return {
    operation: 'division',
    digitCounts: [2, 3],
    questionCount: 20,
    timer,
    answerType: 'random',
    divisionType: 'long',
    dividendDigits: 3,
    divisorDigits: 2,
    ...over,
  };
}

/** Collect questions across several sessions for robust invariant checks. */
function sample(
  settings: Parameters<typeof generateSession>[0],
  sessions = 12,
): Question[] {
  const all: Question[] = [];
  for (let i = 0; i < sessions; i++) all.push(...generateSession(settings));
  return all;
}

const digitCount = (n: number) => String(Math.abs(n)).length;

describe('constraint checkers', () => {
  it('additionHasCarry', () => {
    expect(additionHasCarry(27, 5)).toBe(true);
    expect(additionHasCarry(11, 11)).toBe(false);
    expect(additionHasCarry(1, 8)).toBe(false);
    expect(additionHasCarry(1, 9)).toBe(true);
    expect(additionHasCarry(91, 19)).toBe(true);
  });
  it('subtractionHasBorrow', () => {
    expect(subtractionHasBorrow(52, 17)).toBe(true);
    expect(subtractionHasBorrow(58, 13)).toBe(false);
    expect(subtractionHasBorrow(100, 1)).toBe(true);
  });
  it('multiplicationHasRegroup', () => {
    expect(multiplicationHasRegroup(7, 8)).toBe(true);
    expect(multiplicationHasRegroup(11, 11)).toBe(false);
    expect(multiplicationHasRegroup(99, 11)).toBe(true);
    expect(multiplicationHasRegroup(12, 3)).toBe(false);
  });
});

describe('generateSession — structure', () => {
  it('produces exactly questionCount questions with unique ids', () => {
    const questions = generateSession(additionSettings({ questionCount: 15 }));
    expect(questions).toHaveLength(15);
    expect(new Set(questions.map((q) => q.id)).size).toBe(15);
  });

  it('keeps every operand within the selected digit counts', () => {
    const counts = [2, 4] as const;
    for (const q of sample(additionSettings({ digitCounts: [...counts] }))) {
      expect(counts).toContain(digitCount(q.operands[0]));
      expect(counts).toContain(digitCount(q.operands[1]));
    }
  });

  it('produces no duplicate problems within a session (commutative-aware)', () => {
    const sig = (q: Question) => {
      const commutative =
        q.operation === 'addition' || q.operation === 'multiplication';
      const ops = commutative
        ? [...q.operands].sort((a, b) => a - b)
        : q.operands;
      return `${q.operation}|${ops.join('x')}`;
    };
    for (const settings of [
      additionSettings({ questionCount: 20 }),
      multiplicationSettings({ questionCount: 20 }),
      divisionSettings({ questionCount: 20 }),
      { ...additionSettings(), operation: 'mix', questionCount: 20 } as MixSettings,
    ]) {
      // A single session is fully de-duplicated (across-session sampling would
      // legitimately repeat once each session resets its `seen` set).
      const questions = generateSession(settings);
      const sigs = questions.map(sig);
      expect(new Set(sigs).size).toBe(questions.length);
    }
  });

  it('never emits a degenerate division (dividend === divisor)', () => {
    for (const q of sample(divisionSettings({ answerType: 'all' }))) {
      if (q.operation !== 'division') continue;
      expect(q.operands[0]).not.toBe(q.operands[1]);
    }
  });

  it('recovers from impossible division settings without repeating one problem', () => {
    // Regression: a divisor with more digits than the dividend + "no remainder"
    // is unsatisfiable, so the generator used to fall back to a hardcoded 12÷4
    // on every call and fill the whole session with that one problem. It must
    // now degrade to varied, valid clean divisions.
    const questions = generateSession(
      divisionSettings({
        dividendDigits: 1,
        divisorDigits: 2,
        answerType: 'noRemainder',
        questionCount: 20,
      }),
    );
    const sigs = questions.map((q) => q.operands.join('÷'));
    expect(new Set(sigs).size).toBeGreaterThan(1); // not one repeated problem
    expect(sigs.filter((s) => s === '12÷4')).toHaveLength(0); // no constant spam
    for (const q of questions) {
      const [dividend, divisor] = q.operands;
      expect(divisor).toBeLessThan(dividend); // divisor clamped to fit
      expect(dividend % divisor).toBe(0); // genuinely clean
      expect(dividend / divisor).toBeGreaterThanOrEqual(2); // quotient ≥ 2
    }
  });

  it('clamps a too-large divisor so every answer type stays solvable', () => {
    for (const answerType of ['noRemainder', 'remainder', 'decimal', 'all'] as const) {
      const questions = generateSession(
        divisionSettings({
          dividendDigits: 2,
          divisorDigits: 4, // impossible as-is; must clamp to ≤ 2 digits
          answerType,
          questionCount: 20,
        }),
      );
      for (const q of questions) {
        // Divisor never has more digits than the dividend (clamp held).
        expect(digitCount(q.operands[1])).toBeLessThanOrEqual(
          digitCount(q.operands[0]),
        );
      }
      // Varied — not one repeated fallback problem.
      const sigs = questions.map((q) => q.operands.join('÷'));
      expect(new Set(sigs).size).toBeGreaterThan(5);
    }
  });

  it('never emits a trivial ×1 multiplication', () => {
    for (const settings of [
      multiplicationSettings({ digitCounts: [1, 2] }),
      multiplicationSettings({ digitCounts: [1] }),
      multiplicationSettings({ digitCounts: [1, 2], decimals: 'on' }),
    ]) {
      for (const q of sample(settings)) {
        expect(q.operands).not.toContain(1);
      }
    }
  });

  it('stacks the larger operand on top for multiplication', () => {
    // Larger value on top ⟺ ≥ digits on top for integers (any 3-digit > any
    // 2-digit), so this covers the "no 2-digit over a 3-digit" convention.
    for (const settings of [
      multiplicationSettings({ digitCounts: [2, 3] }),
      multiplicationSettings({ digitCounts: [2, 3], decimals: 'on' }),
    ]) {
      for (const q of sample(settings)) {
        expect(q.operands[0]).toBeGreaterThanOrEqual(q.operands[1]);
        if (!q.operandDecimals) {
          expect(digitCount(q.operands[0])).toBeGreaterThanOrEqual(
            digitCount(q.operands[1]),
          );
        }
      }
    }
  });
});

describe('addition', () => {
  it('with carrying — every question carries', () => {
    for (const q of sample(additionSettings({ carrying: 'with' }))) {
      expect(additionHasCarry(q.operands[0], q.operands[1])).toBe(true);
    }
  });
  it('without carrying — no question carries', () => {
    for (const q of sample(additionSettings({ carrying: 'without' }))) {
      expect(additionHasCarry(q.operands[0], q.operands[1])).toBe(false);
    }
  });
  it('answer equals the sum', () => {
    for (const q of sample(additionSettings())) {
      expect(q.answer).toEqual({
        kind: 'integer',
        value: q.operands[0] + q.operands[1],
      });
    }
  });
});

describe('subtraction', () => {
  it('with borrowing — every question borrows', () => {
    for (const q of sample(subtractionSettings({ borrowing: 'with' }))) {
      const [hi, lo] = [
        Math.max(...q.operands),
        Math.min(...q.operands),
      ];
      expect(subtractionHasBorrow(hi, lo)).toBe(true);
    }
  });
  it('without borrowing — no question borrows', () => {
    for (const q of sample(subtractionSettings({ borrowing: 'without' }))) {
      const [hi, lo] = [
        Math.max(...q.operands),
        Math.min(...q.operands),
      ];
      expect(subtractionHasBorrow(hi, lo)).toBe(false);
    }
  });
  it('allowNegative off — answers are never negative', () => {
    for (const q of sample(subtractionSettings({ allowNegative: 'off' }))) {
      expect((q.answer as { value: number }).value).toBeGreaterThanOrEqual(0);
    }
  });
  it('allowNegative on — answers are always negative', () => {
    for (const q of sample(subtractionSettings({ allowNegative: 'on' }))) {
      expect((q.answer as { value: number }).value).toBeLessThan(0);
    }
  });
  it('answer equals top minus bottom', () => {
    for (const q of sample(subtractionSettings({ allowNegative: 'random' }))) {
      expect((q.answer as { value: number }).value).toBe(
        q.operands[0] - q.operands[1],
      );
    }
  });
});

describe('multiplication', () => {
  it('with regrouping — every question regroups', () => {
    for (const q of sample(multiplicationSettings({ regrouping: 'with' }))) {
      expect(multiplicationHasRegroup(q.operands[0], q.operands[1])).toBe(true);
    }
  });
  it('without regrouping — no question regroups', () => {
    for (const q of sample(multiplicationSettings({ regrouping: 'without' }))) {
      expect(multiplicationHasRegroup(q.operands[0], q.operands[1])).toBe(false);
    }
  });
  it('answer equals the product', () => {
    for (const q of sample(multiplicationSettings())) {
      expect((q.answer as { value: number }).value).toBe(
        q.operands[0] * q.operands[1],
      );
    }
  });
});

describe('division', () => {
  it('divisor is always ≥ 2', () => {
    for (const q of sample(divisionSettings())) {
      expect(q.operands[1]).toBeGreaterThanOrEqual(2);
    }
  });
  it('noRemainder — clean integer division', () => {
    for (const q of sample(divisionSettings({ answerType: 'noRemainder' }))) {
      const [dividend, divisor] = q.operands;
      expect(dividend % divisor).toBe(0);
      expect(q.answer).toEqual({ kind: 'integer', value: dividend / divisor });
    }
  });
  it('remainder — non-zero remainder, dividend reconstructs', () => {
    for (const q of sample(divisionSettings({ answerType: 'remainder' }))) {
      const [dividend, divisor] = q.operands;
      const answer = q.answer as {
        kind: 'remainder';
        quotient: number;
        remainder: number;
      };
      expect(answer.kind).toBe('remainder');
      expect(answer.remainder).toBeGreaterThan(0);
      expect(answer.remainder).toBeLessThan(divisor);
      expect(answer.quotient * divisor + answer.remainder).toBe(dividend);
    }
  });
  it('decimal — terminating answer with ≤ 3 decimal places', () => {
    for (const q of sample(divisionSettings({ answerType: 'decimal' }))) {
      const [dividend, divisor] = q.operands;
      const answer = q.answer as {
        kind: 'decimal';
        value: number;
        decimalPlaces: number;
      };
      expect(answer.kind).toBe('decimal');
      expect(answer.decimalPlaces).toBeGreaterThanOrEqual(1);
      expect(answer.decimalPlaces).toBeLessThanOrEqual(3);
      expect(answer.value).toBeCloseTo(dividend / divisor, 6);
      expect(Number.isInteger(answer.value)).toBe(false);
      // Terminates within 3 decimal places.
      expect((dividend * 1000) % divisor).toBe(0);
    }
  });
});

describe('mix', () => {
  const mixSettings: MixSettings = {
    operation: 'mix',
    digitCounts: [1, 2],
    questionCount: 20,
    timer,
  };

  it('uses a variety of operations', () => {
    const ops = new Set(sample(mixSettings).map((q) => q.operation));
    expect(ops.size).toBeGreaterThan(1);
  });
  it('never produces negative answers or decimals or remainders', () => {
    for (const q of sample(mixSettings)) {
      expect(q.answer.kind).not.toBe('decimal');
      expect(q.answer.kind).not.toBe('remainder');
      if (q.answer.kind === 'integer') {
        expect(q.answer.value).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
