/**
 * AdditionProblem — vertical addition: tap-to-write carry boxes above the
 * columns, the two operands stacked with the `+` operator, a rule, and the
 * sum answer area below.
 */
import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import type { ReviewMarks } from '../../../lib/review';
import type { Question } from '../../../types';
import { type InkStroke } from '../ink';
import {
  type ProblemSizing,
  operatorSymbol,
  verticalGeometry,
} from '../layout';
import { leadingCarrySkip } from '../workspace/multiOperand';
import { CarryRow, DigitCells, gridWidth, sharedStyles } from './shared';

export interface AdditionProblemProps {
  question: Question;
  /** The answer area (handwriting boxes) for the sum. */
  answerSlot: ReactNode;
  /** Per-column carry ink; presence enables the carry row. */
  carryInk?: InkStroke[][];
  /** Currently pad-focused box id (shared with the answer area). */
  selectedBox: string | null;
  /** Focus the writing pad on a carry box id. */
  onSelectBox?: (boxId: string) => void;
  /** Clear a carry box by id. */
  onClearBox?: (boxId: string) => void;
  /** Accent colour for selection. */
  tone: string;
  /** Column / box / digit sizing. */
  sizing: ProblemSizing;
  /** Review error-highlight marks keyed by box id. */
  errorMarks?: ReviewMarks | null;
}

/** Vertical addition layout. */
export function AdditionProblem({
  question,
  answerSlot,
  carryInk,
  selectedBox,
  onSelectBox,
  onClearBox,
  tone,
  sizing,
  errorMarks,
}: AdditionProblemProps) {
  const [op1, op2] = question.operands;
  const { intCols, decCols } = verticalGeometry(question);
  const columns = intCols + decCols;
  // Leading answer column(s) that only hold a final carry-out get no carry box —
  // the kid writes that digit straight into the answer (matches the auto-advance
  // suppression in `additionCarries`).
  const leadingSkip = leadingCarrySkip(op1, op2, intCols);
  const {
    cellWidth,
    digitSize,
    operatorWidth,
    carryWidth: carryW,
    carryHeight: carryH,
  } = sizing;
  const columnAreaWidth = gridWidth(intCols, decCols, cellWidth);
  const dotIndex = decCols > 0 ? intCols : undefined;

  return (
    <View>
      {carryInk && onSelectBox && onClearBox ? (
        <CarryRow
          columns={columns}
          carryInk={carryInk}
          selectedBox={selectedBox}
          onSelectBox={onSelectBox}
          onClearBox={onClearBox}
          tone={tone}
          cellWidth={cellWidth}
          operatorWidth={operatorWidth}
          boxWidth={carryW}
          boxHeight={carryH}
          dotIndex={dotIndex}
          clearAbove
          errorMarks={errorMarks}
          leadingSkip={leadingSkip}
        />
      ) : null}

      <View style={sharedStyles.problemRow}>
        <View style={[sharedStyles.operatorColumn, { width: operatorWidth }]} />
        <View style={[sharedStyles.columnArea, { width: columnAreaWidth }]}>
          <DigitCells
            value={op1}
            cellWidth={cellWidth}
            digitSize={digitSize}
            decCols={decCols}
          />
        </View>
      </View>
      <View style={sharedStyles.problemRow}>
        <View style={[sharedStyles.operatorColumn, { width: operatorWidth }]}>
          <Text style={[sharedStyles.operator, { fontSize: digitSize }]}>
            {operatorSymbol[question.operation]}
          </Text>
        </View>
        <View style={[sharedStyles.columnArea, { width: columnAreaWidth }]}>
          <DigitCells
            value={op2}
            cellWidth={cellWidth}
            digitSize={digitSize}
            decCols={decCols}
          />
        </View>
      </View>
      <View
        style={[
          sharedStyles.rule,
          { width: columnAreaWidth, marginLeft: operatorWidth },
        ]}
      />
      <View
        style={[
          sharedStyles.answerArea,
          { width: columnAreaWidth, marginLeft: operatorWidth },
        ]}
      >
        {answerSlot}
      </View>
    </View>
  );
}
