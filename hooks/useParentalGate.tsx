import { useCallback, useState } from 'react';

import { ParentalGate } from '../components/ui';

export interface UseParentalGateResult {
  /** Runs `action` only after an adult passes the gate. */
  runGated: (action: () => void) => void;
  /** The gate modal — render once in the screen (e.g. before the closing tag). */
  gate: React.ReactElement;
}

/**
 * Puts an action behind the {@link ParentalGate}. Call `runGated(action)` from
 * a button's `onPress`; the gate appears and only runs `action` once the
 * challenge is passed. Render the returned `gate` element once per screen.
 *
 * Required by Apple's Kids-category rules (guideline 1.3) in front of anything
 * that leaves the app or engages in commerce. There is deliberately no way to
 * disable or remember it — every gated action re-challenges.
 */
export function useParentalGate(): UseParentalGateResult {
  const [pending, setPending] = useState<{ run: () => void } | null>(null);

  const runGated = useCallback((action: () => void) => {
    setPending({ run: action });
  }, []);

  const handleSuccess = useCallback(() => {
    const action = pending;
    setPending(null);
    action?.run();
  }, [pending]);

  const handleCancel = useCallback(() => setPending(null), []);

  const gate = (
    <ParentalGate
      visible={pending !== null}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );

  return { runGated, gate };
}
