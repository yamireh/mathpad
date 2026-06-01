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
  digitCounts: [1],
  questionCount: 5,
  timer: { enabled: false, durationMinutes: 5 },
  carrying: 'random',
  decimals: 'off',
};

const divisionSettings: DivisionSettings = {
  operation: 'division',
  digitCounts: [2],
  questionCount: 5,
  timer: { enabled: false, durationMinutes: 5 },
  answerType: 'noRemainder',
  divisionType: 'long',
  dividendDigits: 2,
  divisorDigits: 1,
};

const carryAdditionSettings: AdditionSettings = {
  operation: 'addition',
  digitCounts: [2],
  questionCount: 5,
  timer: { enabled: false, durationMinutes: 5 },
  carrying: 'with',
  decimals: 'off',
};

const subtractionSettings: SubtractionSettings = {
  operation: 'subtraction',
  digitCounts: [2],
  questionCount: 5,
  timer: { enabled: false, durationMinutes: 5 },
  borrowing: 'with',
  allowNegative: 'off',
  decimals: 'off',
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

  it('opens the answer pad, with the chevron-down handle collapsing it', async () => {
    renderPractice(additionSettings);
    // The pad is focused on the first answer box on entry.
    await waitFor(() =>
      expect(screen.getByLabelText('Close writing pad')).toBeOnTheScreen(),
    );
    // The close handle collapses the pad and reveals just the expand handle.
    fireEvent.press(screen.getByLabelText('Close writing pad'));
    expect(screen.getByLabelText('Open writing pad')).toBeOnTheScreen();
    // Tapping the expand handle restores the pad.
    fireEvent.press(screen.getByLabelText('Open writing pad'));
    expect(screen.getByLabelText('Close writing pad')).toBeOnTheScreen();
  });

  it('renders division in the layout chosen in settings (no mid-solution toggle)', async () => {
    // The layout is picked up front via the "Division type" setting; the old
    // in-practice long ⇄ in-a-row toggle is gone.
    renderPractice(divisionSettings);
    await waitFor(() =>
      expect(screen.getByText('Question 1 of 5')).toBeOnTheScreen(),
    );
    expect(screen.queryByText('Long division')).toBeNull();
    expect(screen.queryByText('In a row')).toBeNull();
  });

  it('shows tap-to-write carry boxes for addition', async () => {
    renderPractice(carryAdditionSettings);
    await waitFor(() =>
      expect(screen.getByText('Question 1 of 5')).toBeOnTheScreen(),
    );
    const carryBoxes = screen.getAllByLabelText(/^Carry box/);
    expect(carryBoxes.length).toBeGreaterThan(0);
    // Tapping a carry box focuses the writing pad without error.
    fireEvent.press(carryBoxes[0]);
    expect(screen.getByLabelText('Close writing pad')).toBeOnTheScreen();
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
