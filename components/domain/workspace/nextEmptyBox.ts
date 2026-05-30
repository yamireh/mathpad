import { type AnswerInk, getBoxStrokes, type InkStroke } from '../ink';
import {
  parseDivisionDraftId,
  parsePartialId,
  parseTimesCarryId,
} from './boxIds';

/** First empty box in `seq` strictly after `currentId`; null if none. */
export function nextEmptyBox(
  seq: string[],
  currentId: string,
  ink: AnswerInk,
  carryInk: InkStroke[][] | undefined,
  partialInk: InkStroke[][][] | undefined,
  timesCarryInk: InkStroke[][][] | undefined,
  divisionDraftInk: InkStroke[][][] | undefined,
): string | null {
  const startIdx = seq.indexOf(currentId);
  for (let i = startIdx + 1; i < seq.length; i += 1) {
    const id = seq[i];
    if (isEmpty(id, ink, carryInk, partialInk, timesCarryInk, divisionDraftInk)) {
      return id;
    }
  }
  return null;
}

function isEmpty(
  id: string,
  ink: AnswerInk,
  carryInk: InkStroke[][] | undefined,
  partialInk: InkStroke[][][] | undefined,
  timesCarryInk: InkStroke[][][] | undefined,
  divisionDraftInk: InkStroke[][][] | undefined,
): boolean {
  if (id.startsWith('carry-')) {
    const col = Number(id.slice(6));
    return (carryInk?.[col]?.length ?? 0) === 0;
  }
  const tc = parseTimesCarryId(id);
  if (tc) return (timesCarryInk?.[tc.row]?.[tc.col]?.length ?? 0) === 0;
  const pp = parsePartialId(id);
  if (pp) return (partialInk?.[pp.row]?.[pp.col]?.length ?? 0) === 0;
  const dd = parseDivisionDraftId(id);
  if (dd) return (divisionDraftInk?.[dd.row]?.[dd.col]?.length ?? 0) === 0;
  return getBoxStrokes(ink, id).length === 0;
}
