/**
 * useTimer — a single session countdown.
 *
 * Counts down once from `totalSeconds`; fires `onExpire` exactly once at zero
 * (SPEC: timer expiry auto-submits the session). Pass `null` to disable.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseTimerResult {
  /** Whole seconds left. */
  secondsRemaining: number;
  /** Stop the countdown early (e.g. the kid finished before time). */
  stop: () => void;
}

export function useTimer(
  totalSeconds: number | null,
  onExpire: () => void,
): UseTimerResult {
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds ?? 0);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const stoppedRef = useRef(false);
  const expiredRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
  }, []);

  // Tick the countdown.
  useEffect(() => {
    if (totalSeconds === null) return;
    stoppedRef.current = false;
    expiredRef.current = false;
    setSecondsRemaining(totalSeconds);

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (stoppedRef.current) return prev;
        const next = Math.max(0, prev - 1);
        if (next === 0) clearInterval(interval);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [totalSeconds]);

  // Fire onExpire once, when the countdown reaches zero on its own.
  useEffect(() => {
    if (
      totalSeconds !== null &&
      secondsRemaining === 0 &&
      !stoppedRef.current &&
      !expiredRef.current
    ) {
      expiredRef.current = true;
      onExpireRef.current();
    }
  }, [secondsRemaining, totalSeconds]);

  return { secondsRemaining, stop };
}
