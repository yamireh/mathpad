import { render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';

import '../lib/i18n';
import PracticeScreen from '../app/practice';
import { PracticeSessionProvider, usePracticeSession } from '../hooks';
import type { AdditionSettings } from '../types';

const settings: AdditionSettings = {
  operation: 'addition',
  digitRange: { min: 1, max: 1 },
  questionCount: 5,
  timer: { enabled: false, durationMinutes: 5 },
  carrying: 'random',
};

/** Starts a session, then renders the Practice screen. */
function PracticeUnderTest() {
  const { session, start } = usePracticeSession();
  useEffect(() => {
    if (!session) start(settings);
  }, [session, start]);
  return session ? <PracticeScreen /> : null;
}

describe('Practice screen', () => {
  it('shows progress, the problem and the Next action', async () => {
    render(
      <PracticeSessionProvider>
        <PracticeUnderTest />
      </PracticeSessionProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('Question 1 of 5')).toBeOnTheScreen(),
    );
    expect(screen.getByText('+')).toBeOnTheScreen();
    expect(screen.getByText('Next')).toBeOnTheScreen();
  });

  it('offers the scratch area and its tools', async () => {
    render(
      <PracticeSessionProvider>
        <PracticeUnderTest />
      </PracticeSessionProvider>,
    );
    await waitFor(() =>
      expect(
        screen.getByText('Scratch area — your working out'),
      ).toBeOnTheScreen(),
    );
    expect(screen.getByText('Eraser')).toBeOnTheScreen();
  });
});
