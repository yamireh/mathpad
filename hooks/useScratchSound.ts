/**
 * Looping "scratch" sound. `arm()` is called on touch-down to start the
 * looped audio playing silently (volume 0). `audible()` is called on
 * every finger movement to crank the volume up; `mute()` is called when
 * the kid pauses (or releases) to drop it back to zero. `release()` is
 * called on touch-up to pause the player so it's ready for the next
 * stroke. Logs every step so we can verify the flow on-device.
 */
import { useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

export interface ScratchSoundHandle {
  /** Touch-down: start the looped audio playing silently. */
  arm: () => void;
  /** Movement: unmute. */
  audible: () => void;
  /** Idle / stop moving: mute (without stopping). */
  mute: () => void;
  /** Touch-up: pause the player. */
  release: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SCRATCH_SOURCE = require('../assets/sounds/scratch.m4a');

const FULL_VOLUME = 1.0;

export function useScratchSound(): ScratchSoundHandle {
  const player = useAudioPlayer(SCRATCH_SOURCE);
  const armedRef = useRef(false);

  useEffect(() => {
    if (!player) return;
    try {
      player.loop = true;
      player.volume = 0;
    } catch (err) {
      console.warn('[scratch-sound] setup failed', err);
    }
    return () => {
      try {
        player.pause();
      } catch {
        /* released */
      }
    };
  }, [player]);

  return {
    arm: () => {
      if (armedRef.current) return;
      armedRef.current = true;
      try {
        player.volume = 0;
        player.seekTo(0);
        player.play();
        console.log('[scratch-sound] arm — playing silently');
      } catch (err) {
        console.warn('[scratch-sound] arm failed', err);
      }
    },
    audible: () => {
      try {
        if (player.volume === FULL_VOLUME) return;
        player.volume = FULL_VOLUME;
        console.log('[scratch-sound] audible (volume=1)', {
          playing: player.playing,
          isLoaded: player.isLoaded,
        });
      } catch (err) {
        console.warn('[scratch-sound] audible failed', err);
      }
    },
    mute: () => {
      try {
        if (player.volume === 0) return;
        player.volume = 0;
        console.log('[scratch-sound] mute (volume=0)');
      } catch (err) {
        console.warn('[scratch-sound] mute failed', err);
      }
    },
    release: () => {
      if (!armedRef.current) return;
      armedRef.current = false;
      try {
        player.pause();
        console.log('[scratch-sound] release — paused');
      } catch (err) {
        console.warn('[scratch-sound] release failed', err);
      }
    },
  };
}
