/**
 * Looping "scratch" pencil sound for the scratch canvas. A thin wrapper over
 * the gapless ping-pong loop engine in `lib/feedback` (two crossfaded copies,
 * so the loop never has an audible cut):
 *  - `audible()` on finger movement → unmute / start the loop,
 *  - `mute()` when the finger pauses → silence but keep looping (seamless resume),
 *  - `release()` on touch-up → stop the loop.
 */
import { useEffect } from 'react';

import { scratchAudible, scratchMute, scratchStop } from '../lib/feedback';

export interface ScratchSoundHandle {
  /** Touch-down. (No-op: the loop starts on first movement.) */
  arm: () => void;
  /** Movement: make the loop audible. */
  audible: () => void;
  /** Idle / stop moving: mute without stopping (seamless resume). */
  mute: () => void;
  /** Touch-up: stop the loop. */
  release: () => void;
}

/** Master switch for the pencil sound while writing. Off for now. */
const SCRATCH_SOUND_ENABLED = false;

const HANDLE: ScratchSoundHandle = {
  arm: () => {},
  audible: scratchAudible,
  mute: scratchMute,
  release: scratchStop,
};

const NOOP_HANDLE: ScratchSoundHandle = {
  arm: () => {},
  audible: () => {},
  mute: () => {},
  release: () => {},
};

export function useScratchSound(): ScratchSoundHandle {
  // Make sure the loop is silenced if the canvas unmounts mid-stroke.
  useEffect(() => {
    if (!SCRATCH_SOUND_ENABLED) return;
    return () => scratchStop();
  }, []);

  return SCRATCH_SOUND_ENABLED ? HANDLE : NOOP_HANDLE;
}
