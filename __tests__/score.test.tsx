import { render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';

import '../lib/i18n';
import ReviewScreen from '../app/review/[index]';
import ScoreScreen from '../app/score';
import { PracticeSessionProvider, usePracticeSession } from '../hooks';
import type { AdditionSettings, SubmittedAnswer } from '../types';

const settings: AdditionSettings = {
  operation: 'addition',
  digitRange: { min: 1, max: 1 },
  questionCount: 5,
  timer: { enabled: false, durationMinutes: 5 },
  carrying: 'random',
};

const blank: SubmittedAnswer = {
  sign: null,
  integerDigits: [null],
  decimalDigits: [],
  remainderDigits: [],
};

/** Starts and finishes a session (all answers blank), then renders `screen`. */
function FinishedSession({ children }: { children: React.ReactNode }) {
  const { session, start, finish } = usePracticeSession();
  useEffect(() => {
    if (!session) start(settings);
  }, [session, start]);
  useEffect(() => {
    if (session && !session.results) void finish(async () => blank);
  }, [session, finish]);
  return session?.results ? <>{children}</> : null;
}

describe('Score screen', () => {
  it('shows both scores, encouragement and the question list', async () => {
    render(
      <PracticeSessionProvider>
        <FinishedSession>
          <ScoreScreen />
        </FinishedSession>
      </PracticeSessionProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('First try')).toBeOnTheScreen(),
    );
    expect(screen.getByText('Final')).toBeOnTheScreen();
    // All five answers were blank → effort tier.
    expect(
      screen.getByText("Good effort — let's try again!"),
    ).toBeOnTheScreen();
    expect(screen.getByText('Your answers')).toBeOnTheScreen();
    expect(screen.getByText('Again')).toBeOnTheScreen();
  });
});

describe('Review screen', () => {
  it('reopens a question with its problem', async () => {
    globalThis.__expoRouterParams = { index: '0' };
    render(
      <PracticeSessionProvider>
        <FinishedSession>
          <ReviewScreen />
        </FinishedSession>
      </PracticeSessionProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('Submit')).toBeOnTheScreen(),
    );
    expect(screen.getByText('+')).toBeOnTheScreen();
  });
});
