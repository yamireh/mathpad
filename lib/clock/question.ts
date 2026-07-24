/** Clock question model + answer checking (pure). */
import { clockPhrase, formatDigital } from './format';
import { generateClockTime } from './generate';
import type {
  ClockAnswerType,
  ClockPhrase,
  ClockStep,
  ClockTime,
} from './types';

/** A word that can appear on a pattern tile (numbers render as digits). */
export type ClockWord = 'oclock' | 'quarter' | 'half' | 'past' | 'to';

/** A single tile: a word, or a number (an hour or a minute amount). */
export type ClockToken =
  | { kind: 'word'; word: ClockWord }
  | { kind: 'number'; value: number };

const word = (w: ClockWord): ClockToken => ({ kind: 'word', word: w });
const num = (value: number): ClockToken => ({ kind: 'number', value });

/** The ordered tokens that spell out a phrase, e.g. half · past · 6. */
export function phraseTokens(phrase: ClockPhrase): ClockToken[] {
  switch (phrase.kind) {
    case 'oclock':
      return [num(phrase.hour), word('oclock')];
    case 'quarterPast':
      return [word('quarter'), word('past'), num(phrase.hour)];
    case 'half':
      return [word('half'), word('past'), num(phrase.hour)];
    case 'quarterTo':
      return [word('quarter'), word('to'), num(phrase.hour)];
    case 'past':
      return [num(phrase.minutes), word('past'), num(phrase.hour)];
    case 'to':
      return [num(phrase.minutes), word('to'), num(phrase.hour)];
  }
}

/** Two token lists are equal when they match in order, kind, and value. */
export function tokensEqual(a: ClockToken[], b: ClockToken[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((t, i) => {
    const o = b[i];
    if (t.kind !== o.kind) return false;
    return t.kind === 'word'
      ? t.word === (o as { word: ClockWord }).word
      : t.value === (o as { value: number }).value;
  });
}

/**
 * Tiles grouped by their role in a spoken time, so the bank teaches the
 * sentence frame ("[minutes] · past/to · [hour]"). The answer line stays
 * free-order, so "six o'clock" still reads correctly. `past`/`to` are the two
 * pivots that sit between minutes and hour; `o'clock` is a suffix said right
 * after the hour, so it lives WITH the hours. A number that's both a valid
 * minute AND a valid hour (e.g. "ten past ten") appears in both `minutes` and
 * `hours`.
 */
export interface PatternSections {
  /** Minute words + minute-amount numbers. */
  minutes: ClockToken[];
  /** The two pivot words: past · to. */
  linkers: ClockToken[];
  /** Hour numbers + the o'clock suffix. */
  hours: ClockToken[];
}

const asc = (a: number, b: number) => a - b;

/** Role-grouped tiles for a pattern question: correct tokens + plausible decoys. */
export function patternSections(phrase: ClockPhrase): PatternSections {
  // Hour candidates: the answer hour + spread-out decoys (all 1–12).
  const hours = new Set<number>([phrase.hour]);
  for (const d of [1, 4, 7, 10]) hours.add(((phrase.hour - 1 + d) % 12) + 1);

  // Minute-amount candidates: only when the answer spells minutes as a number
  // (past/to). The quarter/half/o'clock forms say a word or nothing.
  const minutes = new Set<number>();
  if (phrase.kind === 'past' || phrase.kind === 'to') {
    minutes.add(phrase.minutes);
    for (const m of [5, 10, 20, 25]) minutes.add(m);
  }

  return {
    minutes: [word('half'), word('quarter'), ...[...minutes].sort(asc).map(num)],
    linkers: [word('past'), word('to')],
    hours: [...[...hours].sort(asc).map(num), word('oclock')],
  };
}

/**
 * Flat tile list (correct tokens + decoys), de-duplicated by kind+value.
 * Kept for the dev preview and callers that don't need the role grouping.
 */
export function patternBank(phrase: ClockPhrase): ClockToken[] {
  const { minutes, linkers, hours } = patternSections(phrase);
  const seen = new Set<string>();
  return [...minutes, ...linkers, ...hours].filter((t) => {
    const key = t.kind === 'word' ? `w:${t.word}` : `n:${t.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Check a handwritten/typed digital answer ("6:30") against the time. */
export function checkDigital(time: ClockTime, input: string): boolean {
  const m = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
  if (!m) return false;
  return Number(m[1]) === time.hour && Number(m[2]) === time.minute;
}

/** Check a built token sequence against the time's correct phrase. */
export function checkPattern(time: ClockTime, built: ClockToken[]): boolean {
  return tokensEqual(built, phraseTokens(clockPhrase(time)));
}

/** Check hands the child set against the target time. */
export function checkSet(time: ClockTime, value: ClockTime): boolean {
  return value.hour === time.hour && value.minute === time.minute;
}

/** Convenience: the expected digital string for a time. */
export function digitalAnswer(time: ClockTime): string {
  return formatDigital(time);
}

/* -------------------------------------------------------------------------- */
/* Questions                                                                    */
/* -------------------------------------------------------------------------- */

/** A concrete answer surface (mixed resolves to one of these). */
export type ClockAnswerSurface = 'digital' | 'pattern' | 'set';

export interface ClockQuestion {
  id: string;
  time: ClockTime;
  step: ClockStep;
  /** Resolved answer surface for this question (mixed picks per question). */
  answerWith: ClockAnswerSurface;
}

const SURFACES: readonly ClockAnswerSurface[] = ['digital', 'pattern', 'set'];

/** Resolve the answer surface, picking randomly for "mixed". */
export function resolveAnswerWith(
  type: ClockAnswerType,
  rng: () => number = Math.random,
): ClockAnswerSurface {
  if (type === 'mixed') return SURFACES[Math.floor(rng() * SURFACES.length)];
  return type;
}

/** A time's identity — two questions with the same key are the same clock. */
const timeKey = (t: ClockTime): string => `${t.hour}:${t.minute}`;

/**
 * Regeneration cap to dodge a repeated time. Distinct times per step (quarter
 * 48, five 144, minute 720) always dwarf the question count, so this only ever
 * guards against a very tight run; on exhaustion we accept a repeat rather than
 * loop forever.
 */
const TIME_DEDUP_ATTEMPTS = 50;

export function generateClockQuestions(opts: {
  count: number;
  step: ClockStep;
  type: ClockAnswerType;
  rng?: () => number;
}): ClockQuestion[] {
  const rng = opts.rng ?? Math.random;
  // Every question in a session shows a distinct time, so it reads as random
  // rather than repeating the same clock.
  const seen = new Set<string>();
  return Array.from({ length: opts.count }, (_, i) => {
    let time = generateClockTime(opts.step, rng);
    for (let a = 0; a < TIME_DEDUP_ATTEMPTS && seen.has(timeKey(time)); a++) {
      time = generateClockTime(opts.step, rng);
    }
    seen.add(timeKey(time));
    return {
      id: `clock-${i}`,
      time,
      step: opts.step,
      answerWith: resolveAnswerWith(opts.type, rng),
    };
  });
}
