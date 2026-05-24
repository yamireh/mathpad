import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PracticeSessionProvider, TipsProvider } from '../hooks';
// Side-effect import: initialises i18next before any screen renders.
import '../lib/i18n';

/**
 * Root layout.
 *
 * Wraps every route in the safe-area provider and the practice-session
 * provider (so the session survives Practice → Score → Review navigation),
 * and hosts the navigation Stack.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TipsProvider>
        <PracticeSessionProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </PracticeSessionProvider>
      </TipsProvider>
    </SafeAreaProvider>
  );
}
