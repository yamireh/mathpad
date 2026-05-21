import { render, screen } from '@testing-library/react-native';

// Initialise i18n before the screen renders so translations resolve.
import '../lib/i18n';
import HomeScreen from '../app/index';

describe('Home screen', () => {
  it('renders the greeting', () => {
    render(<HomeScreen />);
    expect(
      screen.getByText('Hi! What shall we practice?'),
    ).toBeOnTheScreen();
  });

  it('renders all five topic cards', () => {
    render(<HomeScreen />);
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
    render(<HomeScreen />);
    expect(screen.getByText('History')).toBeOnTheScreen();
  });
});
