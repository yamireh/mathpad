/**
 * Recognition adapter.
 *
 * The public surface the app uses to turn handwritten ink into digits and the
 * optional leading minus sign. It wraps the local `digital-ink` native module,
 * which bridges to Google ML Kit Digital Ink Recognition — the engine
 * validated in the recognition POC.
 *
 * This phase establishes the API surface only: `recognizeDigit` and
 * `recognizeSign` are stubs. Wiring the real ML Kit calls (model
 * download/lifecycle, candidate decoding, digit post-filtering) lands in a
 * later phase.
 */
import DigitalInk, { type Stroke } from '../../modules/digital-ink';

export type { Stroke } from '../../modules/digital-ink';

/**
 * The underlying handwriting-recognition engine (ML Kit Digital Ink, via the
 * local native module). Exposed so later phases — and tests — can call or
 * mock it directly.
 */
export const engine = DigitalInk;

/**
 * ML Kit language tag whose model backs digit/sign recognition. The POC
 * validated `en-US`; digits are language-independent, so this is unlikely to
 * vary per app locale.
 */
export const RECOGNITION_LANGUAGE = 'en-US';

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
  /** Engine confidence in the 0–1 range when available, otherwise null. */
  confidence: number | null;
  /** Raw top-candidate text from the engine, kept for debugging. */
  raw: string | null;
}

const NOT_IMPLEMENTED =
  'recognition adapter is not wired up yet — implemented in a later phase';

/**
 * Recognise a single handwritten digit from one answer box.
 *
 * STUB — throws until the recognition phase. The real implementation will call
 * `engine.recognize(RECOGNITION_LANGUAGE, strokes)` and post-filter candidates
 * down to digits 0–9 (ML Kit has no digit-only model).
 */
export async function recognizeDigit(
  _strokes: Stroke[],
): Promise<DigitRecognitionResult> {
  throw new Error(NOT_IMPLEMENTED);
}

/**
 * Recognise the optional leading minus sign (negative-answer mode).
 *
 * STUB — throws until the recognition phase. ML Kit has no native minus-sign
 * class, so the real implementation will need careful candidate handling.
 */
export async function recognizeSign(
  _strokes: Stroke[],
): Promise<SignRecognitionResult> {
  throw new Error(NOT_IMPLEMENTED);
}
