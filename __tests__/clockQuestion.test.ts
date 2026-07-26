import { clockPhrase, shiftTime } from '../lib/clock';
import {
  checkDigital,
  checkPattern,
  checkSet,
  generateClockQuestions,
  patternBank,
  patternSections,
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

  it('checkSet matches the exact hands set', () => {
    expect(checkSet({ hour: 6, minute: 30 }, { hour: 6, minute: 30 })).toBe(true);
    expect(checkSet({ hour: 6, minute: 30 }, { hour: 7, minute: 30 })).toBe(false);
    expect(checkSet({ hour: 6, minute: 30 }, { hour: 6, minute: 35 })).toBe(false);
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
    // no duplicate tile by kind+value
    const keys = bank.map((t) =>
      t.kind === 'word' ? `w:${t.word}` : `n:${t.value}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('clock — patternSections', () => {
  const has = (tiles: ClockToken[], token: ClockToken) =>
    tiles.some((t) => tokensEqual([t], [token]));

  it('groups the answer tokens into the right sections', () => {
    // twenty past six → 20 (minutes) · past (linker) · 6 (hour)
    const s = patternSections(clockPhrase({ hour: 6, minute: 20 }));
    expect(has(s.minutes, { kind: 'number', value: 20 })).toBe(true);
    expect(has(s.linkers, { kind: 'word', word: 'past' })).toBe(true);
    expect(has(s.hours, { kind: 'number', value: 6 })).toBe(true);
    // half/quarter are minute words; past/to are the only linkers; o'clock
    // lives with the hours (it's said right after the hour).
    expect(has(s.minutes, { kind: 'word', word: 'half' })).toBe(true);
    expect(has(s.minutes, { kind: 'word', word: 'quarter' })).toBe(true);
    expect(has(s.linkers, { kind: 'word', word: 'oclock' })).toBe(false);
    expect(has(s.hours, { kind: 'word', word: 'oclock' })).toBe(true);
  });

  it("offers o'clock via the hour section, with no minute number needed", () => {
    // six o'clock → 6 (hour) · o'clock (also hour section); no minute numbers
    const s = patternSections(clockPhrase({ hour: 6, minute: 0 }));
    expect(has(s.hours, { kind: 'number', value: 6 })).toBe(true);
    expect(has(s.hours, { kind: 'word', word: 'oclock' })).toBe(true);
    expect(s.minutes.every((t) => t.kind === 'word')).toBe(true);
  });

  it('puts a value that is both the minute AND the hour in both sections', () => {
    // ten past ten → needs 10 as the minute AND 10 as the hour
    const s = patternSections(clockPhrase({ hour: 10, minute: 10 }));
    expect(has(s.minutes, { kind: 'number', value: 10 })).toBe(true);
    expect(has(s.hours, { kind: 'number', value: 10 })).toBe(true);
  });
});

describe('clock — generateClockQuestions', () => {
  it('produces the requested count with valid, step-aligned times', () => {
    const qs = generateClockQuestions({
      count: 8,
      step: 'quarter',
      type: 'mixed',
      skill: 'read',
      jump: 'hour',
    });
    expect(qs).toHaveLength(8);
    for (const q of qs) {
      expect([0, 15, 30, 45]).toContain(q.time.minute);
      // read only ever writes or says (never "set")
      expect(['digital', 'pattern']).toContain(q.answerWith);
      // read/set answer the shown time
      expect(q.target).toEqual(q.time);
      expect(q.skill).toBe('read');
    }
  });

  it("resolveAnswerWith respects a non-mixed type and the skill's surfaces", () => {
    expect(resolveAnswerWith('digital', 'read')).toBe('digital');
    expect(resolveAnswerWith('pattern', 'read')).toBe('pattern');
    // a set skill always answers by setting the hands, whatever the type
    expect(resolveAnswerWith('digital', 'set')).toBe('set');
    // elapsed can answer by writing, saying OR setting
    expect(resolveAnswerWith('set', 'elapsed')).toBe('set');
  });

  it('read mixed never picks a surface outside the skill (no "set")', () => {
    const read = generateClockQuestions({
      count: 30,
      step: 'minute',
      type: 'mixed',
      skill: 'read',
      jump: 'hour',
    });
    expect(read.every((q) => q.answerWith !== 'set')).toBe(true);
  });

  it('elapsed questions target a time a whole-hour jump away', () => {
    const qs = generateClockQuestions({
      count: 20,
      step: 'quarter',
      type: 'digital',
      skill: 'elapsed',
      jump: 'hour',
    });
    for (const q of qs) {
      expect(q.shift).toBeDefined();
      expect([60, 120]).toContain(q.shift!.minutes);
      // whole-hour jumps keep the minute, only the hour changes
      expect(q.target.minute).toBe(q.time.minute);
    }
  });

  it('gives every question a distinct time (no repeats in a session)', () => {
    for (const step of ['quarter', 'five', 'minute'] as const) {
      const qs = generateClockQuestions({
        count: 12,
        step,
        type: 'digital',
        skill: 'read',
        jump: 'hour',
      });
      const keys = qs.map((q) => `${q.time.hour}:${q.time.minute}`);
      expect(new Set(keys).size).toBe(qs.length);
    }
  });
});

describe('clock — shiftTime (12-hour wrap)', () => {
  it('adds and subtracts minutes, wrapping around 12', () => {
    expect(shiftTime({ hour: 3, minute: 0 }, 60)).toEqual({ hour: 4, minute: 0 });
    expect(shiftTime({ hour: 3, minute: 45 }, 30)).toEqual({ hour: 4, minute: 15 });
    // forward across the top of the dial
    expect(shiftTime({ hour: 11, minute: 30 }, 60)).toEqual({ hour: 12, minute: 30 });
    expect(shiftTime({ hour: 12, minute: 0 }, 60)).toEqual({ hour: 1, minute: 0 });
    // backward across the top of the dial
    expect(shiftTime({ hour: 12, minute: 0 }, -60)).toEqual({ hour: 11, minute: 0 });
    expect(shiftTime({ hour: 1, minute: 15 }, -30)).toEqual({ hour: 12, minute: 45 });
  });
});
