import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { clockColors } from '../../../constants/design';
import { handAngles, pointOnClock, type ClockTime } from '../../../lib/clock';
import { ClockNumbers } from './ClockNumbers';
import { ClockRing } from './ClockRing';

export interface ClockFaceProps {
  /** The time the hands point to. */
  time: ClockTime;
  /** Square edge length in px. */
  size: number;
  /** Show the "count by 5" minute numbers (scaffold). */
  showRing?: boolean;
  /** Which hand is currently active — drawn bolder to show it's selected. */
  grabbed?: 'hour' | 'minute' | null;
}

/**
 * Tick marks: thin light minute ticks, plus bolder, longer hour ticks (every
 * 5). Returned as two paths so each can be stroked differently.
 */
function buildTicks(
  centre: number,
  outer: number,
  majorLen: number,
  minorLen: number,
) {
  const minor = Skia.Path.Make();
  const major = Skia.Path.Make();
  for (let i = 0; i < 60; i += 1) {
    const isMajor = i % 5 === 0;
    const o = pointOnClock(centre, outer, i * 6);
    const inner = pointOnClock(centre, outer - (isMajor ? majorLen : minorLen), i * 6);
    const path = isMajor ? major : minor;
    path.moveTo(o.x, o.y);
    path.lineTo(inner.x, inner.y);
  }
  return { minor, major };
}

/** A filled hand: a slim body with a counterweight tail and a sharp arrowhead. */
function arrowHandPath(
  centre: number,
  length: number,
  angleDeg: number,
  bodyW: number,
  headW: number,
  headLen: number,
  tailLen: number,
) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad); // outward unit vector
  const px = Math.cos(rad);
  const py = Math.sin(rad); // perpendicular unit vector
  const at = (dist: number, off: number): [number, number] => [
    centre + dx * dist + px * off,
    centre + dy * dist + py * off,
  ];
  const bodyEnd = length - headLen;
  const bh = bodyW / 2;
  const hh = headW / 2;
  const path = Skia.Path.Make();
  const pts: [number, number][] = [
    at(-tailLen, bh),
    at(bodyEnd, bh),
    at(bodyEnd, hh),
    at(length, 0), // sharp tip
    at(bodyEnd, -hh),
    at(bodyEnd, -bh),
    at(-tailLen, -bh),
  ];
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) path.lineTo(pts[i][0], pts[i][1]);
  path.close();
  return path;
}

/** A clean, friendly analog clock face with sharp-tipped arrow hands. */
export function ClockFace({
  time,
  size,
  showRing = false,
  grabbed = null,
}: ClockFaceProps) {
  const centre = size / 2;
  const radius = size / 2;
  const rimW = size * 0.035;
  const dialR = radius - rimW; // usable radius inside the rim

  // Rings from the rim inward: minute numbers → ticks → hour numbers.
  const ticksOuter = dialR * 0.84;
  const ticks = useMemo(
    () => buildTicks(centre, ticksOuter, dialR * 0.08, dialR * 0.05),
    [centre, ticksOuter, dialR],
  );

  const a = handAngles(time);
  const gH = grabbed === 'hour' ? 1.15 : 1;
  const gM = grabbed === 'minute' ? 1.15 : 1;
  const tail = size * 0.06;
  const hourHand = arrowHandPath(
    centre, dialR * 0.5, a.hour, size * 0.022 * gH, size * 0.06 * gH, size * 0.08, tail,
  );
  const minuteHand = arrowHandPath(
    centre, dialR * 0.72, a.minute, size * 0.022 * gM, size * 0.06 * gM, size * 0.09, tail,
  );

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={centre} cy={centre} r={radius - 2} color={clockColors.faceFill} />
        <Circle
          cx={centre}
          cy={centre}
          r={radius - rimW / 2 - 2}
          color={clockColors.rim}
          style="stroke"
          strokeWidth={rimW}
        />
        <Path path={ticks.minor} color={clockColors.tick} style="stroke" strokeWidth={1.5} strokeCap="round" />
        <Path path={ticks.major} color={clockColors.face} style="stroke" strokeWidth={3.5} strokeCap="round" />

        <Path path={hourHand} color={clockColors.hourHand} />
        <Path path={minuteHand} color={clockColors.minuteHand} />

        <Circle cx={centre} cy={centre} r={size * 0.032} color={clockColors.face} />
        <Circle cx={centre} cy={centre} r={size * 0.014} color={clockColors.faceFill} />
      </Canvas>

      {showRing ? <ClockRing size={size} radius={dialR * 0.92} /> : null}
      <ClockNumbers size={size} radius={dialR * 0.68} />
    </View>
  );
}
