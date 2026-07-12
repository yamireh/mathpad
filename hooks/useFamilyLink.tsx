import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { familyLinkStore } from '../lib/storage';

export interface FamilyLinkContextValue {
  /** Whether the persisted link has loaded. */
  hydrated: boolean;
  /** The family this device is linked to, or null. */
  familyId: string | null;
  /** Convenience: `familyId != null`. A linked device is locked to child mode. */
  linked: boolean;
  setLink: (familyId: string | null) => void;
}

const FamilyLinkContext = createContext<FamilyLinkContextValue>({
  hydrated: true,
  familyId: null,
  linked: false,
  setLink: () => {},
});

/**
 * Tracks whether this (child) device has joined a family, persisted locally.
 * Once linked, the device is locked to child mode until a parent unlinks it.
 */
export function FamilyLinkProvider({ children }: { children: ReactNode }) {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await familyLinkStore.get();
      if (cancelled) return;
      setFamilyId(stored);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLink = useCallback((next: string | null) => {
    setFamilyId(next);
    void familyLinkStore.set(next);
  }, []);

  const value = useMemo(
    () => ({ hydrated, familyId, linked: familyId != null, setLink }),
    [hydrated, familyId, setLink],
  );

  return (
    <FamilyLinkContext.Provider value={value}>
      {children}
    </FamilyLinkContext.Provider>
  );
}

export function useFamilyLink(): FamilyLinkContextValue {
  return useContext(FamilyLinkContext);
}
