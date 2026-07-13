import { useCallback, useEffect, useState } from 'react';

import { type Family, getFamilyForParent } from '../lib/firebase/family';

export interface FamilyState {
  /** The parent's family, or null if they haven't created/joined one yet. */
  family: Family | null;
  loading: boolean;
  error: boolean;
  /** Re-fetch — call after creating or joining a family. */
  reload: () => void;
}

/**
 * Loads the signed-in parent's family (as creator or co-parent). Does NOT
 * create one — a parent with no family is offered a Create/Join choice, so a
 * co-parent's device doesn't spin up an empty family. Pass the parent's uid.
 */
export function useFamily(uid: string | null): FamilyState {
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!uid) {
      setFamily(null);
      setLoading(false);
      setError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    getFamilyForParent(uid)
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
  }, [uid, nonce]);

  return { family, loading, error, reload };
}
