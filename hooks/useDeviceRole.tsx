import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { type DeviceRole, deviceRoleStore } from '../lib/storage';

export interface DeviceRoleContextValue {
  /** Whether the persisted role has loaded — gate UI on this to avoid a flash. */
  hydrated: boolean;
  /** 'unset' until the first-run picker is answered. */
  role: DeviceRole;
  setRole: (role: DeviceRole) => void;
}

// Safe default for consuming the hook outside a provider (isolated screen
// tests, or any un-wrapped render path): treat it as hydrated with an unset
// role so the root route degrades to the normal kid home instead of a blank
// screen. The real provider starts un-hydrated and flips true once storage
// loads, which is what prevents the first-launch flash.
const DeviceRoleContext = createContext<DeviceRoleContextValue>({
  hydrated: true,
  role: 'unset',
  setRole: () => {},
});

/**
 * Holds this device's Parent-Mode role ('unset' | 'child' | 'parent'), chosen
 * once on first run and persisted locally. 'unset' drives the first-run role
 * picker; 'child' is the normal practice app; 'parent' routes to the parent
 * area. (The parent's cloud *account* comes later — this is just the local
 * device preference.)
 */
export function DeviceRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<DeviceRole>('unset');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await deviceRoleStore.get();
      if (cancelled) return;
      setRoleState(stored);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setRole = useCallback((next: DeviceRole) => {
    setRoleState(next);
    void deviceRoleStore.set(next);
  }, []);

  const value = useMemo(
    () => ({ hydrated, role, setRole }),
    [hydrated, role, setRole],
  );

  return (
    <DeviceRoleContext.Provider value={value}>
      {children}
    </DeviceRoleContext.Provider>
  );
}

export function useDeviceRole(): DeviceRoleContextValue {
  return useContext(DeviceRoleContext);
}
