import { Stack } from 'expo-router';
import { I18nManager, Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ForceUpdateGate, RolePickerGate } from '../components/domain';
import {
  DeviceRoleProvider,
  FamilyLinkProvider,
  PracticeSessionProvider,
  PurchasesProvider,
  TipsProvider,
  useDeviceRole,
  useForceUpdate,
  useSyncFlush,
} from '../hooks';
// Side-effect import: initialises i18next before any screen renders.
import '../lib/i18n';

// MathPen's UI is English / number-based and not localized for RTL. Lock it to
// left-to-right so an Arabic/Hebrew device locale can't mirror the layout. The
// Android `supportsRtl="false"` config plugin is the hard native guard; this
// keeps React Native's own layout LTR (and covers iOS).
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// Respect the device's font-size setting (accessibility) but CAP how far text
// can grow, so a very large system font can't blow the layout apart. The math
// grid opts out entirely (allowFontScaling={false}) because its digits must stay
// pixel-aligned in fixed-width columns — a preference there would break the
// arithmetic layout, not just reflow text.
//
// React 19 ignores `defaultProps` on `forwardRef` components (which Text and
// TextInput now are), so wrap their render to inject the cap as a default. An
// explicit prop on a given <Text> still wins.
const MAX_FONT_SCALE = 1.2;
type Renderable = {
  render?: (props: Record<string, unknown>, ref: unknown) => unknown;
};
for (const Component of [Text, TextInput] as unknown as Renderable[]) {
  const original = Component.render;
  if (typeof original === 'function') {
    Component.render = function patchedRender(props, ref) {
      return original.call(
        this,
        { maxFontSizeMultiplier: MAX_FONT_SCALE, ...props },
        ref,
      );
    };
  }
}

/**
 * Root layout.
 *
 * Wraps every route in the safe-area provider and the practice-session
 * provider (so the session survives Practice → Score → Review navigation),
 * and hosts the navigation Stack.
 */
/**
 * First-run overlay: once the persisted role has loaded and is still unset, ask
 * whose device this is. Sits above the Stack until answered.
 */
function RoleGate() {
  const { hydrated, role } = useDeviceRole();
  return hydrated && role === 'unset' ? <RolePickerGate /> : null;
}

export default function RootLayout() {
  const { required, appStoreId } = useForceUpdate();
  // Drain the offline session-sync queue on launch and app-foreground.
  useSyncFlush();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DeviceRoleProvider>
          <FamilyLinkProvider>
            <PurchasesProvider>
              <TipsProvider>
                <PracticeSessionProvider>
                  <Stack screenOptions={{ headerShown: false }} />
                </PracticeSessionProvider>
              </TipsProvider>
            </PurchasesProvider>
          </FamilyLinkProvider>
          {/* Sits above everything: when the installed version is below the
              remote minimum, nothing else is reachable until they update. */}
          {required ? <ForceUpdateGate appStoreId={appStoreId} /> : null}
          <RoleGate />
        </DeviceRoleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
