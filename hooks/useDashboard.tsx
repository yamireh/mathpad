import { useCallback, useEffect, useState } from 'react';

import { type ChildProgress, loadDashboard } from '../lib/firebase/dashboard';

export interface DashboardState {
  children: ChildProgress[];
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/** Loads the parent dashboard (children + progress) for a family. */
export function useDashboard(familyId: string | null): DashboardState {
  const [children, setChildren] = useState<ChildProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!familyId) {
      setChildren([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    loadDashboard(familyId)
      .then((c) => {
        if (!cancelled) setChildren(c);
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
  }, [familyId, nonce]);

  return { children, loading, error, reload };
}
