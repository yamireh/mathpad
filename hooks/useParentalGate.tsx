import { useCallback, useRef, useState } from 'react';

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
  // The gated action must run only AFTER the modal has fully dismissed — on iOS
  // you cannot present the StoreKit sheet while a modal is still animating out
  // (it silently fails). So on success we stash the action, close the modal, and
  // fire it from `onClosed` (Modal.onDismiss). A timeout backs that up in case
  // onDismiss never fires (e.g. Android); whichever runs first wins, then clears.
  const runAfterClose = useRef<(() => void) | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runGated = useCallback((action: () => void) => {
    setPending({ run: action });
  }, []);

  const flush = useCallback(() => {
    if (fallbackTimer.current) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
    const action = runAfterClose.current;
    runAfterClose.current = null;
    action?.();
  }, []);

  const handleSuccess = useCallback(() => {
    runAfterClose.current = pending?.run ?? null;
    setPending(null);
    fallbackTimer.current = setTimeout(flush, 500);
  }, [pending, flush]);

  const handleCancel = useCallback(() => {
    runAfterClose.current = null;
    setPending(null);
  }, []);

  const gate = (
    <ParentalGate
      visible={pending !== null}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      onClosed={flush}
    />
  );

  return { runGated, gate };
}
