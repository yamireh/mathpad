/**
 * Review error marks.
 *
 * Builds the per-box correct/incorrect map shown when the kid taps "Show
 * errors" on the review screen. The correct digit for every box id comes from
 * {@link computeSolvePlan}; the kid's digit comes from recognising each box's
 * ink (same engine the answer-marking uses). A box is keyed by the same id the
 * workspace uses (`int-/dec-/rem-`, `sign`, `carry-`, `pp-`, `tcarry-`, `dd-`,
 * `dcarry-`), so the result drops straight into the render chain.
 *
 * Marking policy (per product decision):
 *  - Final-answer boxes (`int-/dec-/rem-/sign`): a required box left blank or
 *    wrong is RED; a correct one is GREEN. Leading/trailing zero-padding is not
 *    penalised (it matches value-based scoring).
 *  - Working boxes (`carry-/pp-/tcarry-/dd-/dcarry-`): only ones the kid
 *    actually wrote in are marked; blanks stay neutral.
 */
import type { AnswerInk, InkStroke } from '../../components/domain/ink';
import { getBoxStrokes } from '../../components/domain/ink';
import { recognizeDigit, recognizeSign } from '../recognition';
import { computeSolvePlan } from '../solver/solveValues';
import type { ProblemLayout, Question } from '../../types';

/** Per-box review status. Absent from the map = neutral (no border change). */
export type BoxStatus = 'correct' | 'incorrect';

/** Box id → review status for every non-neutral box. */
export type ReviewMarks = Map<string, BoxStatus>;

export interface ReviewMarksInput {
  question: Question;
  layout: ProblemLayout;
  answerInk: AnswerInk;
  carryInk?: InkStroke[][];
  partialInk?: InkStroke[][][];
  timesCarryInk?: InkStroke[][][];
  divisionDraftInk?: InkStroke[][][];
  divisionCarryInk?: InkStroke[][][];
}

/** One inked box awaiting recognition. */
interface InkedBox {
  id: string;
  strokes: InkStroke[];
}

/** Collect every box that has ink, paired with its workspace box id. */
function collectInkedBoxes(input: ReviewMarksInput): InkedBox[] {
  const boxes: InkedBox[] = [];
  const push = (id: string, strokes: InkStroke[] | undefined) => {
    if (strokes && strokes.length > 0) boxes.push({ id, strokes });
  };

  const { answerInk } = input;
  answerInk.integer.forEach((s, i) => push(`int-${i}`, s));
  answerInk.decimal.forEach((s, i) => push(`dec-${i}`, s));
  answerInk.remainder.forEach((s, i) => push(`rem-${i}`, s));

  input.carryInk?.forEach((s, col) => push(`carry-${col}`, s));
  input.partialInk?.forEach((row, r) =>
    row?.forEach((s, c) => push(`pp-${r}-${c}`, s)),
  );
  input.timesCarryInk?.forEach((row, r) =>
    row?.forEach((s, c) => push(`tcarry-${r}-${c}`, s)),
  );
  input.divisionDraftInk?.forEach((row, r) =>
    row?.forEach((s, c) => push(`dd-${r}-${c}`, s)),
  );
  input.divisionCarryInk?.forEach((step, s) =>
    step?.forEach((strokes, c) => push(`dcarry-${s}-${c}`, strokes)),
  );

  return boxes;
}

/** True for the final-answer digit boxes (not the working scaffold). */
function isAnswerBox(id: string): boolean {
  return (
    id.startsWith('int-') || id.startsWith('dec-') || id.startsWith('rem-')
  );
}

/**
 * Recognise every inked box and compare it to the correct digit, returning the
 * per-box status map. Recognition runs only on boxes that have ink, so blank
 * working cells cost nothing and stay neutral.
 */
export async function computeReviewMarks(
  input: ReviewMarksInput,
): Promise<ReviewMarks> {
  const { question, layout, answerInk } = input;
  const expected = computeSolvePlan(question, layout).values;
  const inked = collectInkedBoxes(input);

  const digits = await Promise.all(
    inked.map((box) => recognizeDigit(box.strokes).then((r) => r.digit)),
  );
  const written = new Map<string, number | null>();
  inked.forEach((box, i) => written.set(box.id, digits[i]));

  const marks: ReviewMarks = new Map();

  // Every box the kid wrote in: compare to the expected digit.
  for (const { id } of inked) {
    const exp = expected.get(id);
    const w = written.get(id) ?? null;
    if (exp !== undefined) {
      marks.set(id, w === exp ? 'correct' : 'incorrect');
    } else if (w !== null && w !== 0) {
      // A box with no expected digit is fine only if it's a harmless zero: a
      // leading zero pad (`03`, `3.50`) or the unused leading cell of a short/
      // zero difference in the long-division draft. Any other stray digit is a
      // mistake.
      marks.set(id, 'incorrect');
    }
  }

  // Required answer boxes the kid left blank are mistakes too (a required
  // digit is required even when it's a 0).
  for (const [id] of expected) {
    if (!isAnswerBox(id) || written.has(id)) continue;
    marks.set(id, 'incorrect');
  }

  // Sign box (negative-answer mode).
  const expectsMinus =
    question.answer.kind === 'integer' && question.answer.value < 0;
  const signStrokes = getBoxStrokes(answerInk, 'sign');
  if (expectsMinus) {
    const sign = signStrokes.length
      ? (await recognizeSign(signStrokes)).sign
      : null;
    marks.set('sign', sign === 'minus' ? 'correct' : 'incorrect');
  } else if (signStrokes.length > 0) {
    marks.set('sign', 'incorrect');
  }

  return marks;
}
