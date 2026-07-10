import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';
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

// MathPen's UI is English / number-based and not localized for RTL. Lock it to
// left-to-right so an Arabic/Hebrew device locale can't mirror the layout. The
// Android `supportsRtl="false"` config plugin is the hard native guard; this
// keeps React Native's own layout LTR (and covers iOS).
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

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
