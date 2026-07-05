/**
 * Purchases / entitlement provider.
 *
 * Single source of truth for what's owned (the Operations bundle and the Clock
 * module), plus the actions to buy and restore them. Everything StoreKit-
 * specific is contained here so the rest of the app only sees the booleans +
 * `purchase*()` / `restore()`.
 *
 * The Operations bundle is a **live StoreKit purchase** via `expo-iap` — fetch
 * the product + localized price, `requestPurchase`, and reconcile entitlement
 * from `getAvailablePurchases` (handles Restore and, on a successful query,
 * refund revocation). Entitlement is cached locally so it survives offline: we
 * load the cache first and only ever change it after a *successful* StoreKit
 * query, so a transient/offline failure never locks a paid user back out.
 *
 * `expo-iap` is a native module, so it only works in a build that bundles it.
 * When it's missing (e.g. a dev client built before it was added) we fall back
 * to a no-StoreKit provider rather than crash: in dev the Buy button simulates
 * a grant so the unlock UX stays testable; in production it never grants for
 * free. A real build always takes the StoreKit path.
 *
 * V1 ships exactly one live IAP (the Operations bundle — see the `versions` /
 * `pricing` skills). The Clock module and the Complete bundle have no App Store
 * product yet, so they remain local stubs here (dev-only, gated by the feature
 * flags) until their own slice wires them to StoreKit.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  getAvailablePurchases as queryAvailablePurchases,
  useIAP,
  type Purchase,
} from 'expo-iap';

import { OPERATIONS_PRODUCT_ID } from '../lib/entitlement';
import { clockEntitlementStore, entitlementStore } from '../lib/storage';

/** Displayed prices until StoreKit provides the real, localized ones. */
const FALLBACK_PRICE = '$9.99';
const FALLBACK_COMPLETE_PRICE = '$24.99';
const FALLBACK_CLOCK_PRICE = '$4.99';

/** Whether this binary actually bundles the expo-iap native module. */
const STOREKIT_AVAILABLE = requireOptionalNativeModule('ExpoIap') != null;

export interface PurchasesContextValue {
  /** Whether the paid operations are unlocked. */
  owned: boolean;
  /** Whether the Clock module is unlocked. */
  clockOwned: boolean;
  /** Localized price string for the Operations bundle. */
  price: string;
  /** Localized price string for the "everything" Complete bundle. */
  completePrice: string;
  /** Localized price string for the Clock module. */
  clockPrice: string;
  /** Still loading the initial entitlement state. */
  loading: boolean;
  /** A purchase is in flight. */
  purchasing: boolean;
  /** Buy the Operations bundle. Resolves true on success. */
  purchase: () => Promise<boolean>;
  /** Buy the Complete bundle (everything). Resolves true on success. */
  purchaseComplete: () => Promise<boolean>;
  /** Buy the Clock module. Resolves true on success. */
  purchaseClock: () => Promise<boolean>;
  /** Restore previous purchases. Resolves true if anything is now owned. */
  restore: () => Promise<boolean>;
  /** True when the last purchase attempt failed to start (not user-cancel). */
  purchaseFailed: boolean;
  /** Dismiss the {@link purchaseFailed} flag (e.g. after showing a notice). */
  clearPurchaseError: () => void;
  /** DEV-only: force the Operations owned state to test both sides of the gate. */
  devSetOwned: (value: boolean) => void;
  /** DEV-only: force the Clock owned state to test both sides of the gate. */
  devSetClockOwned: (value: boolean) => void;
}

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

/**
 * Shared entitlement state both providers build on: cached owned-state, the
 * persisting setters, the in-flight flag, the dev helpers, and the Clock /
 * Complete local stubs (no live App Store product yet).
 */
function useEntitlementCore() {
  const [owned, setOwned] = useState(false);
  const [clockOwned, setClockOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  // Set when a purchase can't even start (missing product / launch failure) —
  // NOT on user-cancel. Lets the unlock screens surface a notice instead of the
  // button silently doing nothing.
  const [purchaseFailed, setPurchaseFailed] = useState(false);
  const clearPurchaseError = useCallback(() => setPurchaseFailed(false), []);

  const applyOps = useCallback(async (value: boolean) => {
    setOwned(value);
    await entitlementStore.set(value);
  }, []);

  const applyClock = useCallback(async (value: boolean) => {
    setClockOwned(value);
    await clockEntitlementStore.set(value);
  }, []);

  // Offline-first: show the cached entitlement immediately. Providers reconcile
  // with StoreKit afterwards (when available).
  useEffect(() => {
    let cancelled = false;
    Promise.all([entitlementStore.get(), clockEntitlementStore.get()]).then(
      ([ops, clock]) => {
        if (cancelled) return;
        setOwned(ops);
        setClockOwned(clock);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Clock / Complete have no live App Store product in V1 (dev-only, gated by
  // feature flags). Keep them as local stubs so their unlock UX stays testable;
  // their own slice will route them through StoreKit like Operations.
  const purchaseClock = useCallback(async () => {
    setPurchasing(true);
    try {
      await applyClock(true);
      return true;
    } finally {
      setPurchasing(false);
    }
  }, [applyClock]);

  const purchaseComplete = useCallback(async () => {
    setPurchasing(true);
    try {
      await applyOps(true);
      await applyClock(true);
      return true;
    } finally {
      setPurchasing(false);
    }
  }, [applyOps, applyClock]);

  const devSetOwned = useCallback(
    (value: boolean) => {
      void applyOps(value);
    },
    [applyOps],
  );

  const devSetClockOwned = useCallback(
    (value: boolean) => {
      void applyClock(value);
    },
    [applyClock],
  );

  return {
    owned,
    clockOwned,
    loading,
    purchasing,
    setPurchasing,
    purchaseFailed,
    setPurchaseFailed,
    clearPurchaseError,
    applyOps,
    purchaseClock,
    purchaseComplete,
    devSetOwned,
    devSetClockOwned,
  };
}

type EntitlementCore = ReturnType<typeof useEntitlementCore>;

/** Assemble the context value from the shared core plus the per-provider bits. */
function usePurchasesValue(
  core: EntitlementCore,
  overrides: {
    price: string;
    purchase: () => Promise<boolean>;
    restore: () => Promise<boolean>;
  },
): PurchasesContextValue {
  const {
    owned,
    clockOwned,
    loading,
    purchasing,
    purchaseFailed,
    clearPurchaseError,
    purchaseClock,
    purchaseComplete,
    devSetOwned,
    devSetClockOwned,
  } = core;
  const { price, purchase, restore } = overrides;

  return useMemo<PurchasesContextValue>(
    () => ({
      owned,
      clockOwned,
      price,
      completePrice: FALLBACK_COMPLETE_PRICE,
      clockPrice: FALLBACK_CLOCK_PRICE,
      loading,
      purchasing,
      purchase,
      purchaseComplete,
      purchaseClock,
      restore,
      purchaseFailed,
      clearPurchaseError,
      devSetOwned,
      devSetClockOwned,
    }),
    [
      owned,
      clockOwned,
      price,
      loading,
      purchasing,
      purchase,
      purchaseComplete,
      purchaseClock,
      restore,
      purchaseFailed,
      clearPurchaseError,
      devSetOwned,
      devSetClockOwned,
    ],
  );
}

/** Real StoreKit-backed provider — used when the expo-iap native module exists. */
function StoreKitPurchasesProvider({ children }: { children: ReactNode }) {
  const core = useEntitlementCore();
  const { applyOps, setPurchasing, setPurchaseFailed } = core;

  // A purchase() call parks here until StoreKit reports success/failure via the
  // useIAP callbacks below — bridges the callback API to a Promise<boolean>.
  const pendingResolve = useRef<((value: boolean) => void) | null>(null);
  const settle = useCallback((value: boolean) => {
    pendingResolve.current?.(value);
    pendingResolve.current = null;
  }, []);

  // finishTransaction comes from the hook (declared just below), so reach it
  // through a ref to avoid the definition-order cycle with onPurchaseSuccess.
  const finishRef = useRef<((purchase: Purchase) => Promise<void>) | null>(null);

  const onPurchaseSuccess = useCallback(
    async (purchase: Purchase) => {
      // 'pending' = deferred (e.g. Ask to Buy); don't grant until it clears.
      if (purchase.purchaseState === 'pending') return;
      if (purchase.productId === OPERATIONS_PRODUCT_ID) await applyOps(true);
      try {
        // Non-consumable: must be finished so StoreKit stops re-delivering it.
        await finishRef.current?.(purchase);
      } catch {
        // Already finished or transient — entitlement is granted regardless,
        // and the next reconcile will confirm it.
      }
      settle(true);
    },
    [applyOps, settle],
  );

  const onPurchaseError = useCallback(
    (_error: unknown) => {
      // Covers user-cancel too; the caller just sees the purchase didn't land.
      settle(false);
    },
    [settle],
  );

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } =
    useIAP({ onPurchaseSuccess, onPurchaseError });

  useEffect(() => {
    finishRef.current = (purchase: Purchase) =>
      finishTransaction({ purchase, isConsumable: false });
  }, [finishTransaction]);

  // Reconcile owned-state from StoreKit. Returns whether the Operations bundle
  // is owned per the store. Throws if the query fails (offline / store down) so
  // callers can fall back to the cached entitlement instead of revoking it.
  const reconcile = useCallback(async (): Promise<boolean> => {
    const purchases = await queryAvailablePurchases();
    const ops = purchases.some((p) => p.productId === OPERATIONS_PRODUCT_ID);
    await applyOps(ops);
    return ops;
  }, [applyOps]);

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: [OPERATIONS_PRODUCT_ID], type: 'in-app' }).catch(() => {
      // Price falls back to the bundled string; not fatal.
    });
    reconcile().catch(() => {
      // Offline / store unavailable: keep the cached entitlement untouched.
    });
  }, [connected, fetchProducts, reconcile]);

  const price = useMemo(() => {
    const product = products.find((p) => p.id === OPERATIONS_PRODUCT_ID);
    return product?.displayPrice ?? FALLBACK_PRICE;
  }, [products]);

  // Kick off a StoreKit purchase and resolve once the success/error callback
  // fires. setPurchasing brackets the whole in-flight window.
  const startPurchase = useCallback(
    (sku: string) => {
      setPurchasing(true);
      setPurchaseFailed(false);
      return new Promise<boolean>((resolve) => {
        pendingResolve.current = resolve;
        requestPurchase({
          request: { apple: { sku, quantity: 1 } },
          type: 'in-app',
        }).catch(() => {
          // Couldn't even launch the sheet (missing product, store down, etc.)
          // — this is the silent-no-op case, so make it visible.
          setPurchaseFailed(true);
          settle(false);
        });
      }).finally(() => setPurchasing(false));
    },
    [requestPurchase, settle, setPurchasing, setPurchaseFailed],
  );

  // In a dev build the App Store product usually isn't available (no sandbox /
  // `.storekit` config), so the real StoreKit flow can't run. Fall back to a
  // simulated grant there so the Buy button stays testable locally. Production
  // builds always go through StoreKit.
  const purchase = useCallback(async () => {
    const hasProduct = products.some((p) => p.id === OPERATIONS_PRODUCT_ID);
    if (__DEV__ && !hasProduct) {
      setPurchasing(true);
      try {
        await applyOps(true);
        return true;
      } finally {
        setPurchasing(false);
      }
    }
    return startPurchase(OPERATIONS_PRODUCT_ID);
  }, [products, startPurchase, applyOps, setPurchasing]);

  const restore = useCallback(async () => {
    try {
      const ops = await reconcile();
      const clock = await clockEntitlementStore.get();
      return ops || clock;
    } catch {
      // Offline: fall back to whatever we last validated.
      const [ops, clock] = await Promise.all([
        entitlementStore.get(),
        clockEntitlementStore.get(),
      ]);
      return ops || clock;
    }
  }, [reconcile]);

  const value = usePurchasesValue(core, { price, purchase, restore });

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
  );
}

/**
 * Fallback provider for builds without the expo-iap native module. Keeps the
 * app running and the unlock UX testable in dev; never grants for free in prod.
 */
function StubPurchasesProvider({ children }: { children: ReactNode }) {
  const core = useEntitlementCore();
  const { applyOps, setPurchasing, setPurchaseFailed } = core;

  const purchase = useCallback(async () => {
    // No StoreKit in this binary. Simulate in dev so the unlock flow is
    // testable; in production refuse rather than unlock for free — but surface
    // it so the button isn't a silent dead end.
    if (!__DEV__) {
      setPurchaseFailed(true);
      return false;
    }
    setPurchasing(true);
    try {
      await applyOps(true);
      return true;
    } finally {
      setPurchasing(false);
    }
  }, [applyOps, setPurchasing, setPurchaseFailed]);

  const restore = useCallback(async () => {
    const [ops, clock] = await Promise.all([
      entitlementStore.get(),
      clockEntitlementStore.get(),
    ]);
    return ops || clock;
  }, []);

  const value = usePurchasesValue(core, {
    price: FALLBACK_PRICE,
    purchase,
    restore,
  });

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
  );
}

export function PurchasesProvider({ children }: { children: ReactNode }) {
  // STOREKIT_AVAILABLE is a module-level constant, so the same branch renders
  // for the app's whole lifetime — Rules of Hooks stay satisfied.
  return STOREKIT_AVAILABLE ? (
    <StoreKitPurchasesProvider>{children}</StoreKitPurchasesProvider>
  ) : (
    <StubPurchasesProvider>{children}</StubPurchasesProvider>
  );
}

/** Access purchase state + actions. Must be inside a {@link PurchasesProvider}. */
export function usePurchases(): PurchasesContextValue {
  const ctx = useContext(PurchasesContext);
  if (!ctx) {
    throw new Error('usePurchases must be used within a PurchasesProvider');
  }
  return ctx;
}
