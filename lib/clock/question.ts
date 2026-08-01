/** Clock question model + answer checking (pure). */
import { clockPhrase, formatDigital } from './format';
import {
  generateClockTime,
  resolveJump,
  resolveStep,
  shiftTime,
} from './generate';
import type {
  ClockAnswerType,
  ClockComplexity,
  ClockDirection,
  ClockJump,
  ClockPhrase,
  ClockSkill,
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
  /** The clock shown to the child (the START time for an elapsed question). */
  time: ClockTime;
  /** The time the child must answer — equals `time` except for elapsed. */
  target: ClockTime;
  step: ClockStep;
  /** What's being practised. */
  skill: ClockSkill;
  /** Resolved answer surface for this question (mixed picks per question). */
  answerWith: ClockAnswerSurface;
  /** For elapsed questions: the jump applied to `time` to reach `target`. */
  shift?: { minutes: number; dir: ClockDirection };
}

/** The answer surfaces a skill can use (mixed draws from this set). */
export function surfacesForSkill(skill: ClockSkill): ClockAnswerSurface[] {
  if (skill === 'set') return ['set'];
  if (skill === 'read') return ['digital', 'pattern'];
  return ['digital', 'pattern', 'set']; // elapsed
}

/** Resolve the answer surface, picking randomly for "mixed" within the skill. */
export function resolveAnswerWith(
  type: ClockAnswerType,
  skill: ClockSkill,
  rng: () => number = Math.random,
): ClockAnswerSurface {
  if (skill === 'set') return 'set';
  if (type === 'mixed') {
    const surfaces = surfacesForSkill(skill);
    return surfaces[Math.floor(rng() * surfaces.length)];
  }
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
  step: ClockComplexity;
  type: ClockAnswerType;
  skill: ClockSkill;
  jump: ClockJump;
  rng?: () => number;
}): ClockQuestion[] {
  const rng = opts.rng ?? Math.random;
  // Every question in a session shows a distinct time, so it reads as random
  // rather than repeating the same clock.
  const seen = new Set<string>();
  // The minute hand is the most visible feature, and each step exposes only a
  // few minute values (quarter → 4, five → 12). Dedup on the whole time alone
  // still lets the SAME minute land on question after question (3:45, 9:45,
  // 6:45 …), which reads as "stuck". So we also steer the minute away from the
  // previous question's when the step offers an alternative — a soft rule that
  // yields to the hard "distinct time" one and to a tight space.
  let prevMinute: number | null = null;
  return Array.from({ length: opts.count }, (_, i) => {
    const step = resolveStep(opts.step, rng);
    let time = generateClockTime(step, rng);
    // Prefer a candidate that is both an unseen time AND (when possible) a
    // fresh minute value; keep the first unseen time as a fallback so a tight
    // space never loses the distinct-time guarantee or spins forever.
    let unseenFallback = seen.has(timeKey(time)) ? null : time;
    for (
      let a = 0;
      a < TIME_DEDUP_ATTEMPTS &&
      (seen.has(timeKey(time)) || time.minute === prevMinute);
      a++
    ) {
      time = generateClockTime(step, rng);
      if (!seen.has(timeKey(time))) unseenFallback ??= time;
    }
    if (seen.has(timeKey(time))) time = unseenFallback ?? time;
    seen.add(timeKey(time));
    prevMinute = time.minute;

    // Elapsed questions ask for a time a duration away from the one shown.
    let target = time;
    let shift: { minutes: number; dir: ClockDirection } | undefined;
    if (opts.skill === 'elapsed') {
      const minutes = resolveJump(opts.jump, rng);
      const dir: ClockDirection = rng() < 0.5 ? 'after' : 'before';
      target = shiftTime(time, dir === 'after' ? minutes : -minutes);
      shift = { minutes, dir };
    }

    return {
      id: `clock-${i}`,
      time,
      target,
      step,
      skill: opts.skill,
      answerWith: resolveAnswerWith(opts.type, opts.skill, rng),
      shift,
    };
  });
}
