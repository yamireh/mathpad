import { render, screen } from '@testing-library/react-native';

// Initialise i18n before the screen renders so translations resolve.
import '../lib/i18n';
import HelloScreen from '../app/index';

describe('Hello screen', () => {
  it('renders the greeting', () => {
    render(<HelloScreen />);
    expect(screen.getByText('Hello')).toBeOnTheScreen();
  });

  it('renders the app name and tagline from the translation catalogue', () => {
    render(<HelloScreen />);
    expect(screen.getByText('MathPad')).toBeOnTheScreen();
    expect(screen.getByText('Practice math by hand')).toBeOnTheScreen();
  });
});
