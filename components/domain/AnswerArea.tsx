import type { Question } from '../../types';
import { DecimalAnswerRow } from './DecimalAnswerRow';
import { RemainderAnswerRow } from './RemainderAnswerRow';
import { SignedAnswerRow } from './SignedAnswerRow';
import { type AnswerInk } from './ink';
import { answerShape } from './layout';

export interface AnswerAreaProps {
  question: Question;
  ink: AnswerInk;
  /** Clear one answer box by id. */
  onClearBox: (boxId: string) => void;
  selectedBox: string | null;
  onSelectBox: (boxId: string) => void;
  tone?: string;
  /** Whether a given box may currently be written (sequential fill order). */
  isBoxWritable?: (boxId: string) => boolean;
  /** Column / cell width — defaults to the full grid. */
  cellWidth?: number;
  /** Answer box height — defaults to the full grid. */
  boxHeight?: number;
}

/** Picks and renders the answer area matching a question's answer kind. */
export function AnswerArea({
  question,
  ink,
  onClearBox,
  selectedBox,
  onSelectBox,
  tone,
  isBoxWritable,
  cellWidth,
  boxHeight,
}: AnswerAreaProps) {
  const shared = {
    shape: answerShape(question),
    ink,
    onClearBox,
    selectedBox,
    onSelectBox,
    tone,
    isBoxWritable,
    cellWidth,
    boxHeight,
  };
  if (question.answer.kind === 'decimal') {
    // Multiplication aligns its answer with the integer partial-product rows,
    // so its decimal point is a thin mark, not a column (unlike +/− and ÷).
    return (
      <DecimalAnswerRow
        {...shared}
        thinDot={question.operation === 'multiplication'}
      />
    );
  }
  if (question.answer.kind === 'remainder') {
    return <RemainderAnswerRow {...shared} />;
  }
  return <SignedAnswerRow {...shared} />;
}
