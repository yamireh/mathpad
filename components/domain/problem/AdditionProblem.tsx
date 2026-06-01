/**
 * AdditionProblem — vertical addition: tap-to-write carry boxes above the
 * columns, the two operands stacked with the `+` operator, a rule, and the
 * sum answer area below.
 */
import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import type { Question } from '../../../types';
import { type InkStroke } from '../ink';
import {
  type ProblemSizing,
  answerShape,
  digitCount,
  operatorSymbol,
} from '../layout';
import { CarryRow, DigitCells, sharedStyles } from './shared';

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
}: AdditionProblemProps) {
  const [op1, op2] = question.operands;
  const shape = answerShape(question);
  const answerColumns = shape.integerBoxes + (shape.hasSign ? 1 : 0);
  const columns = Math.max(digitCount(op1), digitCount(op2), answerColumns);
  const {
    cellWidth,
    digitSize,
    operatorWidth,
    carryWidth: carryW,
    carryHeight: carryH,
  } = sizing;
  const columnAreaWidth = columns * cellWidth;

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
        />
      ) : null}

      <View style={sharedStyles.problemRow}>
        <View style={[sharedStyles.operatorColumn, { width: operatorWidth }]} />
        <View style={[sharedStyles.columnArea, { width: columnAreaWidth }]}>
          <DigitCells value={op1} cellWidth={cellWidth} digitSize={digitSize} />
        </View>
      </View>
      <View style={sharedStyles.problemRow}>
        <View style={[sharedStyles.operatorColumn, { width: operatorWidth }]}>
          <Text style={[sharedStyles.operator, { fontSize: digitSize }]}>
            {operatorSymbol[question.operation]}
          </Text>
        </View>
        <View style={[sharedStyles.columnArea, { width: columnAreaWidth }]}>
          <DigitCells value={op2} cellWidth={cellWidth} digitSize={digitSize} />
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
