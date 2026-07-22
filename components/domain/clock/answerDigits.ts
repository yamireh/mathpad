import { recognizeNumber } from '../../../lib/recognition';
import type { InkStroke } from '../ink';

/**
 * What a "write the time" field reports upward. Once the field converts to a
 * printed number, `digits` carries its own recognized value so the answer is
 * judged from *exactly* what the kid sees — never a second recognition of
 * regenerated ink (which could disagree: a canonical "1" glyph re-read as "7").
 * While the kid is still writing, `digits` is null and `strokes` holds the raw
 * handwriting, recognized on demand at judge time.
 */
export interface ClockFieldValue {
  strokes: InkStroke[];
  digits: number[] | null;
}

/**
 * The digits a field holds: its own recognized value when it has converted
 * (trusted as-is, no re-recognition), otherwise a fresh recognition of the raw
 * handwriting (the kid submitted before the field converted).
 */
export async function fieldDigits(value: ClockFieldValue): Promise<number[]> {
  return value.digits ?? (await recognizeNumber(value.strokes)).integerDigits;
}
