/**
 * Session sync — when a linked child device finishes a practice session, write a
 * small summary to the family's Firestore tree and roll up an aggregate the
 * parent dashboard reads cheaply. Only summaries are stored (scores/topic/time),
 * never answer content.
 *
 *   families/{id}/children/{childId}            (rolling aggregate lives here)
 *   families/{id}/children/{childId}/sessions/{sessionId}
 *
 * `childId` is the device's (anonymous) uid — one kid device = one child. The
 * core is topic-agnostic (`SessionSyncData`): the Operations module maps its
 * SessionResult here, and Clock (or any future module) builds the same shape.
 */
import { doc, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';

import type { SessionResult } from '../../types';
import { familyLinkStore, pendingSyncStore } from '../storage';
import { isSignedInParent } from './auth';
import { db } from './index';

/** The cloud-safe, module-neutral summary of one session — no answer content. */
export interface SessionSyncData {
  /** Stable session id (the Firestore session doc id). */
  id: string;
  /** Module/operation key the dashboard groups by (e.g. 'addition', 'clock'). */
  topic: string;
  completedAt: string;
  totalQuestions: number;
  /** Correct on the first attempt (drives the accuracy stat). */
  correctFirstTry: number;
  /** Correct after any fixes. */
  finalScore: number;
  /** Wrong first, then corrected by the kid themselves. */
  corrected: number;
  /** The app filled the answer (Solve). */
  solvedWithHelp: number;
  /** Questions where a hint was used. */
  hintsUsed: number;
  durationSec: number;
}

/** Map an Operations `SessionResult` to the neutral sync shape. */
function operationsSummary(s: SessionResult): SessionSyncData {
  // Break the "help" signal into three so the parent sees the story behind the
  // final score: self-corrected after an error vs the app solving it vs a hint.
  const solvedWithHelp = s.questions.filter((q) => q.solved).length;
  const corrected = s.questions.filter(
    (q) => q.status === 'fixed' && !q.solved,
  ).length;
  const hintsUsed = s.questions.filter((q) => q.hinted).length;
  return {
    id: s.id,
    topic: s.operation,
    completedAt: s.completedAt,
    totalQuestions: s.totalQuestions,
    correctFirstTry: s.firstTryScore,
    finalScore: s.finalScore,
    corrected,
    solvedWithHelp,
    hintsUsed,
    durationSec: s.durationSeconds,
  };
}

async function writeSession(
  familyId: string,
  childId: string,
  data: SessionSyncData,
): Promise<void> {
  const { id, ...fields } = data;
  // The rolling aggregate lives ON the child document (a valid 4-segment doc);
  // individual sessions are a subcollection under it.
  const childRef = doc(db, 'families', familyId, 'children', childId);
  await setDoc(doc(childRef, 'sessions', id), {
    ...fields,
    syncedAt: serverTimestamp(),
  });
  await setDoc(
    childRef,
    {
      totalSessions: increment(1),
      totalQuestions: increment(data.totalQuestions),
      totalCorrect: increment(data.correctFirstTry),
      lastActiveAt: serverTimestamp(),
      byTopic: {
        [data.topic]: {
          sessions: increment(1),
          questions: increment(data.totalQuestions),
          correct: increment(data.correctFirstTry),
        },
      },
    },
    { merge: true },
  );
}

// One flush at a time — two concurrent flushes could push the same queued
// session twice (the aggregate increments, so that would double-count).
let flushing = false;

/**
 * Push every queued session to the cloud, removing each on success. Stops on the
 * first failure (offline / permission) and leaves the rest for the next flush.
 * A no-op when the device isn't linked to a family. Safe to call often (launch,
 * app-foreground, after each finish).
 */
export async function flushPending(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const link = await familyLinkStore.get();
    if (!link) return;
    const pending = await pendingSyncStore.list();
    for (const data of pending) {
      try {
        await writeSession(link.familyId, link.childId, data);
        await pendingSyncStore.remove(data.id);
      } catch {
        break; // offline / rejected — keep the rest queued, retry later
      }
    }
  } catch {
    // ignore — best-effort
  } finally {
    flushing = false;
  }
}

/**
 * Queue a just-finished session (any module) and try to push it now. Offline
 * friendly: the session is persisted locally first, so a failed push is retried
 * on the next flush. A no-op when the device isn't linked to a family. Enqueue
 * is idempotent by id, so calling twice for one session won't double-count.
 */
export async function maybeSync(data: SessionSyncData): Promise<void> {
  try {
    // A signed-in parent is previewing practice — don't record it as the kid's.
    if (isSignedInParent()) return;
    const link = await familyLinkStore.get();
    if (!link) return;
    await pendingSyncStore.enqueue(data);
    await flushPending();
  } catch {
    // ignore — best-effort
  }
}

/** Operations adapter: sync a just-finished `SessionResult`. */
export async function maybeSyncSession(s: SessionResult): Promise<void> {
  await maybeSync(operationsSummary(s));
}

/**
 * On first link, push existing local (Operations) history so the parent sees
 * past practice too. Runs once — skips if the child summary already exists (so
 * reconnecting doesn't double-count).
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
      await writeSession(familyId, childId, operationsSummary(s));
    }
  } catch {
    // ignore — best-effort
  }
}
