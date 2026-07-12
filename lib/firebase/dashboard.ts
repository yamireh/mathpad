/**
 * Parent-dashboard reads. Loads each child in the family with its rolling
 * summary and a few recent sessions — cheap (one summary doc + a small session
 * query per child).
 */
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

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
  fixed: number;
}

export interface ChildProgress {
  childId: string;
  totalSessions: number;
  totalQuestions: number;
  totalCorrect: number;
  byTopic: Record<string, TopicStat>;
  recent: RecentSession[];
}

const RECENT_LIMIT = 5;

/** Every child in the family with its summary + recent sessions. */
export async function loadDashboard(familyId: string): Promise<ChildProgress[]> {
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
        limit(RECENT_LIMIT),
      ),
    );
    const s = (child.data() ?? {}) as Partial<ChildProgress>;
    out.push({
      childId: child.id,
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
          fixed: data.fixed ?? 0,
        };
      }),
    });
  }
  return out;
}
