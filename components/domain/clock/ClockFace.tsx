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
  /** Which hand is currently held — drawn bolder to show it's captured. */
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

function handPath(centre: number, tip: { x: number; y: number }) {
  const path = Skia.Path.Make();
  path.moveTo(centre, centre);
  path.lineTo(tip.x, tip.y);
  return path;
}

/** A clean, friendly analog clock face. */
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

  const ticks = useMemo(
    () => buildTicks(centre, dialR - 2),
    [centre, dialR],
  );

  const a = handAngles(time);
  const hourTip = pointOnClock(centre, dialR * 0.52, a.hour);
  const minTip = pointOnClock(centre, dialR * 0.82, a.minute);
  const gH = grabbed === 'hour' ? 1.4 : 1;
  const gM = grabbed === 'minute' ? 1.4 : 1;

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

        <Path
          path={handPath(centre, hourTip)}
          color={clockColors.hourHand}
          style="stroke"
          strokeWidth={size * 0.038 * gH}
          strokeCap="round"
        />
        <Circle cx={hourTip.x} cy={hourTip.y} r={size * 0.045 * gH} color={clockColors.hourHand} />

        <Path
          path={handPath(centre, minTip)}
          color={clockColors.minuteHand}
          style="stroke"
          strokeWidth={size * 0.028 * gM}
          strokeCap="round"
        />
        <Circle cx={minTip.x} cy={minTip.y} r={size * 0.038 * gM} color={clockColors.minuteHand} />

        <Circle cx={centre} cy={centre} r={size * 0.035} color={clockColors.face} />
        <Circle cx={centre} cy={centre} r={size * 0.016} color={clockColors.faceFill} />
      </Canvas>

      {showRing ? <ClockRing size={size} radius={dialR * 0.7} /> : null}
      <ClockNumbers size={size} radius={dialR * (showRing ? 0.5 : 0.72)} />
    </View>
  );
}
