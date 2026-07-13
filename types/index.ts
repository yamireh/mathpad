/**
 * Shared, app-wide TypeScript types.
 *
 * Domain types that span multiple features live here (SPEC § Architecture →
 * Types). Feature-local types stay co-located with their code.
 */

/* -------------------------------------------------------------------------- */
/* Operations                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A practice topic. The four arithmetic operations plus `mix`, which
 * randomises across all four within a single session.
 */
export type Operation =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'mix';

/**
 * A single concrete operation — one that can back an individual question.
 * Excludes `mix`, which is a session-level mode.
 */
export type ConcreteOperation = Exclude<Operation, 'mix'>;

/* -------------------------------------------------------------------------- */
/* Settings primitives                                                          */
/* -------------------------------------------------------------------------- */

/** Number of digits in an operand. SPEC: user picks from {1,2,3,4}. */
export type DigitCount = 1 | 2 | 3 | 4;

/** Inclusive digit-count range; each question randomises within it. */
export interface DigitRange {
  min: DigitCount;
  max: DigitCount;
}

/** Number of questions in a session. SPEC: 5 / 10 / 15 / 20 (plus 1 / 2 as
 *  dev-only quick options for recording short demos). */
export type QuestionCount = 1 | 2 | 5 | 10 | 15 | 20;

/** Total session timer duration in minutes. SPEC: 3 / 5 / 10 / 15. */
export type TimerDuration = 3 | 5 | 10 | 15;

/** Optional session timer. */
export interface TimerSetting {
  enabled: boolean;
  durationMinutes: TimerDuration;
}

/** With / Without / Random — carrying, borrowing, regrouping. */
export type ModeOption = 'with' | 'without' | 'random';

/** Off / On / Random — subtraction "allow negative answers". */
export type NegativeAnswerOption = 'off' | 'on' | 'random';

/** Off / On / Random — decimal operands for addition / subtraction / multiplication. */
export type DecimalOption = 'off' | 'on' | 'random';

/** Division answer type. `all` mixes the three concrete types in a session. */
export type DivisionAnswerType =
  | 'noRemainder'
  | 'remainder'
  | 'decimal'
  | 'all'
  | 'random';

/** Division working layout — chosen up front in settings, not mid-solution. */
export type DivisionFormat = 'row' | 'long';

/* -------------------------------------------------------------------------- */
/* Settings (per-operation, discriminated union on `operation`)                 */
/* -------------------------------------------------------------------------- */

/** Settings common to every operation. */
export interface BaseSettings {
  /**
   * Digit-count picker. Multi-select — every selected count is equally
   * likely to drive an operand's digit count when generating questions.
   * `[2, 3]` matches the old "from 2 to 3" range, but the kid can now
   * skip a value (e.g. `[2, 4]` gives 2- and 4-digit problems only).
   */
  digitCounts: DigitCount[];
  questionCount: QuestionCount;
  timer: TimerSetting;
}

export interface AdditionSettings extends BaseSettings {
  operation: 'addition';
  carrying: ModeOption;
  /** Decimal operands (independent of carrying). */
  decimals: DecimalOption;
}

export interface SubtractionSettings extends BaseSettings {
  operation: 'subtraction';
  borrowing: ModeOption;
  allowNegative: NegativeAnswerOption;
  /** Decimal operands (independent of borrowing). */
  decimals: DecimalOption;
}

export interface MultiplicationSettings extends BaseSettings {
  operation: 'multiplication';
  regrouping: ModeOption;
  /** Decimal operands (independent of regrouping). */
  decimals: DecimalOption;
}

export interface DivisionSettings extends BaseSettings {
  operation: 'division';
  answerType: DivisionAnswerType;
  /** Working layout: in-a-row (`a ÷ b = `) or the long-division bracket. */
  divisionType: DivisionFormat;
  /**
   * Dividend digit count (single number, not a multi-select). Division
   * questions use a precise dividend / divisor digit count rather than the
   * `digitCounts` field from `BaseSettings`, which is left at its defaults.
   */
  dividendDigits: DigitCount;
  /** Divisor digit count (single number). */
  divisorDigits: DigitCount;
}

export interface MixSettings extends BaseSettings {
  operation: 'mix';
}

/** Settings for any operation. */
export type Settings =
  | AdditionSettings
  | SubtractionSettings
  | MultiplicationSettings
  | DivisionSettings
  | MixSettings;

/** Narrow `Settings` to one operation, e.g. `SettingsFor<'division'>`. */
export type SettingsFor<O extends Operation> = Extract<
  Settings,
  { operation: O }
>;

/* -------------------------------------------------------------------------- */
/* Questions                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * How a question is laid out on the Practice screen. Division picks its layout
 * from digit count and answer type (SPEC § Practice → Problem display).
 */
export type ProblemLayout =
  | 'vertical'
  | 'divisionHorizontal'
  | 'divisionLong'
  | 'divisionDecimal';

/** The canonical correct answer to a question. */
export type QuestionAnswer =
  | { kind: 'integer'; value: number }
  | { kind: 'remainder'; quotient: number; remainder: number }
  | { kind: 'decimal'; value: number; decimalPlaces: number };

/** A single generated math problem. */
export interface Question {
  /** Stable id, unique within a session. */
  id: string;
  operation: ConcreteOperation;
  /** `[top, bottom]` operands as displayed. */
  operands: [number, number];
  /**
   * Decimal places per operand for decimal +/−/× questions. Absent (or
   * `[0, 0]`) means integer operands. Stored explicitly so the column grid
   * doesn't have to recover places from a float.
   */
  operandDecimals?: [number, number];
  answer: QuestionAnswer;
  layout: ProblemLayout;
}

/* -------------------------------------------------------------------------- */
/* Recognition results                                                          */
/* -------------------------------------------------------------------------- */

/** Outcome of recognising a single answer-box digit. */
export interface DigitRecognitionResult {
  /** Recognised digit 0–9, or null when no confident digit was found. */
  digit: number | null;
  /** Engine confidence in the 0–1 range when available, otherwise null. */
  confidence: number | null;
  /** Raw top-candidate text from the engine, kept for debugging. */
  raw: string | null;
}

/** Outcome of recognising the optional leading minus sign. */
export interface SignRecognitionResult {
  /** 'minus' when a minus sign was recognised; null when blank or ambiguous. */
  sign: 'minus' | null;
  confidence: number | null;
  raw: string | null;
}

/* -------------------------------------------------------------------------- */
/* Answers and results                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The kid's recognised answer to a question. Digits are left→right per column;
 * `null` means that box was left blank.
 */
export interface SubmittedAnswer {
  /** From the optional sign box (negative-answer mode). */
  sign: 'minus' | null;
  /** Integer-part digit columns. */
  integerDigits: (number | null)[];
  /** Decimal-part digit columns (decimal mode only). */
  decimalDigits: (number | null)[];
  /** Remainder digit columns (remainder mode only). */
  remainderDigits: (number | null)[];
}

/** Per-question status within a session. */
export type QuestionStatus = 'correct_first_try' | 'wrong' | 'fixed';

/** A question paired with the kid's answer and its marking status. */
export interface QuestionResult {
  question: Question;
  /** The kid's recognised answer; `null` if never attempted. */
  submittedAnswer: SubmittedAnswer | null;
  status: QuestionStatus;
  /** The kid used a hint on this question during practice. */
  hinted?: boolean;
  /** The kid used Solve (the app filled the answer) on this question. */
  solved?: boolean;
}

/**
 * A completed practice session, as persisted to local history.
 * Raw ink stroke data is intentionally NOT part of this type (SPEC § storage).
 */
export interface SessionResult {
  /** Stable id. */
  id: string;
  /** ISO 8601 completion timestamp. */
  completedAt: string;
  operation: Operation;
  /** The settings the session was generated with. */
  settings: Settings;
  /** Correct count at first Finish — locked, never changes. */
  firstTryScore: number;
  /** Correct count after any fixes. */
  finalScore: number;
  totalQuestions: number;
  /** Elapsed wall-clock seconds. */
  durationSeconds: number;
  questions: QuestionResult[];
}
