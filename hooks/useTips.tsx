import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { tipsStore } from '../lib/storage';

interface TipsContextValue {
  hydrated: boolean;
  dismissed: ReadonlySet<string>;
  markSeen: (id: string) => void;
  resetAll: () => void;
}

const TipsContext = createContext<TipsContextValue | null>(null);

/**
 * Tracks which one-time tips (and the first-borrow arrow) the user has seen.
 * State is persisted to AsyncStorage and shared app-wide so dismissing a tip
 * in one place hides it everywhere, and resetting brings every tip back.
 */
export function TipsProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ids = await tipsStore.load();
      if (cancelled) return;
      setDismissed(new Set(ids));
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markSeen = useCallback((id: string) => {
    setDismissed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      void tipsStore.save(Array.from(next));
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setDismissed(new Set());
    void tipsStore.clear();
  }, []);

  const value = useMemo<TipsContextValue>(
    () => ({ hydrated, dismissed, markSeen, resetAll }),
    [hydrated, dismissed, markSeen, resetAll],
  );

  return <TipsContext.Provider value={value}>{children}</TipsContext.Provider>;
}

const NOOP = () => {};
const EMPTY_DISMISSED: ReadonlySet<string> = new Set();

/**
 * Reading the context without a provider returns an inert value: tips never
 * fire and `markSeen` / `resetAll` are no-ops. This lets `TipBubble` be
 * dropped into screens / tests that don't mount a `TipsProvider` without
 * blowing up.
 */
function useTipsContext(): TipsContextValue {
  return (
    useContext(TipsContext) ?? {
      hydrated: false,
      dismissed: EMPTY_DISMISSED,
      markSeen: NOOP,
      resetAll: NOOP,
    }
  );
}

export interface UseTipResult {
  /** True once storage is hydrated and the tip has not been dismissed yet. */
  shouldShow: boolean;
  /** Permanently dismiss this tip (persists to storage). */
  markSeen: () => void;
}

export function useTip(id: string): UseTipResult {
  const { hydrated, dismissed, markSeen } = useTipsContext();
  const seen = useCallback(() => markSeen(id), [markSeen, id]);
  return {
    shouldShow: hydrated && !dismissed.has(id),
    markSeen: seen,
  };
}

/** Re-arm every dismissed tip. Wired to the practice screen's `?` button. */
export function useResetTips(): () => void {
  return useTipsContext().resetAll;
}
