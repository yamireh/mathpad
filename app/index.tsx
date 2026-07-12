import { MainPanel, ParentPanel } from '../components/panels';
import { useDeviceRole } from '../hooks';

/**
 * Root route. Renders the home for this device's role directly (no navigation),
 * so changing the role reactively swaps screens: parent devices get the parent
 * area, everyone else the kid topic chooser. The first-run role picker is the
 * overlay in `_layout`; while the role is still loading we render nothing to
 * avoid flashing the wrong home.
 */
export default function HomeScreen() {
  const { hydrated, role } = useDeviceRole();
  if (!hydrated) return null;
  if (role === 'parent') return <ParentPanel />;
  return <MainPanel />;
}
