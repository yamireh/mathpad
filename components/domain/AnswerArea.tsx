import type { ProblemLayout, Question } from '../../types';
import { DecimalAnswerRow } from './DecimalAnswerRow';
import { RemainderAnswerRow } from './RemainderAnswerRow';
import { SignedAnswerRow } from './SignedAnswerRow';
import { type AnswerInk } from './ink';
import { answerShape } from './layout';

export interface AnswerAreaProps {
  question: Question;
  /** Effective layout (after any override) — affects the answer-area shape. */
  layout?: ProblemLayout;
  ink: AnswerInk;
  onChange: (ink: AnswerInk) => void;
  selectedBox: string | null;
  onSelectBox: (boxId: string) => void;
  tone?: string;
  /** Whether a given box may currently be written (sequential fill order). */
  isBoxWritable?: (boxId: string) => boolean;
}

/** Picks and renders the answer area matching a question's answer kind. */
export function AnswerArea({
  question,
  layout,
  ink,
  onChange,
  selectedBox,
  onSelectBox,
  tone,
  isBoxWritable,
}: AnswerAreaProps) {
  const shared = {
    shape: answerShape(question, layout),
    ink,
    onChange,
    selectedBox,
    onSelectBox,
    tone,
    isBoxWritable,
  };
  if (question.answer.kind === 'decimal') {
    return <DecimalAnswerRow {...shared} />;
  }
  if (question.answer.kind === 'remainder') {
    return <RemainderAnswerRow {...shared} />;
  }
  return <SignedAnswerRow {...shared} />;
}
