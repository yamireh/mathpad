import {
  countFinal,
  countFirstTry,
  encouragementKey,
  firstAttemptStatus,
  isAnswerCorrect,
  isCorrectStatus,
  markFirstAttempt,
  scorePercent,
  statusAfterEdit,
} from '../lib/scoring';
import type {
  Question,
  QuestionAnswer,
  QuestionResult,
  SubmittedAnswer,
} from '../types';

function question(answer: QuestionAnswer, over: Partial<Question> = {}): Question {
  return {
    id: 'q',
    operation: 'addition',
    operands: [1, 1],
    answer,
    layout: 'vertical',
    ...over,
  };
}

function answer(over: Partial<SubmittedAnswer> = {}): SubmittedAnswer {
  return {
    sign: null,
    integerDigits: [],
    decimalDigits: [],
    remainderDigits: [],
    ...over,
  };
}

describe('isAnswerCorrect — integer', () => {
  const q = question({ kind: 'integer', value: 42 });

  it('marks matching digits correct', () => {
    expect(isAnswerCorrect(q, answer({ integerDigits: [4, 2] }))).toBe(true);
  });
  it('marks wrong digits incorrect', () => {
    expect(isAnswerCorrect(q, answer({ integerDigits: [4, 1] }))).toBe(false);
  });
  it('marks a blank box incorrect', () => {
    expect(isAnswerCorrect(q, answer({ integerDigits: [4, null] }))).toBe(false);
  });
  it('marks a null submission incorrect', () => {
    expect(isAnswerCorrect(q, null)).toBe(false);
  });
});

describe('isAnswerCorrect — negative answers', () => {
  const negative = question({ kind: 'integer', value: -3 });
  const positive = question({ kind: 'integer', value: 3 });

  it('needs the minus sign when the answer is negative', () => {
    expect(
      isAnswerCorrect(negative, answer({ sign: 'minus', integerDigits: [3] })),
    ).toBe(true);
    expect(isAnswerCorrect(negative, answer({ integerDigits: [3] }))).toBe(
      false,
    );
  });
  it('rejects a stray minus sign on a positive answer', () => {
    expect(
      isAnswerCorrect(positive, answer({ sign: 'minus', integerDigits: [3] })),
    ).toBe(false);
  });
});

describe('isAnswerCorrect — decimal equivalence', () => {
  const q = question(
    { kind: 'decimal', value: 3.5, decimalPlaces: 1 },
    { layout: 'divisionDecimal' },
  );

  it('accepts the exact decimal', () => {
    expect(
      isAnswerCorrect(q, answer({ integerDigits: [3], decimalDigits: [5] })),
    ).toBe(true);
  });
  it('accepts trailing zeros (3.50 == 3.5)', () => {
    expect(
      isAnswerCorrect(
        q,
        answer({ integerDigits: [3], decimalDigits: [5, 0] }),
      ),
    ).toBe(true);
  });
  it('rejects missing decimal digits (3 != 3.5)', () => {
    expect(
      isAnswerCorrect(q, answer({ integerDigits: [3], decimalDigits: [] })),
    ).toBe(false);
  });
  it('rejects a non-zero extra decimal digit (3.52 != 3.5)', () => {
    expect(
      isAnswerCorrect(
        q,
        answer({ integerDigits: [3], decimalDigits: [5, 2] }),
      ),
    ).toBe(false);
  });
  it('rejects a gap in the decimal boxes', () => {
    expect(
      isAnswerCorrect(
        q,
        answer({ integerDigits: [3], decimalDigits: [null, 5] }),
      ),
    ).toBe(false);
  });
});

describe('isAnswerCorrect — remainder', () => {
  const q = question(
    { kind: 'remainder', quotient: 3, remainder: 1 },
    { layout: 'divisionHorizontal' },
  );

  it('accepts a matching quotient and remainder', () => {
    expect(
      isAnswerCorrect(
        q,
        answer({ integerDigits: [3], remainderDigits: [1] }),
      ),
    ).toBe(true);
  });
  it('rejects a wrong remainder', () => {
    expect(
      isAnswerCorrect(
        q,
        answer({ integerDigits: [3], remainderDigits: [2] }),
      ),
    ).toBe(false);
  });
});

describe('status transitions', () => {
  it('firstAttemptStatus', () => {
    expect(firstAttemptStatus(true)).toBe('correct_first_try');
    expect(firstAttemptStatus(false)).toBe('wrong');
  });
  it('a first-try-correct question stays locked', () => {
    expect(statusAfterEdit('correct_first_try', false)).toBe(
      'correct_first_try',
    );
  });
  it('a wrong question becomes fixed once corrected', () => {
    expect(statusAfterEdit('wrong', true)).toBe('fixed');
    expect(statusAfterEdit('wrong', false)).toBe('wrong');
  });
  it('isCorrectStatus', () => {
    expect(isCorrectStatus('correct_first_try')).toBe(true);
    expect(isCorrectStatus('fixed')).toBe(true);
    expect(isCorrectStatus('wrong')).toBe(false);
  });
});

describe('aggregate scoring', () => {
  const questions: Question[] = [
    question({ kind: 'integer', value: 2 }, { id: 'a' }),
    question({ kind: 'integer', value: 5 }, { id: 'b' }),
    question({ kind: 'integer', value: 9 }, { id: 'c' }),
  ];

  it('markFirstAttempt marks each question', () => {
    const results = markFirstAttempt(questions, [
      answer({ integerDigits: [2] }),
      answer({ integerDigits: [4] }),
      null,
    ]);
    expect(results.map((r) => r.status)).toEqual([
      'correct_first_try',
      'wrong',
      'wrong',
    ]);
  });

  it('counts first-try and final scores', () => {
    const results: QuestionResult[] = [
      { question: questions[0], submittedAnswer: null, status: 'correct_first_try' },
      { question: questions[1], submittedAnswer: null, status: 'fixed' },
      { question: questions[2], submittedAnswer: null, status: 'wrong' },
    ];
    expect(countFirstTry(results)).toBe(1);
    expect(countFinal(results)).toBe(2);
  });

  it('scorePercent rounds and guards an empty session', () => {
    expect(scorePercent(7, 10)).toBe(70);
    expect(scorePercent(1, 3)).toBe(33);
    expect(scorePercent(0, 0)).toBe(0);
  });
});

describe('encouragementKey', () => {
  it('picks the tier from the final score', () => {
    expect(encouragementKey(10, 10)).toBe('perfect');
    expect(encouragementKey(7, 10)).toBe('great');
    expect(encouragementKey(5, 10)).toBe('nice');
    expect(encouragementKey(3, 10)).toBe('effort');
  });
});
