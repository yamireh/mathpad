/**
 * useFamilyProActive — whether the family this device belongs to has an active
 * Parent Pro subscription. The device's family is its "practice-as" child
 * (parent device) or its own kid-device link. Reads `families/{id}.subscription`
 * live (§0.1); when active, every learning module unlocks for the child.
 *
 * This is the kid-side of the model: a kid device can't ask Apple about the
 * parent's subscription, so it learns entitlement purely from Firestore.
 */
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '../lib/firebase';
import { useActiveChild } from './useActiveChild';
import { useFamilyLink } from './useFamilyLink';

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
    const unsub = onSnapshot(
      doc(db, 'families', familyId),
      (snap) => {
        const sub = snap.data()?.subscription as
          | { active?: unknown; expiresAt?: unknown }
          | undefined;
        // Access holds until expiresAt (cancel ≠ immediate revoke). A missing
        // /non-string expiresAt means "no expiry known" → the active flag rules.
        const notExpired =
          typeof sub?.expiresAt !== 'string' ||
          Date.now() < new Date(sub.expiresAt).getTime();
        setActive(sub?.active === true && notExpired);
      },
      () => setActive(false), // offline / permission hiccup → don't grant
    );
    return () => unsub();
  }, [familyId]);

  return active;
}
