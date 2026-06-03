import { computeReviewMarks } from '../lib/review';
import type { AnswerInk, InkStroke } from '../components/domain/ink';
import type { Question, QuestionAnswer } from '../types';

// Mock the recognition engine: each box's recognised digit is encoded in the
// first point's x-coordinate, so tests can dictate exactly what every box
// "reads" as. x === -1 stands in for a minus sign.
jest.mock('../lib/recognition', () => ({
  recognizeDigit: jest.fn(async (strokes: InkStroke[]) => ({
    digit: strokes.length ? strokes[0][0][0] : null,
    confidence: null,
    raw: null,
  })),
  recognizeSign: jest.fn(async (strokes: InkStroke[]) => ({
    sign: strokes.length && strokes[0][0][0] === -1 ? 'minus' : null,
    confidence: null,
    raw: null,
  })),
}));

/** One stroke encoding digit `d` (read back by the mocked recognizer). */
const ink = (d: number): InkStroke[] => [[[d, 0, 0]]];
const MINUS = ink(-1);

function answerInk(over: Partial<AnswerInk> = {}): AnswerInk {
  return { sign: [], integer: [], decimal: [], remainder: [], ...over };
}

function question(
  answer: QuestionAnswer,
  over: Partial<Question> = {},
): Question {
  return {
    id: 'q',
    operation: 'addition',
    operands: [2, 3],
    answer,
    layout: 'vertical',
    ...over,
  };
}

describe('computeReviewMarks — final answer boxes', () => {
  const q = question({ kind: 'integer', value: 5 });

  it('marks a correct answer digit green', async () => {
    const marks = await computeReviewMarks({
      question: q,
      layout: 'vertical',
      answerInk: answerInk({ integer: [ink(5)] }),
    });
    expect(marks.get('int-0')).toBe('correct');
  });

  it('marks a wrong answer digit red', async () => {
    const marks = await computeReviewMarks({
      question: q,
      layout: 'vertical',
      answerInk: answerInk({ integer: [ink(4)] }),
    });
    expect(marks.get('int-0')).toBe('incorrect');
  });

  it('marks a required answer box left blank red', async () => {
    const marks = await computeReviewMarks({
      question: q,
      layout: 'vertical',
      answerInk: answerInk({ integer: [[]] }),
    });
    expect(marks.get('int-0')).toBe('incorrect');
  });
});

describe('computeReviewMarks — working (carry) boxes', () => {
  // 7 + 5 = 12 ⇒ int-0=1, int-1=2, carry-0=1.
  const q = question({ kind: 'integer', value: 12 }, { operands: [7, 5] });
  const correctAnswer = { integer: [ink(1), ink(2)] };

  it('marks a written carry box by correctness', async () => {
    const right = await computeReviewMarks({
      question: q,
      layout: 'vertical',
      answerInk: answerInk(correctAnswer),
      carryInk: [ink(1)],
    });
    expect(right.get('carry-0')).toBe('correct');

    const wrong = await computeReviewMarks({
      question: q,
      layout: 'vertical',
      answerInk: answerInk(correctAnswer),
      carryInk: [ink(9)],
    });
    expect(wrong.get('carry-0')).toBe('incorrect');
  });

  it('leaves a blank working box neutral (no mark)', async () => {
    const marks = await computeReviewMarks({
      question: q,
      layout: 'vertical',
      answerInk: answerInk(correctAnswer),
      carryInk: [[]],
    });
    expect(marks.has('carry-0')).toBe(false);
  });

  it('marks a working box written where none is expected red', async () => {
    const marks = await computeReviewMarks({
      question: q,
      layout: 'vertical',
      answerInk: answerInk(correctAnswer),
      carryInk: [ink(1), ink(3)], // carry-1 is not part of the solution
    });
    expect(marks.get('carry-1')).toBe('incorrect');
  });
});

describe('computeReviewMarks — long-division draft staircase', () => {
  // 84 ÷ 4 = 21 ⇒ draft dd-0-0=8 (first product), dd-2-1=4 (second product).
  const q = question(
    { kind: 'integer', value: 21 },
    { operation: 'division', operands: [84, 4], layout: 'divisionLong' },
  );

  it('marks a wrong product digit red and a correct one green', async () => {
    const divisionDraftInk: InkStroke[][][] = [];
    divisionDraftInk[0] = [ink(7)]; // dd-0-0 wrong (expected 8)
    divisionDraftInk[2] = [[], ink(4)]; // dd-2-1 correct (expected 4)

    const marks = await computeReviewMarks({
      question: q,
      layout: 'divisionLong',
      answerInk: answerInk({ integer: [ink(2), ink(1)] }),
      divisionDraftInk,
    });

    expect(marks.get('dd-0-0')).toBe('incorrect');
    expect(marks.get('dd-2-1')).toBe('correct');
  });
});

describe('computeReviewMarks — sign box', () => {
  const negative = question(
    { kind: 'integer', value: -3 },
    { operation: 'subtraction', operands: [3, 6] },
  );

  it('marks a correct minus sign green', async () => {
    const marks = await computeReviewMarks({
      question: negative,
      layout: 'vertical',
      answerInk: answerInk({ sign: MINUS, integer: [ink(3)] }),
    });
    expect(marks.get('sign')).toBe('correct');
  });

  it('marks a required-but-missing sign red', async () => {
    const marks = await computeReviewMarks({
      question: negative,
      layout: 'vertical',
      answerInk: answerInk({ sign: [], integer: [ink(3)] }),
    });
    expect(marks.get('sign')).toBe('incorrect');
  });
});
