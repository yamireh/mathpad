import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';

import '../lib/i18n';
import PracticeScreen from '../app/practice';
import { PracticeSessionProvider, usePracticeSession } from '../hooks';
import type {
  AdditionSettings,
  DivisionSettings,
  Settings,
  SubtractionSettings,
} from '../types';

const additionSettings: AdditionSettings = {
  operation: 'addition',
  digitRange: { min: 1, max: 1 },
  questionCount: 5,
  timer: { enabled: false, durationMinutes: 5 },
  carrying: 'random',
};

const divisionSettings: DivisionSettings = {
  operation: 'division',
  digitRange: { min: 2, max: 2 },
  questionCount: 5,
  timer: { enabled: false, durationMinutes: 5 },
  answerType: 'noRemainder',
};

const subtractionSettings: SubtractionSettings = {
  operation: 'subtraction',
  digitRange: { min: 2, max: 2 },
  questionCount: 5,
  timer: { enabled: false, durationMinutes: 5 },
  borrowing: 'with',
  allowNegative: 'off',
};

/** Starts a session, then renders the Practice screen. */
function PracticeUnderTest({ settings }: { settings: Settings }) {
  const { session, start } = usePracticeSession();
  useEffect(() => {
    if (!session) start(settings);
  }, [session, start]);
  return session ? <PracticeScreen /> : null;
}

const renderPractice = (settings: Settings) =>
  render(
    <PracticeSessionProvider>
      <PracticeUnderTest settings={settings} />
    </PracticeSessionProvider>,
  );

describe('Practice screen', () => {
  it('shows progress, the problem and the Next action', async () => {
    renderPractice(additionSettings);
    await waitFor(() =>
      expect(screen.getByText('Question 1 of 5')).toBeOnTheScreen(),
    );
    expect(screen.getByText('+')).toBeOnTheScreen();
    expect(screen.getByText('Next')).toBeOnTheScreen();
  });

  it('opens the answer pad, with Done returning to the scratch area', async () => {
    renderPractice(additionSettings);
    // The pad is focused on the first answer box on entry.
    await waitFor(() =>
      expect(screen.getByText('Write the digit here')).toBeOnTheScreen(),
    );
    // Done switches back to the scratch area and its tools.
    fireEvent.press(screen.getByText('Done'));
    expect(
      screen.getByText('Scratch area — your working out'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Eraser')).toBeOnTheScreen();
  });

  it('offers a long ⇄ in-a-row layout toggle for division', async () => {
    renderPractice(divisionSettings);
    await waitFor(() =>
      expect(screen.getByText('Long division')).toBeOnTheScreen(),
    );
    expect(screen.getByText('In a row')).toBeOnTheScreen();
    // Switching to the long-division layout renders without error.
    fireEvent.press(screen.getByText('Long division'));
    expect(screen.getByText('Long division')).toBeOnTheScreen();
  });

  it('lets you tap a top digit to borrow on a subtraction', async () => {
    renderPractice(subtractionSettings);
    await waitFor(() =>
      expect(screen.getByText('Question 1 of 5')).toBeOnTheScreen(),
    );
    const borrowTargets = screen.getAllByLabelText(/^Borrow from/);
    expect(borrowTargets.length).toBeGreaterThan(0);
    // Tapping a borrow target re-renders without error.
    fireEvent.press(borrowTargets[0]);
    expect(screen.getByText('Question 1 of 5')).toBeOnTheScreen();
  });
});
