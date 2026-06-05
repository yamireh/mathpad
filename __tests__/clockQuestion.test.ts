import { clockPhrase } from '../lib/clock';
import {
  checkDigital,
  checkPattern,
  generateClockQuestions,
  patternBank,
  phraseTokens,
  resolveAnswerWith,
  tokensEqual,
  type ClockToken,
} from '../lib/clock/question';

describe('clock — phraseTokens', () => {
  it('spells the phrases in order', () => {
    expect(phraseTokens(clockPhrase({ hour: 6, minute: 0 }))).toEqual([
      { kind: 'number', value: 6 },
      { kind: 'word', word: 'oclock' },
    ]);
    expect(phraseTokens(clockPhrase({ hour: 6, minute: 30 }))).toEqual([
      { kind: 'word', word: 'half' },
      { kind: 'word', word: 'past' },
      { kind: 'number', value: 6 },
    ]);
    expect(phraseTokens(clockPhrase({ hour: 6, minute: 50 }))).toEqual([
      { kind: 'number', value: 10 },
      { kind: 'word', word: 'to' },
      { kind: 'number', value: 7 },
    ]);
  });
});

describe('clock — checking answers', () => {
  it('checkDigital matches the exact time only', () => {
    expect(checkDigital({ hour: 6, minute: 30 }, '6:30')).toBe(true);
    expect(checkDigital({ hour: 6, minute: 30 }, ' 6:30 ')).toBe(true);
    expect(checkDigital({ hour: 6, minute: 30 }, '6:35')).toBe(false);
    expect(checkDigital({ hour: 6, minute: 5 }, '6:5')).toBe(false); // needs :05
  });

  it('checkPattern needs the right tokens in the right order', () => {
    const time = { hour: 6, minute: 15 };
    const right: ClockToken[] = [
      { kind: 'word', word: 'quarter' },
      { kind: 'word', word: 'past' },
      { kind: 'number', value: 6 },
    ];
    expect(checkPattern(time, right)).toBe(true);
    expect(checkPattern(time, [...right].reverse())).toBe(false);
    expect(checkPattern(time, right.slice(0, 2))).toBe(false);
  });

  it('tokensEqual is order- and value-sensitive', () => {
    const a: ClockToken[] = [{ kind: 'number', value: 6 }];
    expect(tokensEqual(a, [{ kind: 'number', value: 6 }])).toBe(true);
    expect(tokensEqual(a, [{ kind: 'number', value: 7 }])).toBe(false);
  });
});

describe('clock — patternBank', () => {
  it('always contains every correct token (plus decoys), no duplicates by kind+value', () => {
    const phrase = clockPhrase({ hour: 6, minute: 50 }); // ten to seven
    const bank = patternBank(phrase);
    for (const token of phraseTokens(phrase)) {
      expect(bank.some((t) => tokensEqual([t], [token]))).toBe(true);
    }
    // the five words are present
    for (const w of ['oclock', 'quarter', 'half', 'past', 'to']) {
      expect(bank.some((t) => t.kind === 'word' && t.word === w)).toBe(true);
    }
  });
});

describe('clock — generateClockQuestions', () => {
  it('produces the requested count with valid, step-aligned times', () => {
    const qs = generateClockQuestions({ count: 8, step: 'quarter', type: 'mixed' });
    expect(qs).toHaveLength(8);
    for (const q of qs) {
      expect([0, 15, 30, 45]).toContain(q.time.minute);
      expect(['digital', 'pattern']).toContain(q.answerWith);
    }
  });

  it('resolveAnswerWith respects a non-mixed type', () => {
    expect(resolveAnswerWith('digital')).toBe('digital');
    expect(resolveAnswerWith('pattern')).toBe('pattern');
  });
});
