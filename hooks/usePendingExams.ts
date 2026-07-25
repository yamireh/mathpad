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
  reload: () => void;
}

export function usePendingExams(
  familyId: string | null,
  childId: string | null,
): UsePendingExamsResult {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!familyId || !childId) {
      setExams([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const list = await listPendingExamsForChild(familyId, childId).catch(
        () => [] as Exam[],
      );
      if (cancelled) return;
      setExams(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId, childId, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { exams, loading, reload };
}
