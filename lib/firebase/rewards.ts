/**
 * Parent Pro — Targets & Stars: Firestore layer.
 *
 * Reads/writes the reward docs and runs the (pure) award evaluation against
 * Firestore. Everything lives in **subcollections of the child doc** so a
 * progress reset (`resetChild`, which replaces the child doc + deletes its
 * `sessions`) never wipes earned stars:
 *
 *   children/{cid}/targets/{targetId}      the goals a parent set
 *   children/{cid}/rewards/summary         { starsLifetime, starsBalance }
 *   children/{cid}/awards/{windowKey}      idempotency ledger (doc id = window key)
 *   children/{cid}/redemptions/{id}        redemption history
 *
 * See `docs/parent-pro-targets-stars.md`.
 */
import {
  collection,
  deleteDoc,
  doc,
  type DocumentReference,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from './index';
import {
  evaluateAwards,
  type RewardTarget,
  type SessionLike,
} from '../rewards';

/**
 * How far back to load sessions when evaluating awards. Covers a few weekly and
 * monthly windows for catch-up; windows older than this won't retroactively
 * award if a parent never opened the dashboard in that span (acceptable — see
 * the spec). Awarding stays idempotent regardless.
 */
const LOOKBACK_DAYS = 92;

/** Star counters for a child. */
export interface RewardSummary {
  starsLifetime: number;
  starsBalance: number;
}

/** A target with its Firestore doc id. */
export type StoredTarget = RewardTarget & { id: string };

/** A redemption event. */
export interface Redemption {
  id: string;
  amount: number;
  note?: string;
  byParentUid: string;
}

function childRef(familyId: string, childId: string): DocumentReference {
  return doc(db, 'families', familyId, 'children', childId);
}

/* -------------------------------------------------------------------------- */
/* Targets                                                                     */
/* -------------------------------------------------------------------------- */

export async function loadTargets(
  familyId: string,
  childId: string,
): Promise<StoredTarget[]> {
  const snap = await getDocs(collection(childRef(familyId, childId), 'targets'));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as RewardTarget) }));
}

/** Create or replace a target. Undefined optional fields are omitted (Firestore rejects `undefined`). */
export async function saveTarget(
  familyId: string,
  childId: string,
  targetId: string,
  target: RewardTarget,
): Promise<void> {
  const payload: Record<string, unknown> = {
    period: target.period,
    goal: {
      total: target.goal.total,
      ...(target.goal.byTopic ? { byTopic: target.goal.byTopic } : {}),
    },
    active: target.active,
    ...(target.weekStart !== undefined ? { weekStart: target.weekStart } : {}),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(childRef(familyId, childId), 'targets', targetId), payload, {
    merge: true,
  });
}

export async function deleteTarget(
  familyId: string,
  childId: string,
  targetId: string,
): Promise<void> {
  await deleteDoc(doc(childRef(familyId, childId), 'targets', targetId));
}

/* -------------------------------------------------------------------------- */
/* Stars: summary, redemptions                                                 */
/* -------------------------------------------------------------------------- */

export async function loadRewardSummary(
  familyId: string,
  childId: string,
): Promise<RewardSummary> {
  const snap = await getDoc(doc(childRef(familyId, childId), 'rewards', 'summary'));
  const data = snap.data() ?? {};
  return {
    starsLifetime: (data.starsLifetime as number) ?? 0,
    starsBalance: (data.starsBalance as number) ?? 0,
  };
}

export async function loadRedemptions(
  familyId: string,
  childId: string,
): Promise<Redemption[]> {
  const snap = await getDocs(
    collection(childRef(familyId, childId), 'redemptions'),
  );
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      amount: (x.amount as number) ?? 0,
      note: x.note as string | undefined,
      byParentUid: (x.byParentUid as string) ?? '',
    };
  });
}

/**
 * Redeem stars: decrement the balance and log a redemption. `starsLifetime` is
 * never touched (it's the history / all-time number). Clamps to the current
 * balance so it can't go negative.
 */
export async function redeemStars(
  familyId: string,
  childId: string,
  amount: number,
  byParentUid: string,
  note?: string,
): Promise<void> {
  const ref = childRef(familyId, childId);
  const { starsBalance } = await loadRewardSummary(familyId, childId);
  const spend = Math.max(0, Math.min(amount, starsBalance));
  if (spend <= 0) return;
  const batch = writeBatch(db);
  batch.set(
    doc(ref, 'rewards', 'summary'),
    { starsBalance: increment(-spend) },
    { merge: true },
  );
  batch.set(doc(collection(ref, 'redemptions')), {
    amount: spend,
    byParentUid,
    ...(note ? { note } : {}),
    at: serverTimestamp(),
  });
  await batch.commit();
}

/* -------------------------------------------------------------------------- */
/* Evaluation (parent-authoritative)                                           */
/* -------------------------------------------------------------------------- */

/**
 * Evaluate the child's active targets against recent sessions and grant any
 * newly-earned stars. Idempotent (an `awards/{windowKey}` doc gates each grant).
 * Returns the number of stars awarded this run. Call on parent dashboard open.
 */
export async function evaluateAndAward(
  familyId: string,
  childId: string,
): Promise<number> {
  const ref = childRef(familyId, childId);

  const targetsSnap = await getDocs(collection(ref, 'targets'));
  const targets = targetsSnap.docs
    .map((d) => d.data() as RewardTarget)
    .filter((t) => t.active);
  if (targets.length === 0) return 0;

  const now = new Date();
  const since = new Date(
    now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  // completedAt is stored ISO, so a string range query is chronological.
  const sessionsSnap = await getDocs(
    query(collection(ref, 'sessions'), where('completedAt', '>=', since)),
  );
  const sessions: SessionLike[] = sessionsSnap.docs.map((d) => {
    const x = d.data();
    return {
      topic: (x.topic as string) ?? '',
      completedAt: (x.completedAt as string) ?? '',
      totalQuestions: (x.totalQuestions as number) ?? 0,
    };
  });

  const awardsSnap = await getDocs(collection(ref, 'awards'));
  const existingKeys = new Set(awardsSnap.docs.map((d) => d.id));

  const awards = evaluateAwards({ targets, sessions, existingKeys, now });
  if (awards.length === 0) return 0;

  const batch = writeBatch(db);
  for (const a of awards) {
    batch.set(doc(ref, 'awards', a.windowKey), {
      period: a.period,
      windowStart: a.windowStart.toISOString(),
      windowEnd: a.windowEnd.toISOString(),
      goalSnapshot: a.goalSnapshot,
      progressSnapshot: a.progressSnapshot,
      awardedAt: serverTimestamp(),
    });
  }
  batch.set(
    doc(ref, 'rewards', 'summary'),
    {
      starsLifetime: increment(awards.length),
      starsBalance: increment(awards.length),
      lastEvaluatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
  return awards.length;
}

/* -------------------------------------------------------------------------- */
/* Cleanup                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Delete every reward doc under a child (targets, summary, awards, redemptions).
 * Used by `removeChild` / family deletion so no reward data is orphaned. NOT
 * called by `resetChild` — a progress reset keeps earned stars.
 */
export async function purgeChildRewards(
  child: DocumentReference,
): Promise<void> {
  for (const sub of ['targets', 'awards', 'redemptions'] as const) {
    const snap = await getDocs(collection(child, sub));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
  await deleteDoc(doc(child, 'rewards', 'summary')).catch(() => {});
}
