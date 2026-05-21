import { act, render, renderHook, screen } from '@testing-library/react-native';

import '../lib/i18n';
import {
  AnswerBox,
  SignedAnswerRow,
  emptyAnswerInk,
  useInkCapture,
} from '../components/domain';
import { answerShape } from '../components/domain/layout';
import type { Question } from '../types';

describe('useInkCapture', () => {
  it('captures a stroke from begin → extend → end', () => {
    const onCommit = jest.fn();
    const { result } = renderHook(() => useInkCapture([], onCommit));

    act(() => result.current.beginStroke(1, 1));
    act(() => result.current.extendStroke(5, 6));
    act(() => result.current.endStroke());

    expect(result.current.strokes).toHaveLength(1);
    expect(result.current.strokes[0]).toHaveLength(2);
    expect(onCommit).toHaveBeenCalled();
  });

  it('undo removes the last stroke', () => {
    const { result } = renderHook(() => useInkCapture());
    act(() => {
      result.current.beginStroke(0, 0);
      result.current.endStroke();
    });
    expect(result.current.strokes).toHaveLength(1);
    act(() => result.current.undo());
    expect(result.current.strokes).toHaveLength(0);
  });

  it('clear empties the surface', () => {
    const { result } = renderHook(() => useInkCapture());
    act(() => {
      result.current.beginStroke(2, 2);
      result.current.endStroke();
    });
    act(() => result.current.clear());
    expect(result.current.isEmpty).toBe(true);
  });

  it('eraseNear removes strokes within radius', () => {
    const { result } = renderHook(() => useInkCapture());
    act(() => {
      result.current.beginStroke(10, 10);
      result.current.extendStroke(12, 12);
      result.current.endStroke();
    });
    act(() => result.current.eraseNear(11, 11, 20));
    expect(result.current.strokes).toHaveLength(0);
  });
});

describe('emptyAnswerInk', () => {
  it('matches the box counts of a decimal answer shape', () => {
    const q: Question = {
      id: 'q',
      operation: 'division',
      operands: [15, 4],
      answer: { kind: 'decimal', value: 3.75, decimalPlaces: 2 },
      layout: 'divisionDecimal',
    };
    const ink = emptyAnswerInk(answerShape(q));
    expect(ink.integer).toHaveLength(1);
    expect(ink.decimal).toHaveLength(3);
    expect(ink.remainder).toHaveLength(0);
  });
});

describe('ink components render', () => {
  it('renders an AnswerBox', () => {
    render(
      <AnswerBox
        strokes={[]}
        selected={false}
        onSelect={jest.fn()}
        onClear={jest.fn()}
        accessibilityLabel="Answer digit 1"
      />,
    );
    expect(screen.getByLabelText('Answer digit 1')).toBeOnTheScreen();
  });

  it('renders a SignedAnswerRow with a sign box', () => {
    const q: Question = {
      id: 'q',
      operation: 'subtraction',
      operands: [5, 8],
      answer: { kind: 'integer', value: -3 },
      layout: 'vertical',
    };
    const shape = answerShape(q);
    render(
      <SignedAnswerRow
        shape={shape}
        ink={emptyAnswerInk(shape)}
        onChange={jest.fn()}
        selectedBox={null}
        onSelectBox={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Negative sign box')).toBeOnTheScreen();
  });
});
