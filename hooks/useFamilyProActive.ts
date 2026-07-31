/**
 * useFamilyProActive — whether the family this device belongs to has an active
 * Parent Pro subscription. The device's family is its "practice-as" child
 * (parent device) or its own kid-device link. Reads `families/{id}.subscription`
 * live (§0.1); when active, every learning module unlocks for the child.
 *
 * This is the kid-side of the model: a kid device can't ask Apple about the
 * parent's subscription, so it learns entitlement purely from Firestore.
 *
 * Offline: the live read can't reach the server, so we SEED from (and fall back
 * to) a locally-cached last-known value — a family-subscribed kid stays unlocked
 * offline, even on a cold start. Grant-only: a listener error never locks a kid
 * that was granted; we just hold the last-known state until the server answers.
 */
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '../lib/firebase';
import { familyProCacheStore } from '../lib/storage';
import { useActiveChild } from './useActiveChild';
import { useFamilyLink } from './useFamilyLink';

/** True unless a string `expiresAt` is in the past. */
function notExpired(expiresAt: unknown): boolean {
  return (
    typeof expiresAt !== 'string' || Date.now() < new Date(expiresAt).getTime()
  );
}

export function useFamilyProActive(explicitFamilyId?: string | null): boolean {
  const { activeChild } = useActiveChild();
  const { link } = useFamilyLink();
  // A signed-in parent passes their own family id explicitly (for the gate); a
  // kid/practice-as device derives it from its link.
  const familyId =
    explicitFamilyId ?? activeChild?.familyId ?? link?.familyId ?? null;
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!familyId) {
      setActive(false);
      return;
    }
    let cancelled = false;

    // Seed from the cached last-known state so an offline (cold-start) kid keeps
    // its family unlock until — or unless — the server says otherwise.
    void familyProCacheStore.get().then((cached) => {
      if (cancelled || !cached || cached.familyId !== familyId) return;
      setActive(cached.active && notExpired(cached.expiresAt));
    });

    const unsub = onSnapshot(
      doc(db, 'families', familyId),
      (snap) => {
        const sub = snap.data()?.subscription as
          | { active?: unknown; expiresAt?: unknown }
          | undefined;
        const activeFlag = sub?.active === true;
        const expiresAt =
          typeof sub?.expiresAt === 'string' ? sub.expiresAt : null;
        // Access holds until expiresAt (cancel ≠ immediate revoke).
        setActive(activeFlag && notExpired(expiresAt));
        // Persist the fresh value for offline use next time.
        void familyProCacheStore.set({ familyId, active: activeFlag, expiresAt });
      },
      () => {
        // Offline / permission hiccup → hold the last-known (seeded) state
        // rather than locking a kid that was legitimately granted.
      },
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [familyId]);

  return active;
}
