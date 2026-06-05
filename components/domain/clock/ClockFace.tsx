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
  /** Show the "count by 5" training ring (scaffold). */
  showRing?: boolean;
  /** Which hand is currently active — drawn bolder to show it's selected. */
  grabbed?: 'hour' | 'minute' | null;
}

/** Tick marks as two Skia paths: thin minute ticks + bold 5-minute ticks. */
function buildTicks(centre: number, outer: number) {
  const minor = Skia.Path.Make();
  const major = Skia.Path.Make();
  for (let i = 0; i < 60; i += 1) {
    const isMajor = i % 5 === 0;
    const o = pointOnClock(centre, outer, i * 6);
    const inner = pointOnClock(centre, outer - (isMajor ? 12 : 7), i * 6);
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
  const rimW = size * 0.045;
  const dialR = radius - rimW; // usable radius inside the rim

  const ticks = useMemo(() => buildTicks(centre, dialR - 2), [centre, dialR]);

  const a = handAngles(time);
  const gH = grabbed === 'hour' ? 1.45 : 1;
  const gM = grabbed === 'minute' ? 1.45 : 1;
  const tail = size * 0.06;
  const hourHand = arrowHandPath(
    centre, dialR * 0.56, a.hour, size * 0.03 * gH, size * 0.07 * gH, size * 0.085, tail,
  );
  const minuteHand = arrowHandPath(
    centre, dialR * 0.84, a.minute, size * 0.022 * gM, size * 0.06 * gM, size * 0.1, tail,
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
        <Path path={ticks.minor} color={clockColors.tick} style="stroke" strokeWidth={1.5} />
        <Path path={ticks.major} color={clockColors.face} style="stroke" strokeWidth={2.5} strokeCap="round" />

        <Path path={hourHand} color={clockColors.hourHand} />
        <Path path={minuteHand} color={clockColors.minuteHand} />

        <Circle cx={centre} cy={centre} r={size * 0.035} color={clockColors.face} />
        <Circle cx={centre} cy={centre} r={size * 0.016} color={clockColors.faceFill} />
      </Canvas>

      {showRing ? <ClockRing size={size} radius={dialR * 0.7} /> : null}
      <ClockNumbers size={size} radius={dialR * (showRing ? 0.5 : 0.72)} />
    </View>
  );
}
