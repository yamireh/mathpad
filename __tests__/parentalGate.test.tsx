import { fireEvent, render, screen } from '@testing-library/react-native';

import '../lib/i18n';
import { ParentalGate } from '../components/ui';

/**
 * The gate picks its digits with Math.random. Pinning it to 0.42 makes every
 * digit `Math.floor(0.42 * 10) === 4`, so the challenge is always "four four
 * four four" and the correct key to press is "4".
 */
const CORRECT_KEY = '4';
const WRONG_KEY = '5';

beforeEach(() => {
  jest.spyOn(Math, 'random').mockReturnValue(0.42);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function pressKey(key: string, times: number) {
  for (let i = 0; i < times; i += 1) {
    fireEvent.press(screen.getByText(key));
  }
}

describe('ParentalGate', () => {
  it('shows the challenge when visible', () => {
    render(
      <ParentalGate visible onSuccess={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.getByText('Ask a grown-up')).toBeOnTheScreen();
    // The digits are spelled out as words, never as figures.
    expect(screen.getByText(/four/)).toBeOnTheScreen();
  });

  it('calls onSuccess once when the full correct sequence is entered', () => {
    const onSuccess = jest.fn();
    render(
      <ParentalGate visible onSuccess={onSuccess} onCancel={jest.fn()} />,
    );
    pressKey(CORRECT_KEY, 4);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not call onSuccess until the sequence is complete', () => {
    const onSuccess = jest.fn();
    render(
      <ParentalGate visible onSuccess={onSuccess} onCancel={jest.fn()} />,
    );
    pressKey(CORRECT_KEY, 3);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('rejects a wrong sequence and stays open (no bypass)', () => {
    const onSuccess = jest.fn();
    const onCancel = jest.fn();
    render(
      <ParentalGate visible onSuccess={onSuccess} onCancel={onCancel} />,
    );
    // Three right, one wrong — checked on the fourth key.
    pressKey(CORRECT_KEY, 3);
    fireEvent.press(screen.getByText(WRONG_KEY));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    // Gate is still on screen for another attempt.
    expect(screen.getByText('Ask a grown-up')).toBeOnTheScreen();
  });

  it('fires onCancel when dismissed', () => {
    const onCancel = jest.fn();
    render(
      <ParentalGate visible onSuccess={jest.fn()} onCancel={onCancel} />,
    );
    fireEvent.press(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
