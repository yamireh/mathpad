/** Types for the Clock module (telling the time on a 12-hour analog face). */

/** A time on a 12-hour analog clock. `hour` is 1–12, `minute` is 0–59. */
export interface ClockTime {
  hour: number;
  minute: number;
}

/** Minute granularity of the times shown — one concrete step. */
export type ClockStep = 'quarter' | 'five' | 'minute';

/**
 * The "Complexity" setting: a concrete step, or `any` to blend all three
 * across a session (each question resolves to a concrete step).
 */
export type ClockComplexity = ClockStep | 'any';

/**
 * What the child practises — the "Skill" setting (the top axis).
 *  - `read`    : read the shown clock and answer (write or say)
 *  - `set`     : given a digital time, move the hands to match
 *  - `elapsed` : given a start time + a duration, answer the resulting time
 */
export type ClockSkill = 'read' | 'set' | 'elapsed';

/** Which way an elapsed-time question runs. */
export type ClockDirection = 'after' | 'before';

/**
 * Elapsed "Jump size" — how big the time jump is, mirroring the school ramp:
 * whole hours → half hours → 5-minute → any minute.
 */
export type ClockJump = 'hour' | 'half' | 'five' | 'any';

/**
 * How the child answers — the "Answer with" setting (for read & elapsed).
 *  - `digital`  : write the time
 *  - `pattern`  : build the spoken phrase from tiles
 *  - `set`      : move the hands to match (elapsed only)
 *  - `mixed`    : a mix of the above
 */
export type ClockAnswerType = 'digital' | 'pattern' | 'set' | 'mixed';

/**
 * A spoken-time phrase as structured parts (not a string), so the UI can render
 * localized word tiles and check the "pattern" answer structurally. Language is
 * applied in the view layer; this stays language-neutral.
 */
export type ClockPhrase =
  | { kind: 'oclock'; hour: number }
  | { kind: 'quarterPast'; hour: number }
  | { kind: 'half'; hour: number }
  | { kind: 'quarterTo'; hour: number }
  | { kind: 'past'; minutes: number; hour: number }
  | { kind: 'to'; minutes: number; hour: number };
