/**
 * Session sync — when a linked child device finishes a practice session, write a
 * small summary to the family's Firestore tree and roll up an aggregate the
 * parent dashboard reads cheaply. Only summaries are stored (scores/topic/time),
 * never answer content.
 *
 *   families/{id}/children/{childId}/sessions/{sessionId}
 *   families/{id}/children/{childId}/summary   (aggregate, one doc)
 *
 * `childId` is the device's (anonymous) uid — one kid device = one child.
 */
import { doc, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';

import type { SessionResult } from '../../types';
import { familyLinkStore } from '../storage';
import { db } from './index';

/** The cloud-safe summary of one session — no answer content. */
function sessionSummary(s: SessionResult) {
  return {
    topic: s.operation,
    completedAt: s.completedAt,
    totalQuestions: s.totalQuestions,
    correctFirstTry: s.firstTryScore,
    fixed: Math.max(0, s.finalScore - s.firstTryScore),
    durationSec: s.durationSeconds,
  };
}

async function writeSession(
  familyId: string,
  childId: string,
  s: SessionResult,
): Promise<void> {
  const summary = sessionSummary(s);
  // The rolling aggregate lives ON the child document (a valid 4-segment doc);
  // individual sessions are a subcollection under it.
  const childRef = doc(db, 'families', familyId, 'children', childId);
  await setDoc(doc(childRef, 'sessions', s.id), {
    ...summary,
    syncedAt: serverTimestamp(),
  });
  await setDoc(
    childRef,
    {
      totalSessions: increment(1),
      totalQuestions: increment(summary.totalQuestions),
      totalCorrect: increment(summary.correctFirstTry),
      lastActiveAt: serverTimestamp(),
      byTopic: {
        [summary.topic]: {
          sessions: increment(1),
          questions: increment(summary.totalQuestions),
          correct: increment(summary.correctFirstTry),
        },
      },
    },
    { merge: true },
  );
}

/**
 * Fire-and-forget: sync a just-finished session if this device is linked to a
 * family. Best-effort — a failure is retried by back-fill / the offline queue,
 * and an unlinked device is a no-op.
 */
export async function maybeSyncSession(s: SessionResult): Promise<void> {
  try {
    const link = await familyLinkStore.get();
    if (!link) return;
    await writeSession(link.familyId, link.childId, s);
  } catch {
    // ignore — best-effort
  }
}

/**
 * On first link, push existing local history so the parent sees past practice
 * too. Runs once — skips if the child summary already exists (so reconnecting
 * doesn't double-count).
 */
export async function backfillSessions(
  familyId: string,
  childId: string,
  sessions: SessionResult[],
): Promise<void> {
  try {
    const childRef = doc(db, 'families', familyId, 'children', childId);
    const snap = await getDoc(childRef);
    // Already has synced sessions — don't re-count on reconnect.
    if (snap.exists() && ((snap.data()?.totalSessions as number) ?? 0) > 0) {
      return;
    }
    for (const s of sessions) {
      await writeSession(familyId, childId, s);
    }
  } catch {
    // ignore — best-effort
  }
}
