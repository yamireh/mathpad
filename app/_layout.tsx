import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Side-effect import: initialises i18next before any screen renders.
import '../lib/i18n';

/**
 * Root layout for the expo-router app.
 *
 * Wraps every route in a SafeAreaProvider and hosts the navigation Stack.
 * Feature screens are added under /app in later phases.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
