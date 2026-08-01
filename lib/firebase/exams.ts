/**
 * Parent Pro — Assigned Exams: Firestore layer.
 *
 *   families/{fid}/exams/{examId}                       parent-authored exams
 *   families/{fid}/children/{cid}/examResults/{examId}  a child's submission
 *
 * Exams are family-level (a kid queries the ones assigned to them; a parent sees
 * all they created). Results live under the child, like sessions. See
 * `docs/parent-pro-exams.md`.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  type DocumentReference,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { db } from './index';
import type { Exam, ExamResult, ExamWithResult } from '../exams';

function famRef(familyId: string) {
  return doc(db, 'families', familyId);
}

/** A Firestore Timestamp / ISO string / missing → ISO string (or ''). */
function toIso(v: unknown): string {
  if (typeof v === 'string') return v;
  const ts = v as { toDate?: () => Date } | null;
  return ts?.toDate?.().toISOString() ?? '';
}

/** Normalize a raw exam doc: its `createdAt` may be a server Timestamp. */
function toExam(id: string, data: Record<string, unknown>): Exam {
  return {
    id,
    title: (data.title as string) ?? '',
    createdBy: (data.createdBy as string) ?? '',
    assignedTo: (data.assignedTo as string[]) ?? [],
    operation: data.operation as Exam['operation'],
    settings: data.settings as Exam['settings'],
    questions: (data.questions as Exam['questions']) ?? [],
    createdAt: toIso(data.createdAt),
    ...(data.dueAt ? { dueAt: toIso(data.dueAt) } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* Authoring (parent)                                                          */
/* -------------------------------------------------------------------------- */

/** Create + assign an exam. Returns the new exam id. */
export async function createExam(
  familyId: string,
  exam: Omit<Exam, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(famRef(familyId), 'exams'), {
    title: exam.title,
    createdBy: exam.createdBy,
    assignedTo: exam.assignedTo,
    operation: exam.operation,
    settings: exam.settings,
    questions: exam.questions,
    ...(exam.dueAt ? { dueAt: exam.dueAt } : {}),
    createdAt: serverTimestamp(),
  });
  // Offline persistence resolves the write from the LOCAL cache even when the
  // server later rejects it (e.g. rules) — so confirm it actually persisted by
  // reading it back FROM THE SERVER. Throws a clear error if it didn't.
  const onServer = await getDocFromServer(ref);
  if (!onServer.exists()) {
    throw new Error(
      'Exam did not persist to the server — the write was rejected (check the deployed Firestore rules for /exams).',
    );
  }
  return ref.id;
}

export async function deleteExam(
  familyId: string,
  examId: string,
): Promise<void> {
  await deleteDoc(doc(famRef(familyId), 'exams', examId));
}

/** All exams in the family (parent view), newest activity first is up to callers. */
export async function listExams(familyId: string): Promise<Exam[]> {
  const snap = await getDocs(collection(famRef(familyId), 'exams'));
  return snap.docs.map((d) => toExam(d.id, d.data()));
}

/* -------------------------------------------------------------------------- */
/* Child                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Exams assigned to a child that they haven't submitted yet (pending), each
 * paired with a null result. Loads the child's result ids once and filters.
 */
export async function listPendingExamsForChild(
  familyId: string,
  childId: string,
): Promise<Exam[]> {
  const examsSnap = await getDocs(
    query(
      collection(famRef(familyId), 'exams'),
      where('assignedTo', 'array-contains', childId),
    ),
  );
  const resultsSnap = await getDocs(
    collection(famRef(familyId), 'children', childId, 'examResults'),
  );
  const done = new Set(resultsSnap.docs.map((d) => d.id));
  return examsSnap.docs
    .filter((d) => !done.has(d.id))
    .map((d) => toExam(d.id, d.data()));
}

/**
 * Live version of {@link listPendingExamsForChild}: keeps the kid's home in sync
 * in real time. Two listeners (assigned exams + this child's submissions); the
 * pending list = assigned minus submitted, recomputed on any change. Firestore
 * latency-compensates the device's own write, so a just-finished exam drops off
 * instantly (no navigate-away-and-back) and a newly-assigned one appears live.
 * Returns an unsubscribe.
 */
export function listenPendingExamsForChild(
  familyId: string,
  childId: string,
  onChange: (exams: Exam[]) => void,
  onError?: (e: unknown) => void,
): () => void {
  let assigned: Exam[] | null = null;
  let done: Set<string> | null = null;
  const emit = () => {
    if (assigned === null || done === null) return;
    onChange(assigned.filter((e) => !done!.has(e.id)));
  };
  const unsubExams = onSnapshot(
    query(
      collection(famRef(familyId), 'exams'),
      where('assignedTo', 'array-contains', childId),
    ),
    (snap) => {
      assigned = snap.docs.map((d) => toExam(d.id, d.data()));
      emit();
    },
    (e) => onError?.(e),
  );
  const unsubResults = onSnapshot(
    collection(famRef(familyId), 'children', childId, 'examResults'),
    (snap) => {
      done = new Set(snap.docs.map((d) => d.id));
      emit();
    },
    (e) => onError?.(e),
  );
  return () => {
    unsubExams();
    unsubResults();
  };
}

/** Submit a child's result for an exam (doc id = examId, so it's one per exam). */
export async function submitExamResult(
  familyId: string,
  childId: string,
  result: ExamResult,
): Promise<void> {
  await setDoc(
    doc(famRef(familyId), 'children', childId, 'examResults', result.examId),
    {
      examId: result.examId,
      totalQuestions: result.totalQuestions,
      finalScore: result.finalScore,
      // JSON round-trip strips any `undefined` (Firestore rejects it) from the
      // per-question results (optional hinted/solved, null submitted answers).
      questions: JSON.parse(JSON.stringify(result.questions)),
      submittedAt: serverTimestamp(),
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Results (parent)                                                            */
/* -------------------------------------------------------------------------- */

/** One child's result for an exam, or null if not submitted. */
export async function loadExamResult(
  familyId: string,
  childId: string,
  examId: string,
): Promise<ExamResult | null> {
  const snap = await getDoc(
    doc(famRef(familyId), 'children', childId, 'examResults', examId),
  );
  if (!snap.exists()) return null;
  const x = snap.data();
  return {
    examId,
    submittedAt: (x.submittedAt as { toDate?: () => Date })?.toDate?.().toISOString?.() ?? '',
    totalQuestions: (x.totalQuestions as number) ?? 0,
    finalScore: (x.finalScore as number) ?? 0,
    questions: (x.questions as ExamResult['questions']) ?? [],
  };
}

/** An exam with each assigned child's result (for the parent's exam detail). */
export async function loadExamWithResults(
  familyId: string,
  exam: Exam,
): Promise<{ childId: string; result: ExamResult | null }[]> {
  return Promise.all(
    exam.assignedTo.map(async (childId) => ({
      childId,
      result: await loadExamResult(familyId, childId, exam.id),
    })),
  );
}

/** Convenience for the child's list view: pending exams as {exam, result:null}. */
export async function pendingWithNoResult(
  familyId: string,
  childId: string,
): Promise<ExamWithResult[]> {
  const exams = await listPendingExamsForChild(familyId, childId);
  return exams.map((exam) => ({ exam, result: null }));
}

/* -------------------------------------------------------------------------- */
/* Cleanup                                                                     */
/* -------------------------------------------------------------------------- */

/** Delete a child's exam results (used on child removal / family deletion). */
export async function purgeChildExamResults(
  child: DocumentReference,
): Promise<void> {
  const snap = await getDocs(collection(child, 'examResults'));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
