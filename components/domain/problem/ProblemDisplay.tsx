import { type ReactNode } from 'react';

import { colors } from '../../../constants/design';
import type { ReviewMarks } from '../../../lib/review';
import type { ProblemLayout, Question } from '../../../types';
import { type InkStroke } from '../ink';
import {
  type LongDivisionStepMinuend,
  type ProblemSizing,
  DIVISION_DIGIT_SIZE,
  DIVISION_DRAFT_CELL_WIDTH,
  regularSizing,
} from '../layout';
import { AdditionProblem } from './AdditionProblem';
import { DivisionProblem } from './DivisionProblem';
import { MultiplicationProblem } from './MultiplicationProblem';
import { SubtractionProblem } from './SubtractionProblem';

export interface ProblemDisplayProps {
  question: Question;
  /** The answer area (handwriting boxes), positioned by the chosen layout. */
  answerSlot: ReactNode;
  /** Overrides the question's own layout (e.g. a user layout toggle). */
  layout?: ProblemLayout;
  /** Intermediate-work surface, placed inside the long-division bracket. */
  workSlot?: ReactNode;
  /** Tapped borrow-lender columns (top-operand digit indices). */
  borrowMarks?: number[];
  /** Toggle a borrow on a top-operand digit; presence enables tap-to-borrow. */
  onToggleBorrow?: (column: number) => void;
  /** Per-column carry ink (addition / multiplication); enables the carry row. */
  carryInk?: InkStroke[][];
  /**
   * Per-row, per-column partial-product ink (multiplication with multi-digit
   * multiplier only). Each entry is the strokes for one partial-product cell.
   */
  partialInk?: InkStroke[][][];
  /**
   * Times-step carry ink for the currently active partial — single row,
   * indexed by op1 column-from-left. Rendered above op1 for multi-digit ×.
   */
  timesCarryInk?: InkStroke[][];
  /** Which partial-row the visible times-carry slot binds to (× only). */
  currentPartialRow?: number;
  /**
   * Per quotient step, the divisor columns (from left) that get a carry box
   * (long division only). From `longDivisionDivisorCarries`.
   */
  divisionStepCarryCols?: number[][];
  /** Divisor-carry ink keyed `[step][col]` (long division only). */
  divisionCarryInk?: InkStroke[][][];
  /** Which quotient step the visible divisor-carry row binds to (÷ only). */
  currentDivisionStep?: number;
  /** The dividend chunk as the active step-0 subtraction minuend (borrow). */
  dividendMinuend?: LongDivisionStepMinuend | null;
  /** Lender indices already tapped on the current step's minuend. */
  divisionBorrowLenders?: number[];
  /** Toggle a borrow lender on the current step's minuend. */
  onDivisionBorrow?: (lenderIndex: number) => void;
  /** Currently pad-focused box id (shared with the answer area). */
  selectedBox?: string | null;
  /** Focus the writing pad on a box id (carry boxes). */
  onSelectBox?: (boxId: string) => void;
  /** Clear a box by id (carry boxes). */
  onClearBox?: (boxId: string) => void;
  /** Accent colour for borrow marks and selection. */
  tone?: string;
  /** Column / box / digit sizing. Defaults to the full grid. */
  sizing?: ProblemSizing;
  /**
   * Per-question override for the long-division grid's column width.
   * Defaults to {@link DIVISION_DRAFT_CELL_WIDTH}. Set this when the
   * staircase needs to shrink to keep the dividend on screen without
   * horizontal scrolling.
   */
  divisionCellWidth?: number;
  /** Paired digit font size for the long-division dividend. */
  divisionDigitSize?: number;
  /** Review error-highlight marks keyed by box id (carry / partial / dcarry). */
  errorMarks?: ReviewMarks | null;
}

/** Renders a math problem and places its answer area, per question layout. */
export function ProblemDisplay({
  question,
  answerSlot,
  layout,
  workSlot,
  borrowMarks,
  onToggleBorrow,
  carryInk,
  partialInk,
  timesCarryInk,
  currentPartialRow = 0,
  divisionStepCarryCols,
  divisionCarryInk,
  currentDivisionStep = 0,
  dividendMinuend,
  divisionBorrowLenders,
  onDivisionBorrow,
  selectedBox,
  onSelectBox,
  onClearBox,
  tone = colors.text,
  sizing,
  divisionCellWidth,
  divisionDigitSize,
  errorMarks,
}: ProblemDisplayProps) {
  const resolvedSizing = sizing ?? regularSizing();
  const effective = layout ?? question.layout;

  if (effective === 'vertical') {
    switch (question.operation) {
      case 'addition':
        return (
          <AdditionProblem
            question={question}
            answerSlot={answerSlot}
            carryInk={carryInk}
            selectedBox={selectedBox ?? null}
            onSelectBox={onSelectBox}
            onClearBox={onClearBox}
            tone={tone}
            sizing={resolvedSizing}
            errorMarks={errorMarks}
          />
        );
      case 'subtraction':
        return (
          <SubtractionProblem
            question={question}
            answerSlot={answerSlot}
            borrowMarks={borrowMarks ?? []}
            onToggleBorrow={onToggleBorrow}
            tone={tone}
            sizing={resolvedSizing}
          />
        );
      case 'multiplication':
        return (
          <MultiplicationProblem
            question={question}
            answerSlot={answerSlot}
            carryInk={carryInk}
            partialInk={partialInk}
            timesCarryInk={timesCarryInk}
            currentPartialRow={currentPartialRow}
            selectedBox={selectedBox ?? null}
            onSelectBox={onSelectBox}
            onClearBox={onClearBox}
            tone={tone}
            sizing={resolvedSizing}
            errorMarks={errorMarks}
          />
        );
      case 'division':
        // Division never uses the vertical layout.
        return null;
    }
  }

  return (
    <DivisionProblem
      question={question}
      answerSlot={answerSlot}
      layout={effective}
      workSlot={workSlot}
      cellWidth={divisionCellWidth ?? DIVISION_DRAFT_CELL_WIDTH}
      digitSize={divisionDigitSize ?? DIVISION_DIGIT_SIZE}
      selectedBox={selectedBox ?? null}
      divisionStepCarryCols={divisionStepCarryCols}
      divisionCarryInk={divisionCarryInk}
      currentDivisionStep={currentDivisionStep}
      dividendMinuend={dividendMinuend}
      divisionBorrowLenders={divisionBorrowLenders}
      onDivisionBorrow={onDivisionBorrow}
      onSelectBox={onSelectBox}
      onClearBox={onClearBox}
      tone={tone}
      errorMarks={errorMarks}
    />
  );
}
