/**
 * Recognition adapter.
 *
 * The abstraction layer between the app and the handwriting-recognition engine
 * (SPEC.md § Recognition requirements). Screens only ever call
 * `recognizeDigit` and `recognizeSign`; the engine could be swapped here
 * without touching anything else.
 *
 * The engine is Google ML Kit Digital Ink Recognition, reached through the
 * local `digital-ink` native module. ML Kit downloads its model once over the
 * network — that is a one-time setup step (see `prepareModel`); recognition
 * itself is fully offline, satisfying SPEC's "zero network calls at runtime".
 */
import DigitalInk, { type Stroke } from '../../modules/digital-ink';

import type {
  DigitRecognitionResult,
  SignRecognitionResult,
} from '../../types';

export type { Stroke } from '../../modules/digital-ink';
export type {
  DigitRecognitionResult,
  SignRecognitionResult,
} from '../../types';

/**
 * ML Kit language tag whose model backs recognition. Digits and the minus sign
 * are language-independent, so a single model serves every app locale.
 */
export const RECOGNITION_LANGUAGE = 'en-US';

/** Characters ML Kit may return for a hand-drawn minus stroke. */
const MINUS_FORMS = new Set(['-', '−', '–', '—', '‐', '_']);

/* -------------------------------------------------------------------------- */
/* Model lifecycle                                                              */
/* -------------------------------------------------------------------------- */

/** Whether the recognition model is already downloaded and ready. */
export function isModelReady(): Promise<boolean> {
  return DigitalInk.isModelDownloaded(RECOGNITION_LANGUAGE);
}

/**
 * Ensure the recognition model is available, downloading it if needed.
 * Call once at app startup (a one-time, online setup step) — never mid-session.
 */
export async function prepareModel(): Promise<void> {
  if (await DigitalInk.isModelDownloaded(RECOGNITION_LANGUAGE)) return;
  await DigitalInk.downloadModel(RECOGNITION_LANGUAGE);
}

/* -------------------------------------------------------------------------- */
/* Recognition                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Recognise a single handwritten digit from one answer box.
 *
 * ML Kit has no digit-only model, so candidates are post-filtered to the first
 * one that is a single character 0–9.
 */
export async function recognizeDigit(
  strokes: Stroke[],
): Promise<DigitRecognitionResult> {
  if (strokes.length === 0) {
    return { digit: null, confidence: null, raw: null };
  }
  const candidates = await DigitalInk.recognize(RECOGNITION_LANGUAGE, strokes);
  const raw = candidates[0]?.text ?? null;
  for (const candidate of candidates) {
    const text = candidate.text.trim();
    if (/^[0-9]$/.test(text)) {
      return { digit: Number(text), confidence: candidate.score ?? null, raw };
    }
  }
  return { digit: null, confidence: null, raw };
}

/**
 * Recognise the optional leading minus sign (negative-answer mode).
 *
 * ML Kit has no dedicated minus class; a hand-drawn minus can come back in
 * several dash-like forms, so all are accepted. If on-device testing shows
 * this is unreliable, the SignedAnswerRow can fall back to a +/- toggle
 * without changing this adapter's API (SPEC § Recognition requirements).
 */
export async function recognizeSign(
  strokes: Stroke[],
): Promise<SignRecognitionResult> {
  if (strokes.length === 0) {
    return { sign: null, confidence: null, raw: null };
  }
  const candidates = await DigitalInk.recognize(RECOGNITION_LANGUAGE, strokes);
  const raw = candidates[0]?.text ?? null;
  for (const candidate of candidates) {
    if (MINUS_FORMS.has(candidate.text.trim())) {
      return { sign: 'minus', confidence: candidate.score ?? null, raw };
    }
  }
  return { sign: null, confidence: null, raw };
}

/** A whole handwritten number, split into integer and decimal digits. */
export interface NumberRecognitionResult {
  integerDigits: number[];
  decimalDigits: number[];
  raw: string | null;
}

/**
 * Recognise a whole multi-digit number from one wide writing area — used for
 * the long-division answer. Accepts a `.` or `,` decimal separator.
 */
export async function recognizeNumber(
  strokes: Stroke[],
): Promise<NumberRecognitionResult> {
  if (strokes.length === 0) {
    return { integerDigits: [], decimalDigits: [], raw: null };
  }
  const candidates = await DigitalInk.recognize(RECOGNITION_LANGUAGE, strokes);
  const raw = candidates[0]?.text ?? null;
  const toDigits = (s: string) => s.split('').map(Number);
  for (const candidate of candidates) {
    const cleaned = candidate.text.trim().replace(/\s+/g, '');
    const match = cleaned.match(/^(\d+)(?:[.,](\d+))?$/);
    if (match) {
      return {
        integerDigits: toDigits(match[1]),
        decimalDigits: match[2] ? toDigits(match[2]) : [],
        raw,
      };
    }
  }
  return { integerDigits: [], decimalDigits: [], raw };
}
