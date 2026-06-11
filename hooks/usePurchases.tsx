/**
 * Purchases / entitlement provider.
 *
 * Single source of truth for what's owned (the Operations bundle and the Clock
 * module), plus the actions to buy and restore them. Everything StoreKit-
 * specific is contained here so the rest of the app only sees the booleans +
 * `purchase*()` / `restore()`.
 *
 * SLICE 1 (current): a local stub backed by {@link entitlementStore} /
 * {@link clockEntitlementStore} — no native module yet, so the full lock/unlock
 * UX is testable in a normal dev build. SLICE 2 swaps the stub internals for
 * `expo-iap` (fetch products + prices, `getAvailablePurchases` to reconcile
 * entitlement, `requestPurchase`) without changing this file's public shape.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { clockEntitlementStore, entitlementStore } from '../lib/storage';

/** Displayed prices until StoreKit provides the real, localized ones (Slice 2). */
const FALLBACK_PRICE = '$9.99';
const FALLBACK_COMPLETE_PRICE = '$24.99';
const FALLBACK_CLOCK_PRICE = '$4.99';

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
  /** DEV-only: force the Operations owned state to test both sides of the gate. */
  devSetOwned: (value: boolean) => void;
  /** DEV-only: force the Clock owned state to test both sides of the gate. */
  devSetClockOwned: (value: boolean) => void;
}

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const [owned, setOwned] = useState(false);
  const [clockOwned, setClockOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  // Load the cached entitlements once on mount. (Slice 2: also reconcile with
  // StoreKit's current entitlements here and update the cache.)
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

  const applyOps = useCallback(async (value: boolean) => {
    setOwned(value);
    await entitlementStore.set(value);
  }, []);

  const applyClock = useCallback(async (value: boolean) => {
    setClockOwned(value);
    await clockEntitlementStore.set(value);
  }, []);

  const buy = useCallback(async (fn: () => Promise<void>) => {
    setPurchasing(true);
    try {
      await fn();
      return true;
    } finally {
      setPurchasing(false);
    }
  }, []);

  // Slice 1 stubs: simulate a successful StoreKit purchase.
  const purchase = useCallback(() => buy(() => applyOps(true)), [buy, applyOps]);
  const purchaseClock = useCallback(
    () => buy(() => applyClock(true)),
    [buy, applyClock],
  );
  // The Complete bundle implies every module's entitlement.
  const purchaseComplete = useCallback(
    () => buy(async () => {
      await applyOps(true);
      await applyClock(true);
    }),
    [buy, applyOps, applyClock],
  );

  const restore = useCallback(async () => {
    // Slice 1 stub: the cache is all we have. Slice 2 queries StoreKit.
    const [ops, clock] = await Promise.all([
      entitlementStore.get(),
      clockEntitlementStore.get(),
    ]);
    setOwned(ops);
    setClockOwned(clock);
    return ops || clock;
  }, []);

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

  const value = useMemo<PurchasesContextValue>(
    () => ({
      owned,
      clockOwned,
      price: FALLBACK_PRICE,
      completePrice: FALLBACK_COMPLETE_PRICE,
      clockPrice: FALLBACK_CLOCK_PRICE,
      loading,
      purchasing,
      purchase,
      purchaseComplete,
      purchaseClock,
      restore,
      devSetOwned,
      devSetClockOwned,
    }),
    [
      owned,
      clockOwned,
      loading,
      purchasing,
      purchase,
      purchaseComplete,
      purchaseClock,
      restore,
      devSetOwned,
      devSetClockOwned,
    ],
  );

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
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
