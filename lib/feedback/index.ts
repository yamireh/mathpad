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
const TICK_PLAYER = createAudioPlayer(require('../../assets/sounds/tick.wav'));
// Two copies of the pencil loop, played in a ping-pong crossfade so there's no
// audible seam at the loop point (native `loop` clicks; this overlaps instead).
const SCRATCH_A = createAudioPlayer(require('../../assets/sounds/scratch.wav'));
const SCRATCH_B = createAudioPlayer(require('../../assets/sounds/scratch.wav'));
/* eslint-enable @typescript-eslint/no-require-imports */

PRIMARY_PLAYER.volume = 0.8;
SUCCESS_PLAYER.volume = 0.9;
ERROR_PLAYER.volume = 0.9;
TICK_PLAYER.volume = 0.5;
SCRATCH_A.volume = 0;
SCRATCH_B.volume = 0;

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

/**
 * Soft "selection changed" tick — the iOS picker-wheel feel. For each step as a
 * clock hand snaps to a new position.
 */
export function tickFeedback(): void {
  void Haptics.selectionAsync();
  blip(TICK_PLAYER);
}

/* -------------------------------------------------------------------------- */
/* Looping pencil "scratch" sound (gapless ping-pong loop)                      */
/* -------------------------------------------------------------------------- */

// We hand-loop two players instead of using native `loop`: when the leading
// copy nears its end, we start the standby copy from 0 so its head overlaps the
// leader's tail, masking the seam, then hand over leadership. Result: the loop
// "just keeps playing" with no perceptible cut.
const SCRATCH_FADE_MS = 130; // how early to start the overlap before the seam
const SCRATCH_TICK_MS = 25; // playhead poll cadence

let scratchActive = false;
let scratchTarget = 0; // desired volume while active (1 audible, 0 muted)
let scratchLead: AudioPlayer = SCRATCH_A;
let scratchStandby: AudioPlayer = SCRATCH_B;
let scratchTimer: ReturnType<typeof setInterval> | null = null;

function scratchTick(): void {
  if (!scratchActive) return;
  const lead = scratchLead;
  try {
    if (!lead.isLoaded) return;
    const dur = lead.duration ?? 0;
    const nearSeam = dur > 0 && (dur - lead.currentTime) * 1000 <= SCRATCH_FADE_MS;
    // Hand off when the leader is about to end (overlap) or already stopped
    // (recovery if a tick was missed) — whichever comes first.
    if ((nearSeam || !lead.playing) && !scratchStandby.playing) {
      scratchStandby.seekTo(0);
      scratchStandby.volume = scratchTarget;
      scratchStandby.play();
      scratchLead = scratchStandby;
      scratchStandby = lead;
    }
  } catch {
    /* not ready — next tick retries */
  }
}

/** Make the looped pencil sound audible (starting the loop if idle). */
export function scratchAudible(): void {
  scratchTarget = 1;
  try {
    scratchLead.volume = 1;
    if (scratchStandby.playing) scratchStandby.volume = 1;
    if (!scratchActive) {
      scratchActive = true;
      scratchLead.seekTo(0);
      scratchLead.play();
      scratchTimer = setInterval(scratchTick, SCRATCH_TICK_MS);
    } else if (!scratchLead.playing) {
      scratchLead.play();
    }
  } catch {
    // Not ready yet — the next call retries.
  }
}

/** Silence the loop without stopping it, so resuming is seamless. */
export function scratchMute(): void {
  scratchTarget = 0;
  try {
    SCRATCH_A.volume = 0;
    SCRATCH_B.volume = 0;
  } catch {
    /* not ready */
  }
}

/** Silence and pause the loop entirely (end of stroke / end of solve). */
export function scratchStop(): void {
  scratchActive = false;
  scratchTarget = 0;
  if (scratchTimer) {
    clearInterval(scratchTimer);
    scratchTimer = null;
  }
  try {
    SCRATCH_A.pause();
    SCRATCH_A.volume = 0;
    SCRATCH_B.pause();
    SCRATCH_B.volume = 0;
  } catch {
    /* not ready */
  }
}
