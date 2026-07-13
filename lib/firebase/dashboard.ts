/**
 * Parent-dashboard reads. Loads each child in the family with its rolling
 * summary and a few recent sessions — cheap (one summary doc + a small session
 * query per child).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';

import { getRuntimeConfig } from '../appConfig';
import { db } from './index';

export interface TopicStat {
  sessions: number;
  questions: number;
  correct: number;
}

export interface RecentSession {
  id: string;
  topic: string;
  completedAt: string;
  totalQuestions: number;
  correctFirstTry: number;
  finalScore: number;
  /** Wrong first, then corrected by the kid themselves. */
  corrected: number;
  /** The app filled the answer (Solve). */
  solvedWithHelp: number;
  /** Questions where a hint was used. */
  hintsUsed: number;
}

export interface ChildProgress {
  childId: string;
  name?: string;
  totalSessions: number;
  totalQuestions: number;
  totalCorrect: number;
  byTopic: Record<string, TopicStat>;
  recent: RecentSession[];
}

/** Every child in the family with its summary + recent sessions. */
export async function loadDashboard(familyId: string): Promise<ChildProgress[]> {
  // How many recent sessions per child to load (then group by method) — a
  // remotely-tunable cap so it stays a cheap read; safe default until fetched.
  const recentLimit = getRuntimeConfig().maxHistorySessionsPerChild;
  const children = await getDocs(
    collection(db, 'families', familyId, 'children'),
  );
  const out: ChildProgress[] = [];
  for (const child of children.docs) {
    // The rolling aggregate lives on the child doc; sessions are a subcollection.
    const sessionsSnap = await getDocs(
      query(
        collection(child.ref, 'sessions'),
        orderBy('completedAt', 'desc'),
        limit(recentLimit),
      ),
    );
    const s = (child.data() ?? {}) as Partial<ChildProgress>;
    out.push({
      childId: child.id,
      name: s.name,
      totalSessions: s.totalSessions ?? 0,
      totalQuestions: s.totalQuestions ?? 0,
      totalCorrect: s.totalCorrect ?? 0,
      byTopic: (s.byTopic as Record<string, TopicStat>) ?? {},
      recent: sessionsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          topic: data.topic,
          completedAt: data.completedAt,
          totalQuestions: data.totalQuestions,
          correctFirstTry: data.correctFirstTry,
          finalScore: data.finalScore ?? data.correctFirstTry ?? 0,
          corrected: data.corrected ?? 0,
          solvedWithHelp: data.solvedWithHelp ?? 0,
          hintsUsed: data.hintsUsed ?? 0,
        };
      }),
    });
  }
  return out;
}

/**
 * Reset one child's progress: delete every session doc and zero the rolling
 * aggregate, keeping the child's identity (name / joinedAt). Cloud-only — the
 * kid device's local history is untouched. Any family member (a parent) may do
 * this; see firestore.rules.
 */
export async function resetChild(
  familyId: string,
  childId: string,
): Promise<void> {
  const childRef = doc(db, 'families', familyId, 'children', childId);
  const sessions = await getDocs(collection(childRef, 'sessions'));
  await Promise.all(sessions.docs.map((d) => deleteDoc(d.ref)));
  // Full replace (not merge) so byTopic and lastActiveAt clear too; preserve id.
  const data = (await getDoc(childRef)).data() ?? {};
  await setDoc(childRef, {
    name: data.name ?? '',
    joinedAt: data.joinedAt ?? null,
    totalSessions: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    byTopic: {},
  });
}
