/**
 * useChildRewards — Parent Pro Targets & Stars state for one child.
 *
 * On mount it runs `evaluateAndAward` (parent-authoritative star granting) then
 * loads the star summary + targets. Exposes the actions the parent UI needs.
 */
import { useCallback, useEffect, useState } from 'react';

import {
  evaluateAndAward,
  loadRewardSummary,
  loadTargets,
  redeemStars,
  saveTarget,
  type RewardSummary,
  type StoredTarget,
} from '../lib/firebase/rewards';
import type { RewardTarget } from '../lib/rewards';

export interface UseChildRewardsResult {
  summary: RewardSummary;
  targets: StoredTarget[];
  loading: boolean;
  /** Reload summary + targets (and re-evaluate awards). */
  reload: () => void;
  /** Create/replace a target (one per period — the period is its id). */
  saveGoal: (target: RewardTarget) => Promise<void>;
  /** Redeem stars from the balance, logging a redemption. */
  redeem: (amount: number, byParentUid: string, note?: string) => Promise<void>;
}

const EMPTY_SUMMARY: RewardSummary = { starsLifetime: 0, starsBalance: 0 };

export function useChildRewards(
  familyId: string,
  childId: string,
): UseChildRewardsResult {
  const [summary, setSummary] = useState<RewardSummary>(EMPTY_SUMMARY);
  const [targets, setTargets] = useState<StoredTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      // Best-effort award pass first, so freshly-earned stars show on open.
      await evaluateAndAward(familyId, childId).catch(() => {});
      const [s, ts] = await Promise.all([
        loadRewardSummary(familyId, childId).catch(() => EMPTY_SUMMARY),
        loadTargets(familyId, childId).catch(() => [] as StoredTarget[]),
      ]);
      if (cancelled) return;
      setSummary(s);
      setTargets(ts);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId, childId, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const saveGoal = useCallback(
    async (target: RewardTarget) => {
      // One target per period — use the period as the doc id so setting a
      // weekly goal replaces the previous weekly goal.
      await saveTarget(familyId, childId, target.period, target);
      reload();
    },
    [familyId, childId, reload],
  );

  const redeem = useCallback(
    async (amount: number, byParentUid: string, note?: string) => {
      await redeemStars(familyId, childId, amount, byParentUid, note);
      reload();
    },
    [familyId, childId, reload],
  );

  return { summary, targets, loading, reload, saveGoal, redeem };
}
