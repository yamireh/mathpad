/** Random time generation for the Clock module. */
import type {
  ClockComplexity,
  ClockJump,
  ClockStep,
  ClockTime,
} from './types';

/** Minutes between valid positions for each complexity step. */
export const STEP_MINUTES: Record<ClockStep, number> = {
  quarter: 15,
  five: 5,
  minute: 1,
};

const STEPS: readonly ClockStep[] = ['quarter', 'five', 'minute'];

/** Resolve a session complexity to a concrete step ('any' picks one at random). */
export function resolveStep(
  complexity: ClockComplexity,
  rng: () => number = Math.random,
): ClockStep {
  return complexity === 'any' ? STEPS[Math.floor(rng() * STEPS.length)] : complexity;
}

/**
 * Candidate durations (in minutes) for each jump size. Kept to ≤ 2 hours so the
 * resulting time stays easy to reason about on a 12-hour face.
 */
const JUMP_CHOICES: Record<Exclude<ClockJump, 'any'>, number[]> = {
  hour: [60, 120],
  half: [30, 60, 90, 120],
  five: Array.from({ length: 24 }, (_, i) => (i + 1) * 5), // 5, 10, … 120
};

/** Pick a concrete elapsed duration (minutes) for a jump size. */
export function resolveJump(
  jump: ClockJump,
  rng: () => number = Math.random,
): number {
  if (jump === 'any') return 1 + Math.floor(rng() * 120); // 1..120
  const choices = JUMP_CHOICES[jump];
  return choices[Math.floor(rng() * choices.length)];
}

/** Shift a 12-hour clock time by a signed number of minutes (wraps around). */
export function shiftTime(time: ClockTime, deltaMinutes: number): ClockTime {
  const span = 12 * 60;
  const base = (time.hour % 12) * 60 + time.minute; // 12 o'clock → 0
  const norm = (((base + deltaMinutes) % span) + span) % span;
  const h = Math.floor(norm / 60);
  return { hour: h === 0 ? 12 : h, minute: norm % 60 };
}

/** Pick a random valid time (hour 1–12) for the given complexity step. */
export function generateClockTime(
  step: ClockStep,
  rng: () => number = Math.random,
): ClockTime {
  const hour = 1 + Math.floor(rng() * 12); // 1..12
  const stepMinutes = STEP_MINUTES[step];
  const slots = 60 / stepMinutes;
  const minute = Math.floor(rng() * slots) * stepMinutes; // 0, step, 2·step, …
  return { hour, minute };
}
