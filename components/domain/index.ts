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
export { ProblemDisplay, type ProblemDisplayProps } from './problem';
export {
  QuestionWorkspace,
  type QuestionWorkspaceHandle,
  type QuestionWorkspaceProps,
} from './QuestionWorkspace';
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

export { AnswerArea, type AnswerAreaProps } from './AnswerArea';
export { AnswerBox, type AnswerBoxProps } from './AnswerBox';
export { AnswerPad, type AnswerPadProps } from './AnswerPad';
export { CarryBox, type CarryBoxProps } from './CarryBox';
export {
  CursorTargetProvider,
  useCursorTarget,
  type CursorTarget,
  type CursorTargetValue,
  type MeasurableNode,
} from './cursorTarget';
export { HandCursor, type HandCursorProps } from './HandCursor';
export { DirectAnswerRow, type DirectAnswerRowProps } from './DirectAnswerRow';
export { DirectInkBox, type DirectInkBoxProps } from './DirectInkBox';
export {
  ScratchCanvas,
  type ScratchCanvasHandle,
  type ScratchCanvasProps,
  type ScratchTool,
} from './ScratchCanvas';
export {
  SignedAnswerRow,
  type SignedAnswerRowProps,
} from './SignedAnswerRow';
export {
  DecimalAnswerRow,
  type DecimalAnswerRowProps,
} from './DecimalAnswerRow';
export {
  RemainderAnswerRow,
  type RemainderAnswerRowProps,
} from './RemainderAnswerRow';
export {
  type AnswerInk,
  type InkPoint,
  type InkStroke,
  emptyAnswerInk,
  strokeToPath,
  useInkCapture,
} from './ink';
