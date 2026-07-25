/**
 * useFamilyExams — Parent Pro Assigned Exams state for the family.
 *
 * Loads the family's authored exams and, for each, the assigned children's
 * results (so the parent sees who's done / their score). Exposes create + delete.
 */
import { useCallback, useEffect, useState } from 'react';

import {
  createExam,
  deleteExam,
  listExams,
  loadExamWithResults,
} from '../lib/firebase/exams';
import type { Exam, ExamResult } from '../lib/exams';

/** An exam plus each assigned child's result (null = not submitted yet). */
export interface ExamWithChildResults {
  exam: Exam;
  results: { childId: string; result: ExamResult | null }[];
}

export interface UseFamilyExamsResult {
  exams: ExamWithChildResults[];
  loading: boolean;
  reload: () => void;
  create: (exam: Omit<Exam, 'id' | 'createdAt'>) => Promise<void>;
  remove: (examId: string) => Promise<void>;
}

export function useFamilyExams(familyId: string): UseFamilyExamsResult {
  const [exams, setExams] = useState<ExamWithChildResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const list = await listExams(familyId).catch(() => [] as Exam[]);
      const withResults = await Promise.all(
        list.map(async (exam) => ({
          exam,
          results: await loadExamWithResults(familyId, exam).catch(() => []),
        })),
      );
      if (cancelled) return;
      // Newest first (createdAt is a string ISO / server timestamp; missing sorts last).
      withResults.sort((a, b) =>
        (b.exam.createdAt ?? '').localeCompare(a.exam.createdAt ?? ''),
      );
      setExams(withResults);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const create = useCallback(
    async (exam: Omit<Exam, 'id' | 'createdAt'>) => {
      await createExam(familyId, exam);
      reload();
    },
    [familyId, reload],
  );

  const remove = useCallback(
    async (examId: string) => {
      await deleteExam(familyId, examId);
      reload();
    },
    [familyId, reload],
  );

  return { exams, loading, reload, create, remove };
}
