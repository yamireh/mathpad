/**
 * Purchases / entitlement provider.
 *
 * Single source of truth for whether the Operations bundle is owned, plus the
 * actions to buy and restore it. Everything StoreKit-specific is contained
 * here so the rest of the app only sees `owned` / `purchase()` / `restore()`.
 *
 * SLICE 1 (current): a local stub backed by {@link entitlementStore} — no
 * native module yet, so the full lock/unlock UX is testable in a normal dev
 * build. SLICE 2 swaps the stub internals for `expo-iap` (fetch product +
 * price, `getAvailablePurchases` to reconcile entitlement, `requestPurchase`)
 * without changing this file's public shape.
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

import { entitlementStore } from '../lib/storage';

/** Displayed prices until StoreKit provides the real, localized ones (Slice 2). */
const FALLBACK_PRICE = '$9.99';
const FALLBACK_COMPLETE_PRICE = '$24.99';

export interface PurchasesContextValue {
  /** Whether the paid operations are unlocked. */
  owned: boolean;
  /** Localized price string for the Operations bundle. */
  price: string;
  /** Localized price string for the "everything" Complete bundle. */
  completePrice: string;
  /** Still loading the initial entitlement state. */
  loading: boolean;
  /** A purchase is in flight. */
  purchasing: boolean;
  /** Buy the Operations bundle (this module). Resolves true on success. */
  purchase: () => Promise<boolean>;
  /** Buy the Complete bundle (everything). Resolves true on success. */
  purchaseComplete: () => Promise<boolean>;
  /** Restore a previous purchase. Resolves true if now owned. */
  restore: () => Promise<boolean>;
  /** DEV-only: force the owned state to test both sides of the gate. */
  devSetOwned: (value: boolean) => void;
}

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  // Load the cached entitlement once on mount. (Slice 2: also reconcile with
  // StoreKit's current entitlements here and update the cache.)
  useEffect(() => {
    let cancelled = false;
    entitlementStore.get().then((value) => {
      if (!cancelled) {
        setOwned(value);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback(async (value: boolean) => {
    setOwned(value);
    await entitlementStore.set(value);
  }, []);

  const purchase = useCallback(async () => {
    // Slice 1 stub: simulate a successful StoreKit purchase.
    setPurchasing(true);
    try {
      await apply(true);
      return true;
    } finally {
      setPurchasing(false);
    }
  }, [apply]);

  const purchaseComplete = useCallback(async () => {
    // Slice 1 stub: the Complete bundle implies the Operations entitlement.
    // (Slice 2 will own its own product id + per-module entitlements.)
    setPurchasing(true);
    try {
      await apply(true);
      return true;
    } finally {
      setPurchasing(false);
    }
  }, [apply]);

  const restore = useCallback(async () => {
    // Slice 1 stub: the cache is all we have. Slice 2 queries StoreKit.
    const value = await entitlementStore.get();
    setOwned(value);
    return value;
  }, []);

  const devSetOwned = useCallback(
    (value: boolean) => {
      void apply(value);
    },
    [apply],
  );

  const value = useMemo<PurchasesContextValue>(
    () => ({
      owned,
      price: FALLBACK_PRICE,
      completePrice: FALLBACK_COMPLETE_PRICE,
      loading,
      purchasing,
      purchase,
      purchaseComplete,
      restore,
      devSetOwned,
    }),
    [owned, loading, purchasing, purchase, purchaseComplete, restore, devSetOwned],
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
