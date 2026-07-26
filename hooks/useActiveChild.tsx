/**
 * useActiveChild — the child a family-member (parent) device is currently
 * "practicing as". Parent Pro Phase 1: a child is a family entity, not a login,
 * so a parent can pick a child profile and practice as them; the results sync to
 * that child (authorized by family membership). In-memory only — closing the app
 * returns the parent to the dashboard.
 *
 * This is distinct from `useFamilyLink` (a dedicated kid device's own identity).
 * `usePracticeIdentity` unifies the two for the practice/sync/exam code.
 */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export interface ActiveChild {
  familyId: string;
  childId: string;
  name: string;
}

interface ActiveChildContextValue {
  activeChild: ActiveChild | null;
  /** Enter "practice as" for a child profile, or null to return to the parent view. */
  setActiveChild: (child: ActiveChild | null) => void;
}

const ActiveChildContext = createContext<ActiveChildContextValue | null>(null);

export function ActiveChildProvider({ children }: { children: ReactNode }) {
  const [activeChild, setActiveChildState] = useState<ActiveChild | null>(null);
  const setActiveChild = useCallback(
    (child: ActiveChild | null) => setActiveChildState(child),
    [],
  );
  const value = useMemo(
    () => ({ activeChild, setActiveChild }),
    [activeChild, setActiveChild],
  );
  return (
    <ActiveChildContext.Provider value={value}>
      {children}
    </ActiveChildContext.Provider>
  );
}

export function useActiveChild(): ActiveChildContextValue {
  return (
    useContext(ActiveChildContext) ?? {
      activeChild: null,
      setActiveChild: () => {},
    }
  );
}
