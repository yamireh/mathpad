/**
 * Parent Pro subscription — pure entitlement logic (trial windows + active
 * state). Kept separate from the StoreKit/cache side-effects so it's testable.
 * A parent is "Pro" while they hold an active paid subscription OR are inside
 * the free-trial window that began when they first subscribed.
 */
import type { ParentProData } from './storage';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Epoch ms when the free trial ends (given when it started + its length). */
export function trialEndsAt(startedAt: string, trialDays: number): number {
  return new Date(startedAt).getTime() + trialDays * DAY_MS;
}

/** Whether the free trial is currently running. */
export function isTrialActive(
  data: ParentProData,
  trialDays: number,
  now: number,
): boolean {
  if (!data.trialStartedAt || trialDays <= 0) return false;
  return now < trialEndsAt(data.trialStartedAt, trialDays);
}

/** Whether Parent Pro is active right now (paid sub or live trial). */
export function isParentProActive(
  data: ParentProData,
  trialDays: number,
  now: number,
): boolean {
  return data.subscribed || isTrialActive(data, trialDays, now);
}

/** Whole days left in the free trial (0 once it's over or never started). */
export function trialDaysLeft(
  data: ParentProData,
  trialDays: number,
  now: number,
): number {
  if (!data.trialStartedAt || trialDays <= 0) return 0;
  const ms = trialEndsAt(data.trialStartedAt, trialDays) - now;
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}
