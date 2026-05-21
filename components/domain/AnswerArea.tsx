import type { Question } from '../../types';
import { DecimalAnswerRow } from './DecimalAnswerRow';
import { RemainderAnswerRow } from './RemainderAnswerRow';
import { SignedAnswerRow } from './SignedAnswerRow';
import { type AnswerInk } from './ink';
import { answerShape } from './layout';

export interface AnswerAreaProps {
  question: Question;
  ink: AnswerInk;
  onChange: (ink: AnswerInk) => void;
  selectedBox: string | null;
  onSelectBox: (boxId: string) => void;
  tone?: string;
}

/** Picks and renders the answer area matching a question's answer kind. */
export function AnswerArea({
  question,
  ink,
  onChange,
  selectedBox,
  onSelectBox,
  tone,
}: AnswerAreaProps) {
  const shared = {
    shape: answerShape(question),
    ink,
    onChange,
    selectedBox,
    onSelectBox,
    tone,
  };
  if (question.answer.kind === 'decimal') {
    return <DecimalAnswerRow {...shared} />;
  }
  if (question.answer.kind === 'remainder') {
    return <RemainderAnswerRow {...shared} />;
  }
  return <SignedAnswerRow {...shared} />;
}
