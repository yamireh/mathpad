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

/** A tiny throwaway stroke used only to warm the recognizer (see prepareModel). */
const WARMUP_STROKES: Stroke[] = [
  [
    [0, 0, 0],
    [1, 1, 8],
  ],
];

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
  if (!(await DigitalInk.isModelDownloaded(RECOGNITION_LANGUAGE))) {
    await DigitalInk.downloadModel(RECOGNITION_LANGUAGE);
  }
  // Warm the recognizer: the very first recognize per app launch otherwise pays
  // the model-load cost, during which the kid's first digit would sit as raw ink
  // before printing. A throwaway recognize forces the native recognizer to be
  // created + the model loaded into memory now. Best-effort — ignore failures.
  try {
    await DigitalInk.recognize(RECOGNITION_LANGUAGE, WARMUP_STROKES);
  } catch {
    // ignore
  }
}

/**
 * Run one recognition, tolerating a not-yet-ready model. On a fresh install the
 * model may still be downloading when the kid writes their first digit — a raw
 * `DigitalInk.recognize` throws (E_MODEL_NOT_DOWNLOADED), which upstream fails
 * *open* and leaves the ink un-converted (so the first box shows raw handwriting
 * while later boxes print cleanly). Preparing + retrying once makes that first
 * digit wait for the model instead of silently staying as ink. A genuine second
 * failure rethrows, preserving the fail-open behaviour.
 */
async function recognizeStrokes(strokes: Stroke[]) {
  try {
    return await DigitalInk.recognize(RECOGNITION_LANGUAGE, strokes);
  } catch {
    await prepareModel();
    return await DigitalInk.recognize(RECOGNITION_LANGUAGE, strokes);
  }
}

/* -------------------------------------------------------------------------- */
/* Recognition                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Recognise a single handwritten digit from one answer box.
 *
 * ML Kit has no digit-only model, so candidates are post-filtered to the
 * first one that is a single character 0–9. ML Kit also routinely confuses
 * `1` and `7` — both can read as either depending on how the kid drew the
 * top flag — so when the winning candidate is one of those two we override
 * with a stroke-shape heuristic (aspect ratio + top-bar presence) that's
 * much harder to fool.
 */
export async function recognizeDigit(
  strokes: Stroke[],
): Promise<DigitRecognitionResult> {
  if (strokes.length === 0) {
    return { digit: null, confidence: null, raw: null };
  }
  const candidates = await recognizeStrokes(strokes);
  const raw = candidates[0]?.text ?? null;
  for (const candidate of candidates) {
    const text = candidate.text.trim();
    if (/^[0-9]$/.test(text)) {
      let digit = Number(text);
      if (digit === 1 || digit === 7) {
        digit = disambiguateOneAndSeven(strokes, digit);
      } else if (digit === 0 || digit === 6) {
        digit = disambiguateZeroAndSix(strokes, digit);
      }
      return { digit, confidence: candidate.score ?? null, raw };
    }
  }
  return { digit: null, confidence: null, raw };
}

/**
 * Override ML Kit's `1` ↔ `7` confusion with a stroke-shape check based
 * almost entirely on the bounding-box aspect ratio (width / height):
 *  - a `1` is tall and narrow — even with a top hook/flag, the digit's
 *    width stays well below half its height;
 *  - a `7` is wider — the top bar pushes its width close to its height.
 *
 * The aspect-ratio signal is decisive enough on its own that we override
 * ML Kit's pick whenever the shape clearly leans one way. A horizontal
 * top-bar boost biases very ambiguous cases (aspect ~ 0.5) toward 7.
 */
function disambiguateOneAndSeven(
  strokes: Stroke[],
  mlKitGuess: 1 | 7,
): 1 | 7 {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let anyPoint = false;
  for (const stroke of strokes) {
    for (const [x, y] of stroke) {
      anyPoint = true;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!anyPoint) return mlKitGuess;
  const width = maxX - minX;
  const height = maxY - minY;
  if (height <= 0) return mlKitGuess;
  // A perfectly vertical stroke (width 0) is the clearest possible "1".
  const aspect = width / height;

  // Sum up STRONGLY horizontal segment lengths in the top 35% of the
  // bounding box. "Strongly horizontal" means the pen was at least 3×
  // more across than down at that step — a 1's flag drawn at a typical
  // diagonal angle won't qualify even if it has some leftward motion.
  const topZoneCutoff = minY + height * 0.35;
  let topHorizontalLength = 0;
  for (const stroke of strokes) {
    for (let i = 0; i + 1 < stroke.length; i += 1) {
      const [x1, y1] = stroke[i];
      const [x2, y2] = stroke[i + 1];
      if (y1 > topZoneCutoff && y2 > topZoneCutoff) continue;
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      if (dx > dy * 3) topHorizontalLength += dx;
    }
  }
  // Compare the horizontal "bar" length to the digit's HEIGHT (its long
  // axis). A 7's bar is substantial — typically ≥40% of the digit's
  // overall height. A 1's flag, even when drawn flat, is short relative
  // to the long vertical body below it.
  const barVsHeight = height > 0 ? topHorizontalLength / height : 0;

  // Top bar wins outright when it's clearly a "real" bar — long AND
  // strongly horizontal — that's the unmistakable hallmark of a 7.
  if (barVsHeight >= 0.4) return 7;
  // No real top bar — fall back to the aspect-ratio cues. A 1 is tall
  // and narrow; anything else is most likely a 7.
  if (aspect < 0.5) return 1;
  return 7;
}

/**
 * Override ML Kit's `0` ↔ `6` confusion (a round, closed `6` often reads as
 * `0`). The discriminator is *where the loop sits*:
 *  - a `0` is a symmetric oval — its widest horizontal band is near the
 *    vertical centre and its top is a full-width curve;
 *  - a `6` carries a thin tail up top and a loop in the lower half — so its
 *    widest band lands below centre and the top of the digit is narrow.
 *
 * Deliberately conservative (0 and 6 are closer in shape than 1 and 7): it
 * only overrides when the shape leans clearly one way, otherwise ML Kit's
 * pick stands. Thresholds want on-device tuning.
 */
function disambiguateZeroAndSix(strokes: Stroke[], guess: 0 | 6): 0 | 6 {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let anyPoint = false;
  for (const stroke of strokes) {
    for (const [x, y] of stroke) {
      anyPoint = true;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!anyPoint) return guess;
  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 0 || height <= 0) return guess;

  // Widest horizontal band → where the bulk of the loop sits vertically.
  const BANDS = 12;
  const lo = new Array<number>(BANDS).fill(Infinity);
  const hi = new Array<number>(BANDS).fill(-Infinity);
  for (const stroke of strokes) {
    for (const [x, y] of stroke) {
      let b = Math.floor(((y - minY) / height) * BANDS);
      if (b < 0) b = 0;
      if (b >= BANDS) b = BANDS - 1;
      if (x < lo[b]) lo[b] = x;
      if (x > hi[b]) hi[b] = x;
    }
  }
  let widestBand = 0;
  let widest = -1;
  for (let i = 0; i < BANDS; i += 1) {
    const w = hi[i] - lo[i];
    if (w > widest) {
      widest = w;
      widestBand = i;
    }
  }
  const widestPos = (widestBand + 0.5) / BANDS; // 0 = top, 1 = bottom

  // Horizontal extent of ink in the top 28% of the box, vs the full width.
  const topCutoff = minY + height * 0.28;
  let topMin = Infinity;
  let topMax = -Infinity;
  for (const stroke of strokes) {
    for (const [x, y] of stroke) {
      if (y <= topCutoff) {
        if (x < topMin) topMin = x;
        if (x > topMax) topMax = x;
      }
    }
  }
  const topRatio = topMax > topMin ? (topMax - topMin) / width : 0;

  // Loop sitting clearly below centre + a narrow top → a 6.
  if (widestPos >= 0.58 && topRatio <= 0.7) return 6;
  // Widest near/above centre, or a full-width top curve → a 0.
  if (widestPos <= 0.5 || topRatio >= 0.85) return 0;
  return guess;
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
  const candidates = await recognizeStrokes(strokes);
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
  const candidates = await recognizeStrokes(strokes);
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
