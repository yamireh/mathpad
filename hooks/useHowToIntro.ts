/**
 * useHowToIntro — auto-opens a module's how-to walkthrough when the module is
 * opened, until the kid taps "Don't show again" (which persists the seen flag).
 * Call it from the module's landing/settings screen. It fires once per mount
 * (a `fired` guard), so returning from the how-to via "Got it" — which leaves
 * the landing screen mounted underneath — does NOT re-open it; only a fresh
 * entry (a new mount) does.
 */
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { shouldShowHowToIntro } from '../lib/howToIntro';

export function useHowToIntro(opts: {
  /** Stable module id, e.g. 'clock' or 'addition'. */
  id: string;
  /** How-to route to open, e.g. '/how-to/clock'. */
  path: string;
  /** Skip entirely (e.g. a module with no demo, or a parent preview). */
  enabled?: boolean;
}): void {
  const { id, path, enabled = true } = opts;
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled || fired.current) return;
    let cancelled = false;
    void (async () => {
      const show = await shouldShowHowToIntro(id);
      if (cancelled || fired.current || !show) return;
      fired.current = true;
      router.push(`${path}?intro=1`);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, path, enabled, router]);
}
