/** Random time generation for the Clock module. */
import type { ClockStep, ClockTime } from './types';

/** Minutes between valid positions for each complexity step. */
export const STEP_MINUTES: Record<ClockStep, number> = {
  quarter: 15,
  five: 5,
  minute: 1,
};

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
