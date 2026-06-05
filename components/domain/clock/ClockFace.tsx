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
}

/** Tick marks as two Skia paths: thin minute ticks + bold 5-minute ticks. */
function buildTicks(centre: number, radius: number) {
  const minor = Skia.Path.Make();
  const major = Skia.Path.Make();
  for (let i = 0; i < 60; i += 1) {
    const isMajor = i % 5 === 0;
    const outer = pointOnClock(centre, radius - 4, i * 6);
    const inner = pointOnClock(centre, radius - (isMajor ? 14 : 9), i * 6);
    const path = isMajor ? major : minor;
    path.moveTo(outer.x, outer.y);
    path.lineTo(inner.x, inner.y);
  }
  return { minor, major };
}

/** A filled "arrow" hand: a slim body with a counterweight tail and an
 *  arrowhead at the tip. */
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
  let p = at(-tailLen, bh);
  path.moveTo(p[0], p[1]);
  p = at(bodyEnd, bh);
  path.lineTo(p[0], p[1]);
  p = at(bodyEnd, hh);
  path.lineTo(p[0], p[1]);
  p = at(length, 0); // tip
  path.lineTo(p[0], p[1]);
  p = at(bodyEnd, -hh);
  path.lineTo(p[0], p[1]);
  p = at(bodyEnd, -bh);
  path.lineTo(p[0], p[1]);
  p = at(-tailLen, -bh);
  path.lineTo(p[0], p[1]);
  path.close();
  return path;
}

function buildHands(centre: number, radius: number, time: ClockTime, size: number) {
  const a = handAngles(time);
  const tail = size * 0.055;
  return {
    hour: arrowHandPath(centre, radius * 0.55, a.hour, size * 0.03, size * 0.066, size * 0.085, tail),
    minute: arrowHandPath(centre, radius * 0.82, a.minute, size * 0.022, size * 0.054, size * 0.1, tail),
  };
}

/** A clean analog clock face that the child reads. */
export function ClockFace({ time, size, showRing = false }: ClockFaceProps) {
  const centre = size / 2;
  const radius = size / 2;

  const ticks = useMemo(() => buildTicks(centre, radius), [centre, radius]);
  const hands = useMemo(
    () => buildHands(centre, radius, time, size),
    [centre, radius, time, size],
  );

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle
          cx={centre}
          cy={centre}
          r={radius - 2}
          color={clockColors.face}
          style="stroke"
          strokeWidth={3}
        />
        <Path path={ticks.minor} color={clockColors.tick} style="stroke" strokeWidth={1.5} />
        <Path path={ticks.major} color={clockColors.face} style="stroke" strokeWidth={3} strokeCap="round" />
        <Path path={hands.hour} color={clockColors.hourHand} />
        <Path path={hands.minute} color={clockColors.minuteHand} />
        <Circle cx={centre} cy={centre} r={size * 0.03} color={clockColors.face} />
      </Canvas>

      {showRing ? <ClockRing size={size} radius={radius * 0.74} /> : null}
      <ClockNumbers size={size} radius={radius * (showRing ? 0.54 : 0.74)} />
    </View>
  );
}
