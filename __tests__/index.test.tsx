import { render, screen } from '@testing-library/react-native';

// Initialise i18n before the screen renders so translations resolve.
import '../lib/i18n';
import HomeScreen from '../app/index';
import OperationsRoute from '../app/operations';

describe('Home screen (MainPanel)', () => {
  it('renders the greeting', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Hi, ready for math?')).toBeOnTheScreen();
    expect(
      screen.getByText('Choose your practice adventure'),
    ).toBeOnTheScreen();
  });

  it('lists every top-level topic card', () => {
    render(<HomeScreen />);
    for (const label of ['Operations', 'Shapes', 'Clock', 'Coordinates']) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
  });

  it('flags disabled topics as coming soon', () => {
    render(<HomeScreen />);
    // Three topics are disabled today; the same pill repeats for each.
    expect(screen.getAllByText('Coming soon')).toHaveLength(3);
  });
});

describe('Operations route', () => {
  it('renders the five operation cards', () => {
    render(<OperationsRoute />);
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
    render(<OperationsRoute />);
    expect(screen.getByText('History')).toBeOnTheScreen();
  });
});
