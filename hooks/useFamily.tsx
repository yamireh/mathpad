import { useEffect, useState } from 'react';

import { type Family, ensureFamily } from '../lib/firebase/family';

export interface FamilyState {
  family: Family | null;
  loading: boolean;
  error: boolean;
}

/**
 * Loads (creating on first sign-in) the signed-in parent's family so the parent
 * area can show its pairing code. Pass the parent's uid; anonymous/absent users
 * get no family.
 */
export function useFamily(ownerUid: string | null): FamilyState {
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ownerUid) {
      setFamily(null);
      setLoading(false);
      setError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    ensureFamily(ownerUid)
      .then((f) => {
        if (!cancelled) setFamily(f);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerUid]);

  return { family, loading, error };
}
