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
    const inner = pointOnClock(centre, radius - (isMajor ? 16 : 10), i * 6);
    const path = isMajor ? major : minor;
    path.moveTo(outer.x, outer.y);
    path.lineTo(inner.x, inner.y);
  }
  return { minor, major };
}

/** Hour + minute hands as Skia paths from the centre to each tip. */
function buildHands(centre: number, radius: number, time: ClockTime) {
  const angles = handAngles(time);
  const hour = Skia.Path.Make();
  const hourTip = pointOnClock(centre, radius * 0.5, angles.hour);
  hour.moveTo(centre, centre);
  hour.lineTo(hourTip.x, hourTip.y);

  const minute = Skia.Path.Make();
  const minuteTip = pointOnClock(centre, radius * 0.78, angles.minute);
  minute.moveTo(centre, centre);
  minute.lineTo(minuteTip.x, minuteTip.y);
  return { hour, minute };
}

/** A clean analog clock face that the child reads. */
export function ClockFace({ time, size, showRing = false }: ClockFaceProps) {
  const centre = size / 2;
  const radius = size / 2;

  const ticks = useMemo(() => buildTicks(centre, radius), [centre, radius]);
  const hands = useMemo(
    () => buildHands(centre, radius, time),
    [centre, radius, time],
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
        <Path
          path={hands.hour}
          color={clockColors.hourHand}
          style="stroke"
          strokeWidth={size * 0.035}
          strokeCap="round"
        />
        <Path
          path={hands.minute}
          color={clockColors.minuteHand}
          style="stroke"
          strokeWidth={size * 0.022}
          strokeCap="round"
        />
        <Circle cx={centre} cy={centre} r={size * 0.025} color={clockColors.face} />
      </Canvas>

      {showRing ? <ClockRing size={size} radius={radius * 0.9} /> : null}
      <ClockNumbers size={size} radius={radius * (showRing ? 0.7 : 0.78)} />
    </View>
  );
}
