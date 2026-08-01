/**
 * usePendingExams — the parent-assigned exams a kid device still has to do.
 *
 * Subscribes in real time (assigned exams minus submitted ones) so the kid's
 * home stays in sync live: a just-finished practice drops off instantly and a
 * newly-assigned one appears without any reload. Inert when the device isn't
 * linked to a family.
 */
import { useCallback, useEffect, useState } from 'react';

import { listenPendingExamsForChild } from '../lib/firebase/exams';
import type { Exam } from '../lib/exams';

export interface UsePendingExamsResult {
  exams: Exam[];
  loading: boolean;
  /** Last load error message, or null. Surfaced for dev diagnostics. */
  error: string | null;
  /** No-op: the live listener keeps the list current. Kept for callers. */
  reload: () => void;
}

export function usePendingExams(
  familyId: string | null,
  childId: string | null,
): UsePendingExamsResult {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!familyId || !childId) {
      setExams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsub = listenPendingExamsForChild(
      familyId,
      childId,
      (list) => {
        setExams(list);
        setLoading(false);
      },
      (e) => {
        setExams([]);
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      },
    );
    return unsub;
  }, [familyId, childId]);

  const reload = useCallback(() => {}, []);

  return { exams, loading, error, reload };
}
