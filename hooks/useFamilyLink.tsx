import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { type FamilyLink, familyLinkStore } from '../lib/storage';

export interface FamilyLinkContextValue {
  /** Whether the persisted link has loaded. */
  hydrated: boolean;
  /** The linked family + this device's child id, or null. */
  link: FamilyLink | null;
  /** Convenience: `link != null`. A linked device is locked to child mode. */
  linked: boolean;
  setLink: (link: FamilyLink | null) => void;
}

const FamilyLinkContext = createContext<FamilyLinkContextValue>({
  hydrated: true,
  link: null,
  linked: false,
  setLink: () => {},
});

/**
 * Tracks whether this (child) device has joined a family, persisted locally.
 * Once linked, the device is locked to child mode until a parent unlinks it.
 */
export function FamilyLinkProvider({ children }: { children: ReactNode }) {
  const [link, setLinkState] = useState<FamilyLink | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await familyLinkStore.get();
      if (cancelled) return;
      setLinkState(stored);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLink = useCallback((next: FamilyLink | null) => {
    setLinkState(next);
    void familyLinkStore.set(next);
  }, []);

  const value = useMemo(
    () => ({ hydrated, link, linked: link != null, setLink }),
    [hydrated, link, setLink],
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
