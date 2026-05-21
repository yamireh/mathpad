import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
} from '../components/ui';

describe('Button', () => {
  it('renders its label and fires onPress', () => {
    const onPress = jest.fn();
    render(<Button label="Start" onPress={onPress} />);
    fireEvent.press(screen.getByText('Start'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Start" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Start'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Chip', () => {
  it('reflects its selected state for accessibility', () => {
    render(<Chip label="10" selected onPress={jest.fn()} />);
    expect(screen.getByRole('radio', { selected: true })).toBeOnTheScreen();
  });
});

describe('ConfirmDialog', () => {
  it('shows content and wires both actions when visible', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <ConfirmDialog
        visible
        title="Clear all history?"
        message="This cannot be undone."
        confirmLabel="Clear all"
        cancelLabel="Cancel"
        destructive
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByText('Clear all history?')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Clear all'));
    fireEvent.press(screen.getByText('Cancel'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('renders title and hint', () => {
    render(<EmptyState title="No sessions yet" hint="Finish a session." />);
    expect(screen.getByText('No sessions yet')).toBeOnTheScreen();
    expect(screen.getByText('Finish a session.')).toBeOnTheScreen();
  });
});
