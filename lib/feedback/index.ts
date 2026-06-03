/**
 * Tactile + audio feedback for UI interactions.
 *
 * Wraps `expo-haptics` and `expo-audio` so callers don't have to think
 * about the right intensity for each context — pass a semantic name
 * (`tap`, `primary`, `success`, `error`) and the right hit goes out.
 * All calls are fire-and-forget; haptics no-op on devices that don't
 * support them, and audio is restarted from the beginning on every call
 * so rapid taps don't queue up.
 */
import * as Haptics from 'expo-haptics';
import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
} from 'expo-audio';

// Activate and configure the iOS audio session once at module load.
// Without this, the session deactivates between plays and the first play
// of each player (or after any idle gap) is delayed by activation latency,
// and the scratch sound can be drowned out by the short SFX players.
void setAudioModeAsync({
  playsInSilentMode: true,
  allowsRecording: false,
  interruptionMode: 'mixWithOthers',
  shouldPlayInBackground: false,
});
void setIsAudioActiveAsync(true);

/* eslint-disable @typescript-eslint/no-require-imports */
const PRIMARY_PLAYER = createAudioPlayer(require('../../assets/sounds/primary.m4a'));
const SUCCESS_PLAYER = createAudioPlayer(require('../../assets/sounds/success.mp3'));
const ERROR_PLAYER = createAudioPlayer(require('../../assets/sounds/error.mp3'));
const SCRATCH_PLAYER = createAudioPlayer(require('../../assets/sounds/scratch.wav'));
/* eslint-enable @typescript-eslint/no-require-imports */

PRIMARY_PLAYER.volume = 0.8;
SUCCESS_PLAYER.volume = 0.9;
ERROR_PLAYER.volume = 0.9;
// Looped pencil sound for the auto-solve demo. Warm at module load (like the
// SFX above) so the first solve after opening a question isn't a cold start.
SCRATCH_PLAYER.loop = true;
SCRATCH_PLAYER.volume = 0;

function blip(player: AudioPlayer): void {
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // expo-audio can throw before the source is ready; the next call retries.
  }
}

/**
 * Light tap — for navigation and small interactions: Next, Back,
 * choosing a chip, opening a writing pad cell.
 */
export function tapFeedback(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // Audio disabled — re-add a blip() once a tap sound is chosen.
}

/**
 * Solid bump — for primary actions: Start Practice, Finish session,
 * answer pad's Done.
 */
export function primaryFeedback(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  blip(PRIMARY_PLAYER);
}

/** Three-tone success bump — for correct answers / session finish. */
export function successFeedback(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  blip(SUCCESS_PLAYER);
}

/** Quick error bump — for wrong answers. */
export function errorFeedback(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  blip(ERROR_PLAYER);
}

/* -------------------------------------------------------------------------- */
/* Demo "scratch" (auto-solve hand writing)                                    */
/* -------------------------------------------------------------------------- */

/** Make the looped pencil sound audible (starting the loop if idle). */
export function scratchAudible(): void {
  try {
    if (!SCRATCH_PLAYER.playing) SCRATCH_PLAYER.play();
    SCRATCH_PLAYER.volume = 1;
  } catch {
    // Not ready yet — the next call retries.
  }
}

/** Silence the pencil loop without stopping it (between digits). */
export function scratchMute(): void {
  try {
    SCRATCH_PLAYER.volume = 0;
  } catch {
    /* not ready */
  }
}

/** Silence and pause the pencil loop (end of solve). */
export function scratchStop(): void {
  try {
    SCRATCH_PLAYER.volume = 0;
    SCRATCH_PLAYER.pause();
  } catch {
    /* not ready */
  }
}
