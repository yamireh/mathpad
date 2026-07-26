/**
 * usePracticeIdentity — who the current practice is attributed to, unifying the
 * two ways a device can "be" a child (Parent Pro Phase 1):
 *
 *  - `activeChild` — a family-member (parent) device practicing as a chosen
 *    child profile. Authorized to read/write that child's data by MEMBERSHIP.
 *  - `familyLink`  — a dedicated kid device's own identity (its anonymous uid IS
 *    the childId). Authorized because `uid() == childId`.
 *
 * Returns null when the device isn't practicing as anyone (a plain kid device
 * that never linked, or a parent in dashboard mode).
 */
import { auth } from '../lib/firebase';
import { useActiveChild } from './useActiveChild';
import { useFamilyLink } from './useFamilyLink';

export interface PracticeIdentity {
  familyId: string;
  childId: string;
  name?: string;
  /** Authorized via family membership (parent-as-child) vs the device's own uid. */
  viaMembership: boolean;
}

export function usePracticeIdentity(): PracticeIdentity | null {
  const { activeChild } = useActiveChild();
  const { link } = useFamilyLink();

  // A parent practicing as a selected child wins — it's an explicit choice.
  if (activeChild) {
    return {
      familyId: activeChild.familyId,
      childId: activeChild.childId,
      name: activeChild.name,
      viaMembership: true,
    };
  }
  // A dedicated kid device: only when the current auth uid IS its childId (its
  // own anonymous identity), otherwise it's a stale/mismatched link.
  if (link && auth.currentUser?.uid === link.childId) {
    return {
      familyId: link.familyId,
      childId: link.childId,
      name: link.name,
      viaMembership: false,
    };
  }
  return null;
}
