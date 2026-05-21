/** Domain components — math-specific reusable UI. */
export {
  DigitRangeSelector,
  type DigitRangeSelectorProps,
} from './DigitRangeSelector';
export {
  ModeRadioGroup,
  type ModeOptionItem,
  type ModeRadioGroupProps,
} from './ModeRadioGroup';
export { OperationCard, type OperationCardProps } from './OperationCard';
export { ProblemDisplay, type ProblemDisplayProps } from './ProblemDisplay';
export {
  QuestionResultRow,
  type QuestionResultRowProps,
} from './QuestionResultRow';
export { TimerDisplay, type TimerDisplayProps } from './TimerDisplay';

export {
  type AnswerShape,
  answerShape,
  DIGIT_COLUMN_WIDTH,
  ANSWER_BOX_HEIGHT,
  digitCount,
  operatorSymbol,
} from './layout';
export {
  formatAnswer,
  formatProblem,
  formatSubmittedAnswer,
  isBlankSubmission,
} from './format';
