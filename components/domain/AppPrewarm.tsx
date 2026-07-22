import { Canvas } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { operationColors } from '../../constants/design';
import { usePurchases } from '../../hooks';
import { prepareModel } from '../../lib/recognition';

/**
 * Best-effort cap on warming the handwriting model (a first-launch network
 * download). If it isn't ready in time we proceed anyway — recognition still
 * warms lazily later, no worse than before.
 */
const MODEL_WARM_CAP_MS = 3000;

/**
 * Absolute ceiling on how long the launch overlay can stay up, so a hung task
 * (offline store, model download) can never trap the user on the splash.
 */
const HARD_CAP_MS = 6000;

/**
 * Force the heavy route modules to evaluate now (Metro defers each module's
 * factory until first require, which is what makes the first navigation into
 * Clock / an operation janky). Importing their graphs here pays that cost while
 * the launch overlay is up. Failures are ignored — this is pure prewarming.
 */
function warmModules(): Promise<unknown> {
  return Promise.allSettled([
    import('./clock'),
    import('../panels/OperationsPanel/workspace'),
  ]);
}

/** Resolve after `ms`, regardless of what it's racing. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Launch overlay that prewarms everything responsible for first-navigation lag,
 * then reveals the app. Rendered as the topmost child at the app root; it looks
 * identical to the native splash (same art + background) so the handoff from the
 * OS splash is seamless.
 *
 * While it's up it: evaluates the Clock / Operations module graphs, warms the
 * Skia renderer (the hidden 1×1 canvas), warms the recognition model, and waits
 * for the in-app-purchase entitlement to settle. A hard timeout guarantees it
 * never blocks the app open.
 */
export function AppPrewarm() {
  const { loading } = usePurchases();
  const [warmed, setWarmed] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await warmModules();
      // Warm the recognizer, but never wait longer than the cap for it.
      await Promise.race([prepareModel().catch(() => {}), delay(MODEL_WARM_CAP_MS)]);
      if (alive) setWarmed(true);
    })();
    const hardCap = setTimeout(() => {
      if (alive) setExpired(true);
    }, HARD_CAP_MS);
    return () => {
      alive = false;
      clearTimeout(hardCap);
    };
  }, []);

  // Ready once our warm tasks finished AND entitlements settled — or the hard
  // cap fires, whichever comes first.
  const ready = expired || (warmed && !loading);
  if (ready) return null;

  return (
    <View style={styles.overlay}>
      <Image
        source={require('../../assets/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator
        color={operationColors.addition.accent}
        style={styles.spinner}
      />
      {/* Off-screen 1×1 canvas: mounting it pays the first Skia-surface cost
          now, so the first real dial/scratch canvas renders without a hitch. */}
      <Canvas style={styles.warm} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Matches app.json → expo.splash.backgroundColor so the OS splash and this
    // overlay are indistinguishable.
    backgroundColor: '#F4F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  logo: { width: 160, height: 160 },
  spinner: { position: 'absolute', bottom: 96 },
  warm: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
