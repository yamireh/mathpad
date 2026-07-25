/**
 * usePendingExams — the parent-assigned exams a kid device still has to do.
 *
 * Loads exams assigned to this child that haven't been submitted yet. Inert
 * (empty) when the device isn't linked to a family.
 */
import { useCallback, useEffect, useState } from 'react';

import { listPendingExamsForChild } from '../lib/firebase/exams';
import type { Exam } from '../lib/exams';

export interface UsePendingExamsResult {
  exams: Exam[];
  loading: boolean;
  /** Last load error message, or null. Surfaced for dev diagnostics. */
  error: string | null;
  reload: () => void;
}

export function usePendingExams(
  familyId: string | null,
  childId: string | null,
): UsePendingExamsResult {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!familyId || !childId) {
      setExams([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const list = await listPendingExamsForChild(familyId, childId);
        if (cancelled) return;
        setExams(list);
      } catch (e) {
        if (cancelled) return;
        setExams([]);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId, childId, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { exams, loading, error, reload };
}
