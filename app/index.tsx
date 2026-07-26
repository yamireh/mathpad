import { MainPanel, ParentPanel } from '../components/panels';
import { useActiveChild, useDeviceRole } from '../hooks';

/**
 * Root route. Renders the home for this device's role directly (no navigation),
 * so changing the role reactively swaps screens: parent devices get the parent
 * area, everyone else the kid topic chooser. The first-run role picker is the
 * overlay in `_layout`; while the role is still loading we render nothing to
 * avoid flashing the wrong home.
 *
 * A parent who's "practicing as" a child (activeChild set) sees the kid practice
 * home instead of the dashboard — Parent Pro Phase 1.
 */
export default function HomeScreen() {
  const { hydrated, role } = useDeviceRole();
  const { activeChild } = useActiveChild();
  if (!hydrated) return null;
  if (role === 'parent' && !activeChild) return <ParentPanel />;
  return <MainPanel />;
}
