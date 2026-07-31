/**
 * usePracticeIdentity — who the current practice is attributed to, unifying the
 * two ways a device can "be" a child (Parent Pro Phase 1):
 *
 *  - `activeChild` — a family-member (parent) device practicing as a chosen
 *    child profile. Authorized to read/write that child's data by MEMBERSHIP.
 *  - `familyLink`  — a dedicated kid device that claimed a family slot. The
 *    childId is the SLOT id; the device is authorized because its uid is stored
 *    as the slot's `deviceUid` (checked by the rules).
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
  // A dedicated kid device that claimed a slot. The childId is the slot id;
  // authorization rides on the device's uid being the slot's stored deviceUid.
  // A stale/taken-over link is cleared by useVerifyLink, so link presence (with
  // an established anon identity) is enough here.
  if (link && auth.currentUser) {
    return {
      familyId: link.familyId,
      childId: link.childId,
      name: link.name,
      viaMembership: false,
    };
  }
  return null;
}
