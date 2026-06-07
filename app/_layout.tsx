import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ForceUpdateGate } from '../components/domain';
import {
  PracticeSessionProvider,
  PurchasesProvider,
  TipsProvider,
  useForceUpdate,
} from '../hooks';
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
  const { required, appStoreId } = useForceUpdate();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PurchasesProvider>
          <TipsProvider>
            <PracticeSessionProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </PracticeSessionProvider>
          </TipsProvider>
        </PurchasesProvider>
        {/* Sits above everything: when the installed version is below the
            remote minimum, nothing else is reachable until they update. */}
        {required ? <ForceUpdateGate appStoreId={appStoreId} /> : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
