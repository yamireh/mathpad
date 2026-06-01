import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react-native';
import { type ReactNode } from 'react';

import {
  PracticeSessionProvider,
  useSettings,
  useTimer,
  usePracticeSession,
} from '../hooks';
import { historyStore } from '../lib/storage';
import type { AdditionSettings, Question, SubmittedAnswer } from '../types';

beforeEach(async () => {
  await AsyncStorage.clear();
});

/** A SubmittedAnswer that correctly answers an integer question. */
function correctAnswer(question: Question): SubmittedAnswer {
  const answer = question.answer;
  const value = answer.kind === 'integer' ? answer.value : 0;
  return {
    sign: value < 0 ? 'minus' : null,
    integerDigits: String(Math.abs(value)).split('').map(Number),
    decimalDigits: [],
    remainderDigits: [],
  };
}

/** A fully blank submission. */
const blankAnswer: SubmittedAnswer = {
  sign: null,
  integerDigits: [null],
  decimalDigits: [],
  remainderDigits: [],
};

describe('usePracticeSession', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PracticeSessionProvider>{children}</PracticeSessionProvider>
  );

  const settings: AdditionSettings = {
    operation: 'addition',
    digitCounts: [1],
    questionCount: 5,
    timer: { enabled: false, durationMinutes: 5 },
    carrying: 'random',
    decimals: 'off',
  };

  it('starts, finishes wrong, then fixes a question on review', async () => {
    const { result } = renderHook(() => usePracticeSession(), { wrapper });

    act(() => result.current.start(settings));
    expect(result.current.session?.questions).toHaveLength(5);

    // Finish with every answer blank → all wrong.
    await act(async () => {
      await result.current.finish(async () => blankAnswer);
    });
    expect(
      result.current.session?.results?.every((r) => r.status === 'wrong'),
    ).toBe(true);

    // Fix the first question on review.
    const first = result.current.session!.questions[0];
    await act(async () => {
      await result.current.reviewSubmit(first.id, async () =>
        correctAnswer(first),
      );
    });
    const fixed = result.current.session!.results!.find(
      (r) => r.question.id === first.id,
    );
    expect(fixed?.status).toBe('fixed');

    // The session was persisted to history with the updated final score.
    const history = await historyStore.list();
    expect(history).toHaveLength(1);
    expect(history[0].firstTryScore).toBe(0);
    expect(history[0].finalScore).toBe(1);
  });

  it('reset clears the session', async () => {
    const { result } = renderHook(() => usePracticeSession(), { wrapper });
    act(() => result.current.start(settings));
    act(() => result.current.reset());
    expect(result.current.session).toBeNull();
  });
});

describe('useTimer', () => {
  it('counts down and fires onExpire exactly once', async () => {
    jest.useFakeTimers();
    const onExpire = jest.fn();
    const { result } = renderHook(() => useTimer(3, onExpire));

    expect(result.current.secondsRemaining).toBe(3);
    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });
    expect(result.current.secondsRemaining).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});

describe('useSettings', () => {
  it('loads defaults and persists updates', async () => {
    const { result } = renderHook(() => useSettings('division'));
    await waitFor(() => expect(result.current.settings).not.toBeNull());
    expect(result.current.settings?.operation).toBe('division');

    act(() => {
      result.current.update({
        ...result.current.settings!,
        questionCount: 20,
      });
    });
    expect(result.current.settings?.questionCount).toBe(20);
  });
});
