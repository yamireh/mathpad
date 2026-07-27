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
 * Two live IAPs ship as of V1.2 (see the `versions` / `pricing` skills): the
 * Operations bundle (`com.mc.mathpad.operations`, $9.99) and the Clock module
 * (`com.mc.mathpad.clock`, $7.99) — both non-consumables reconciled from
 * StoreKit. The Complete bundle has no App Store product yet, so it stays a
 * local stub (gated off by `COMPLETE_BUNDLE_ENABLED`) until more modules exist.
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

import { LogBox } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { getApp } from 'firebase/app';
import {
  getAvailablePurchases as queryAvailablePurchases,
  hasActiveSubscriptions as queryHasActiveSubscriptions,
  restorePurchases,
  useIAP,
  type Purchase,
} from 'expo-iap';

import {
  CLOCK_PRODUCT_ID,
  OPERATIONS_PRODUCT_ID,
  PARENT_PRO_PRODUCT_ID,
} from '../lib/entitlement';
import { useFamilyProActive } from './useFamilyProActive';
import { parentProTrialDays } from '../lib/appConfig';
import { isParentProActive, trialDaysLeft } from '../lib/parentPro';
import {
  clockEntitlementStore,
  entitlementStore,
  parentProStore,
  type ParentProData,
} from '../lib/storage';

// The billing service can't connect where it isn't available — an Android
// emulator without Google Play, before a Play Console track exists, or offline.
// We handle that gracefully (see `onConnectionError` below), and in production
// expo-iap's own log is harmless, so silence the expected dev warning.
if (__DEV__) {
  LogBox.ignoreLogs(['initConnection failed', '[useIAP] Connection failed']);
}

/** Displayed prices until StoreKit provides the real, localized ones. */
const FALLBACK_PRICE = '$9.99';
const FALLBACK_COMPLETE_PRICE = '$24.99';
const FALLBACK_CLOCK_PRICE = '$7.99';
const FALLBACK_PARENT_PRO_PRICE = '$7.99';

/** Whether this binary actually bundles the expo-iap native module. */
const STOREKIT_AVAILABLE = requireOptionalNativeModule('ExpoIap') != null;

/**
 * Ask the Cloud Function to validate the receipt and write the family's
 * `subscription` (Slice 3c) — so kids/co-parents inherit authoritatively.
 * Best-effort: if the function isn't deployed yet, the client mirror + launch
 * reconcile still cover it, so a failure is silently ignored.
 */
async function syncParentProCloud(transactionId: string): Promise<void> {
  try {
    // Lazy import — keeps firebase/functions (ESM) out of the test graph.
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const call = httpsCallable(getFunctions(getApp()), 'syncParentProSubscription');
    await call({ transactionId });
  } catch {
    // not deployed / offline — local mirror + reconcile own it for now
  }
}

export interface PurchasesContextValue {
  /** Whether the paid operations are unlocked (one-time IAP OR family sub). */
  owned: boolean;
  /** Whether the Clock module is unlocked (one-time IAP OR family sub). */
  clockOwned: boolean;
  /** The family's Parent Pro subscription is active → all modules unlocked. */
  familyProActive: boolean;
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

  /** Whether Parent Pro is active right now (paid sub or live free trial). */
  parentProActive: boolean;
  /** Localized price string for the Parent Pro subscription. */
  parentProPrice: string;
  /** Configured free-trial length in days (0 = no trial). */
  parentProTrialDays: number;
  /** Whole days left in the current free trial (0 if none/over). */
  parentProTrialDaysLeft: number;
  /** Whether the free trial has already been started once. */
  parentProTrialUsed: boolean;
  /** Start the Parent Pro subscription (Slice 1: begins the free trial). */
  subscribeParentPro: () => Promise<boolean>;
  /** DEV-only: force Parent Pro on (paid) / off. */
  devSetParentPro: (value: boolean) => void;
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
  const [parentPro, setParentPro] = useState<ParentProData>({
    subscribed: false,
    trialStartedAt: null,
  });
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

  const applyParentPro = useCallback(async (data: ParentProData) => {
    setParentPro(data);
    await parentProStore.set(data);
  }, []);

  // Offline-first: show the cached entitlement immediately. Providers reconcile
  // with StoreKit afterwards (when available).
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      entitlementStore.get(),
      clockEntitlementStore.get(),
      parentProStore.get(),
    ]).then(([ops, clock, pro]) => {
      if (cancelled) return;
      setOwned(ops);
      setClockOwned(clock);
      setParentPro(pro);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The Complete bundle has no live App Store product yet (deferred until more
  // modules exist), so it stays a local stub. Clock IS a live StoreKit product
  // now — each provider wires its own `purchaseClock` (real vs. fallback).
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

  // Dev/no-StoreKit fallback: the first tap begins the free trial (records when
  // it started); once used, a tap is treated as "subscribe". The real provider
  // overrides this with a live StoreKit subscription purchase.
  const subscribeParentProStub = useCallback(async () => {
    setPurchasing(true);
    try {
      const next: ParentProData = parentPro.trialStartedAt
        ? { subscribed: true, trialStartedAt: parentPro.trialStartedAt }
        : { subscribed: false, trialStartedAt: new Date().toISOString() };
      await applyParentPro(next);
      return true;
    } finally {
      setPurchasing(false);
    }
  }, [parentPro, applyParentPro]);

  const devSetParentPro = useCallback(
    (value: boolean) => {
      void applyParentPro(
        value
          ? { subscribed: true, trialStartedAt: parentPro.trialStartedAt }
          : { subscribed: false, trialStartedAt: null },
      );
    },
    [applyParentPro, parentPro.trialStartedAt],
  );

  return {
    owned,
    clockOwned,
    parentPro,
    loading,
    purchasing,
    setPurchasing,
    purchaseFailed,
    setPurchaseFailed,
    clearPurchaseError,
    applyOps,
    applyClock,
    applyParentPro,
    purchaseComplete,
    devSetOwned,
    devSetClockOwned,
    subscribeParentProStub,
    devSetParentPro,
  };
}

type EntitlementCore = ReturnType<typeof useEntitlementCore>;

/** Assemble the context value from the shared core plus the per-provider bits. */
function usePurchasesValue(
  core: EntitlementCore,
  overrides: {
    price: string;
    clockPrice: string;
    parentProPrice: string;
    purchase: () => Promise<boolean>;
    purchaseClock: () => Promise<boolean>;
    subscribeParentPro: () => Promise<boolean>;
    restore: () => Promise<boolean>;
    familyProActive: boolean;
  },
): PurchasesContextValue {
  const {
    owned,
    clockOwned,
    parentPro,
    loading,
    purchasing,
    purchaseFailed,
    clearPurchaseError,
    purchaseComplete,
    devSetOwned,
    devSetClockOwned,
    devSetParentPro,
  } = core;
  const {
    price,
    clockPrice,
    parentProPrice,
    purchase,
    purchaseClock,
    subscribeParentPro,
    restore,
    familyProActive,
  } = overrides;

  const trialDays = parentProTrialDays();
  const now = Date.now();
  const parentProActive = isParentProActive(parentPro, trialDays, now);
  const parentProTrialDaysLeft = trialDaysLeft(parentPro, trialDays, now);
  const parentProTrialUsed = parentPro.trialStartedAt != null;
  // An active family subscription unlocks every module for the child.
  const effectiveOwned = owned || familyProActive;
  const effectiveClockOwned = clockOwned || familyProActive;

  return useMemo<PurchasesContextValue>(
    () => ({
      owned: effectiveOwned,
      clockOwned: effectiveClockOwned,
      familyProActive,
      price,
      completePrice: FALLBACK_COMPLETE_PRICE,
      clockPrice,
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
      parentProActive,
      parentProPrice,
      parentProTrialDays: trialDays,
      parentProTrialDaysLeft,
      parentProTrialUsed,
      subscribeParentPro,
      devSetParentPro,
    }),
    [
      effectiveOwned,
      effectiveClockOwned,
      familyProActive,
      price,
      clockPrice,
      parentProPrice,
      subscribeParentPro,
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
      parentProActive,
      trialDays,
      parentProTrialDaysLeft,
      parentProTrialUsed,
      devSetParentPro,
    ],
  );
}

/** Real StoreKit-backed provider — used when the expo-iap native module exists. */
function StoreKitPurchasesProvider({ children }: { children: ReactNode }) {
  const core = useEntitlementCore();
  const {
    applyOps,
    applyClock,
    applyParentPro,
    subscribeParentProStub,
    setPurchasing,
    setPurchaseFailed,
  } = core;
  // Latest subscription state, for callbacks that shouldn't re-create on change.
  const parentProRef = useRef(core.parentPro);
  parentProRef.current = core.parentPro;

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
      if (purchase.productId === CLOCK_PRODUCT_ID) await applyClock(true);
      if (purchase.productId === PARENT_PRO_PRODUCT_ID) {
        await applyParentPro({
          subscribed: true,
          trialStartedAt:
            parentProRef.current.trialStartedAt ?? new Date().toISOString(),
        });
        // Authoritative server-side validation → writes the family doc.
        if (purchase.transactionId) void syncParentProCloud(purchase.transactionId);
      }
      try {
        // Must be finished so StoreKit stops re-delivering it (subs included).
        await finishRef.current?.(purchase);
      } catch {
        // Already finished or transient — entitlement is granted regardless,
        // and the next reconcile will confirm it.
      }
      settle(true);
    },
    [applyOps, applyClock, applyParentPro, settle],
  );

  const onPurchaseError = useCallback(
    (_error: unknown) => {
      // Covers user-cancel too; the caller just sees the purchase didn't land.
      settle(false);
    },
    [settle],
  );

  // Store/billing couldn't connect (emulator without Google Play, no Play track
  // yet, offline). Degrade gracefully: `connected` stays false, so we never
  // fetch products or reconcile, entitlement stays at its cached value (nothing
  // owned by default), and a buy attempt surfaces the "couldn't start" notice.
  // Handling it here keeps it from being an unhandled error.
  const onConnectionError = useCallback((_error: Error) => {}, []);

  const {
    connected,
    products,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({ onPurchaseSuccess, onPurchaseError, onError: onConnectionError });

  useEffect(() => {
    finishRef.current = (purchase: Purchase) =>
      finishTransaction({ purchase, isConsumable: false });
  }, [finishTransaction]);

  // Reconcile owned-state from StoreKit for both products. Throws if the query
  // fails (offline / store down) so callers can fall back to the cached
  // entitlement instead of revoking it.
  const reconcile = useCallback(async (): Promise<{
    ops: boolean;
    clock: boolean;
  }> => {
    const purchases = await queryAvailablePurchases();
    const ops = purchases.some((p) => p.productId === OPERATIONS_PRODUCT_ID);
    const clock = purchases.some((p) => p.productId === CLOCK_PRODUCT_ID);
    await applyOps(ops);
    await applyClock(clock);
    // Subscription: the authoritative active check (honours expiry, so a lapsed
    // sub flips to false). Throwing here (offline) keeps the cached value.
    const proActive = await queryHasActiveSubscriptions([PARENT_PRO_PRODUCT_ID]);
    await applyParentPro({
      subscribed: proActive,
      trialStartedAt: parentProRef.current.trialStartedAt,
    });
    return { ops, clock };
  }, [applyOps, applyClock, applyParentPro]);

  useEffect(() => {
    if (!connected) return;
    fetchProducts({
      skus: [OPERATIONS_PRODUCT_ID, CLOCK_PRODUCT_ID],
      type: 'in-app',
    }).catch(() => {
      // Prices fall back to the bundled strings; not fatal.
    });
    fetchProducts({ skus: [PARENT_PRO_PRODUCT_ID], type: 'subs' }).catch(() => {
      // Subscription price falls back to the bundled string; not fatal.
    });
    reconcile().catch(() => {
      // Offline / store unavailable: keep the cached entitlement untouched.
    });
  }, [connected, fetchProducts, reconcile]);

  const price = useMemo(() => {
    const product = products.find((p) => p.id === OPERATIONS_PRODUCT_ID);
    return product?.displayPrice ?? FALLBACK_PRICE;
  }, [products]);

  const clockPrice = useMemo(() => {
    const product = products.find((p) => p.id === CLOCK_PRODUCT_ID);
    return product?.displayPrice ?? FALLBACK_CLOCK_PRICE;
  }, [products]);

  const parentProPrice = useMemo(() => {
    const sub = subscriptions.find((s) => s.id === PARENT_PRO_PRODUCT_ID);
    return sub?.displayPrice ?? FALLBACK_PARENT_PRO_PRICE;
  }, [subscriptions]);

  // Kick off a StoreKit purchase and resolve once the success/error callback
  // fires. setPurchasing brackets the whole in-flight window.
  const startPurchase = useCallback(
    (sku: string, type: 'in-app' | 'subs' = 'in-app') => {
      setPurchasing(true);
      setPurchaseFailed(false);
      return new Promise<boolean>((resolve) => {
        pendingResolve.current = resolve;
        requestPurchase({
          request: { apple: { sku, quantity: 1 } },
          type,
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

  const purchaseClock = useCallback(async () => {
    const hasProduct = products.some((p) => p.id === CLOCK_PRODUCT_ID);
    if (__DEV__ && !hasProduct) {
      setPurchasing(true);
      try {
        await applyClock(true);
        return true;
      } finally {
        setPurchasing(false);
      }
    }
    return startPurchase(CLOCK_PRODUCT_ID);
  }, [products, startPurchase, applyClock, setPurchasing]);

  const subscribeParentPro = useCallback(async () => {
    const hasProduct = subscriptions.some((s) => s.id === PARENT_PRO_PRODUCT_ID);
    // Dev build without the App Store product → simulate so the flow's testable.
    if (__DEV__ && !hasProduct) return subscribeParentProStub();
    return startPurchase(PARENT_PRO_PRODUCT_ID, 'subs');
  }, [subscriptions, startPurchase, subscribeParentProStub]);

  const restore = useCallback(async () => {
    try {
      // iOS: force a StoreKit sync FIRST so family-shared (and any not-yet-cached)
      // entitlements are pulled from the App Store before we read them.
      // Best-effort: a failed/cancelled sync (offline, Apple ID prompt dismissed)
      // still falls through to reading whatever is already available.
      try {
        await restorePurchases();
      } catch {
        // sync unavailable — continue with the query below
      }
      // StoreKit delivers the restored transactions ASYNCHRONOUSLY, so reading
      // once right after the sync often comes back empty (which looked like
      // "nothing happened" until an app restart re-read them). Poll a few times
      // so the unlock happens in place. Grant-only: a laggy empty read never
      // revokes a cached entitlement — the launch reconcile owns honest sync.
      let ops = false;
      let clock = false;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const purchases = await queryAvailablePurchases();
        ops = ops || purchases.some((p) => p.productId === OPERATIONS_PRODUCT_ID);
        clock = clock || purchases.some((p) => p.productId === CLOCK_PRODUCT_ID);
        if (ops && clock) break;
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      if (ops) await applyOps(true);
      if (clock) await applyClock(true);
      // Also pull back an active subscription (e.g. Family-Shared).
      const proActive = await queryHasActiveSubscriptions([
        PARENT_PRO_PRODUCT_ID,
      ]).catch(() => false);
      if (proActive) {
        await applyParentPro({
          subscribed: true,
          trialStartedAt: parentProRef.current.trialStartedAt,
        });
      }
      return ops || clock || proActive;
    } catch {
      // Offline: fall back to whatever we last validated.
      const [ops, clock, pro] = await Promise.all([
        entitlementStore.get(),
        clockEntitlementStore.get(),
        parentProStore.get(),
      ]);
      return ops || clock || pro.subscribed;
    }
  }, [applyOps, applyClock, applyParentPro]);

  const familyProActive = useFamilyProActive();
  const value = usePurchasesValue(core, {
    price,
    clockPrice,
    parentProPrice,
    purchase,
    purchaseClock,
    subscribeParentPro,
    restore,
    familyProActive,
  });

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
  const { applyOps, applyClock, setPurchasing, setPurchaseFailed } = core;

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

  const purchaseClock = useCallback(async () => {
    if (!__DEV__) {
      setPurchaseFailed(true);
      return false;
    }
    setPurchasing(true);
    try {
      await applyClock(true);
      return true;
    } finally {
      setPurchasing(false);
    }
  }, [applyClock, setPurchasing, setPurchaseFailed]);

  const restore = useCallback(async () => {
    const [ops, clock] = await Promise.all([
      entitlementStore.get(),
      clockEntitlementStore.get(),
    ]);
    return ops || clock;
  }, []);

  const familyProActive = useFamilyProActive();
  const value = usePurchasesValue(core, {
    price: FALLBACK_PRICE,
    clockPrice: FALLBACK_CLOCK_PRICE,
    parentProPrice: FALLBACK_PARENT_PRO_PRICE,
    purchase,
    purchaseClock,
    subscribeParentPro: core.subscribeParentProStub,
    restore,
    familyProActive,
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
