import { render, screen } from '@testing-library/react-native';
import { type ReactNode } from 'react';

// Initialise i18n before the screen renders so translations resolve.
import '../lib/i18n';
import HomeScreen from '../app/index';
import OperationsRoute from '../app/operations';
import { PurchasesProvider } from '../hooks';

/** Operations route reads purchase state, so it needs the provider. */
const withPurchases = (ui: ReactNode) => (
  <PurchasesProvider>{ui}</PurchasesProvider>
);

describe('Home screen (MainPanel)', () => {
  it('renders the greeting', () => {
    render(withPurchases(<HomeScreen />));
    expect(screen.getByText('Hi, ready for math?')).toBeOnTheScreen();
    expect(
      screen.getByText('Choose your practice adventure'),
    ).toBeOnTheScreen();
  });

  it('lists every top-level topic card', () => {
    render(withPurchases(<HomeScreen />));
    for (const label of ['Operations', 'Shapes', 'Clock', 'Coordinates']) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
  });

  it('flags disabled topics as coming soon', () => {
    render(withPurchases(<HomeScreen />));
    // Clock is enabled in dev (CLOCK_ENABLED = __DEV__); Shapes, Coordinates,
    // Patterns and Money remain disabled, so the pill repeats four times.
    expect(screen.getAllByText('Coming soon')).toHaveLength(4);
  });
});

describe('Operations route', () => {
  it('renders the five operation cards', () => {
    render(withPurchases(<OperationsRoute />));
    for (const label of [
      'Addition',
      'Subtraction',
      'Multiplication',
      'Division',
      'Mix',
    ]) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
  });

  it('shows the History shortcut', () => {
    render(withPurchases(<OperationsRoute />));
    expect(screen.getByText('History')).toBeOnTheScreen();
  });
});
