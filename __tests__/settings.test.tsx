import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import '../lib/i18n';
import SettingsScreen from '../app/settings/[operation]';
import { PracticeSessionProvider } from '../hooks';

const wrap = (ui: ReactNode) => (
  <PracticeSessionProvider>{ui}</PracticeSessionProvider>
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Settings screen', () => {
  it('shows subtraction-specific options', async () => {
    globalThis.__expoRouterParams = { operation: 'subtraction' };
    render(wrap(<SettingsScreen />));
    await waitFor(() =>
      expect(screen.getByText('Borrowing')).toBeOnTheScreen(),
    );
    expect(screen.getByText('Allow negative answers')).toBeOnTheScreen();
    expect(screen.getByText('Start Practice')).toBeOnTheScreen();
  });

  it('shows division answer-type options', async () => {
    globalThis.__expoRouterParams = { operation: 'division' };
    render(wrap(<SettingsScreen />));
    await waitFor(() =>
      expect(screen.getByText('Answer type')).toBeOnTheScreen(),
    );
    expect(screen.getByText('With decimals')).toBeOnTheScreen();
  });

  it('shows common settings for every operation', async () => {
    globalThis.__expoRouterParams = { operation: 'mix' };
    render(wrap(<SettingsScreen />));
    await waitFor(() =>
      expect(screen.getByText('Number of questions')).toBeOnTheScreen(),
    );
    expect(screen.getByText('Number of digits')).toBeOnTheScreen();
    expect(screen.getByText('Timer')).toBeOnTheScreen();
  });
});
