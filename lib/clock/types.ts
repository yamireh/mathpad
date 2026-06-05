/** Types for the Clock module (telling the time on a 12-hour analog face). */

/** A time on a 12-hour analog clock. `hour` is 1–12, `minute` is 0–59. */
export interface ClockTime {
  hour: number;
  minute: number;
}

/** Minute granularity — the "Complexity" setting (15s / 5s / Minutes). */
export type ClockStep = 'quarter' | 'five' | 'minute';

/**
 * How the child answers — the "Type" setting.
 *  - `digital`  : read the clock, write the time
 *  - `pattern`  : read the clock, build the spoken phrase from tiles
 *  - `set`      : given a digital time, move the hands to match
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
