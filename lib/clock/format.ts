/** Pure formatting + geometry helpers for the Clock module. */
import type { ClockPhrase, ClockTime } from './types';

/** "6:30", "9:05" — the digital answer format. */
export function formatDigital({ hour, minute }: ClockTime): string {
  return `${hour}:${minute.toString().padStart(2, '0')}`;
}

/** The next hour on a 12-hour face (12 → 1). */
function nextHour(hour: number): number {
  return hour === 12 ? 1 : hour + 1;
}

/**
 * Structured spoken phrase for a time. Language-neutral — the view layer turns
 * `kind` + numbers into localized word tiles ("half past six", "las seis y
 * media", …). "to" phrases name the *next* hour (8:50 → ten to nine).
 */
export function clockPhrase({ hour, minute }: ClockTime): ClockPhrase {
  if (minute === 0) return { kind: 'oclock', hour };
  if (minute === 15) return { kind: 'quarterPast', hour };
  if (minute === 30) return { kind: 'half', hour };
  if (minute === 45) return { kind: 'quarterTo', hour: nextHour(hour) };
  if (minute < 30) return { kind: 'past', minutes: minute, hour };
  return { kind: 'to', minutes: 60 - minute, hour: nextHour(hour) };
}

/**
 * Hand angles in degrees, clockwise from 12 o'clock. The hour hand is
 * "realistic" — it drifts between the numbers as the minutes pass (6:30 sits
 * halfway between 6 and 7), the most common thing kids get wrong.
 */
export function handAngles({ hour, minute }: ClockTime): {
  hour: number;
  minute: number;
} {
  return {
    minute: minute * 6, // 360° / 60
    hour: (hour % 12) * 30 + minute * 0.5, // 30°/hour + drift within the hour
  };
}

/** Cartesian point on the clock for an angle (deg clockwise from 12 o'clock). */
export function pointOnClock(
  center: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: center + radius * Math.sin(rad),
    y: center - radius * Math.cos(rad),
  };
}
