import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import '../lib/i18n';
import {
  DigitRangeSelector,
  OperationCard,
  ProblemDisplay,
  QuestionResultRow,
  TimerDisplay,
  formatAnswer,
  formatProblem,
  formatSubmittedAnswer,
  isBlankSubmission,
} from '../components/domain';
import type { Question, QuestionResult } from '../types';

describe('format helpers', () => {
  it('formatProblem', () => {
    const q: Question = {
      id: 'q',
      operation: 'addition',
      operands: [24, 18],
      answer: { kind: 'integer', value: 42 },
      layout: 'vertical',
    };
    expect(formatProblem(q)).toBe('24 + 18');
  });

  it('formatAnswer covers every answer kind', () => {
    expect(formatAnswer({ kind: 'integer', value: 42 })).toBe('42');
    expect(formatAnswer({ kind: 'integer', value: -3 })).toBe('−3');
    expect(formatAnswer({ kind: 'remainder', quotient: 3, remainder: 1 })).toBe(
      '3 R 1',
    );
    expect(
      formatAnswer({ kind: 'decimal', value: 3.75, decimalPlaces: 2 }),
    ).toBe('3.75');
  });

  it('formatSubmittedAnswer and isBlankSubmission', () => {
    const q: Question = {
      id: 'q',
      operation: 'subtraction',
      operands: [5, 8],
      answer: { kind: 'integer', value: -3 },
      layout: 'vertical',
    };
    expect(
      formatSubmittedAnswer(q, {
        sign: 'minus',
        integerDigits: [3],
        decimalDigits: [],
        remainderDigits: [],
      }),
    ).toBe('−3');
    expect(isBlankSubmission(null)).toBe(true);
    expect(
      isBlankSubmission({
        sign: null,
        integerDigits: [null],
        decimalDigits: [],
        remainderDigits: [],
      }),
    ).toBe(true);
  });
});

describe('ProblemDisplay', () => {
  it('renders a vertical problem with its answer slot', () => {
    const q: Question = {
      id: 'q',
      operation: 'addition',
      operands: [24, 18],
      answer: { kind: 'integer', value: 42 },
      layout: 'vertical',
    };
    render(<ProblemDisplay question={q} answerSlot={<Text>SLOT</Text>} />);
    expect(screen.getByText('SLOT')).toBeOnTheScreen();
    expect(screen.getByText('+')).toBeOnTheScreen();
  });

  it('renders a horizontal division problem', () => {
    const q: Question = {
      id: 'q',
      operation: 'division',
      operands: [8, 2],
      answer: { kind: 'integer', value: 4 },
      layout: 'divisionHorizontal',
    };
    render(<ProblemDisplay question={q} answerSlot={<Text>SLOT</Text>} />);
    expect(screen.getByText('8')).toBeOnTheScreen();
    expect(screen.getByText('÷')).toBeOnTheScreen();
  });
});

describe('OperationCard', () => {
  it('renders the label and fires onPress', () => {
    const onPress = jest.fn();
    render(
      <OperationCard
        operation="addition"
        label="Addition"
        description="Practice adding numbers"
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByText('Addition'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('DigitRangeSelector', () => {
  it('keeps min and max consistent', () => {
    const onChange = jest.fn();
    render(
      <DigitRangeSelector
        value={{ min: 2, max: 3 }}
        onChange={onChange}
        fromLabel="From"
        toLabel="To"
      />,
    );
    // Picking a min above the current max drags max up too.
    fireEvent.press(screen.getAllByText('4')[0]);
    expect(onChange).toHaveBeenCalledWith({ min: 4, max: 4 });
  });
});

describe('QuestionResultRow', () => {
  const base: QuestionResult = {
    question: {
      id: 'q',
      operation: 'addition',
      operands: [2, 3],
      answer: { kind: 'integer', value: 5 },
      layout: 'vertical',
    },
    submittedAnswer: null,
    status: 'wrong',
  };

  it('shows the correct answer for a wrong question', () => {
    render(<QuestionResultRow result={base} number={1} />);
    expect(screen.getByText('5')).toBeOnTheScreen();
  });

  it('shows a fixed badge for a fixed question', () => {
    render(
      <QuestionResultRow result={{ ...base, status: 'fixed' }} number={2} />,
    );
    expect(screen.getByText('Fixed')).toBeOnTheScreen();
  });
});

describe('TimerDisplay', () => {
  it('formats the remaining time as M:SS', () => {
    render(<TimerDisplay secondsRemaining={125} />);
    expect(screen.getByText('2:05')).toBeOnTheScreen();
  });
});
