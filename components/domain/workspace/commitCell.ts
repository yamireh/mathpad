/**
 * Live answer-cell recognition, factored out of the workspace so the decision
 * is unit-testable without rendering the whole practice screen.
 *
 * During practice, when the kid finishes writing in a final-answer digit cell
 * (`int-`/`dec-`/`rem-`), the workspace recognizes that one cell immediately —
 * instead of waiting for Finish — so a misread is caught on the spot. This
 * helper turns a cell's raw ink into one of three verdicts; the caller decides
 * what to do with each (replace the ink with a clean glyph, or clear it and
 * prompt the kid to try again).
 */
import type { InkStroke } from '../ink';

/** Recognizes a single cell's ink into a digit (null when unreadable). */
export type DigitRecognizer = (
  strokes: InkStroke[],
) => Promise<{ digit: number | null }>;

export type CommitVerdict =
  /** Nothing to do — the cell is empty (or recognition was unavailable). */
  | { kind: 'skip' }
  /** Recognized a digit — replace the ink with a clean glyph. */
  | { kind: 'ok'; digit: number }
  /** Ink present but unreadable — clear the cell and prompt a retry. */
  | { kind: 'invalid' };

/**
 * Recognize one answer cell's ink. Empty ink is a no-op. A recognizer failure
 * (model not ready, native error) fails *open* — treated as `skip`, never as
 * `invalid` — so a transient hiccup can never wrongly reject the kid's answer;
 * the untouched ink is still recognized at Finish.
 */
export async function recognizeAnswerCell(
  strokes: InkStroke[],
  recognize: DigitRecognizer,
): Promise<CommitVerdict> {
  if (strokes.length === 0) return { kind: 'skip' };
  let result: { digit: number | null };
  try {
    result = await recognize(strokes);
  } catch {
    return { kind: 'skip' };
  }
  return result.digit == null
    ? { kind: 'invalid' }
    : { kind: 'ok', digit: result.digit };
}
