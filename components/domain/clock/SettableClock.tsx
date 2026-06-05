import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { tickFeedback } from '../../../lib/feedback';
import { type ClockStep, type ClockTime } from '../../../lib/clock';
import { ClockFace } from './ClockFace';

export interface SettableClockProps {
  /** The time the hands currently show. */
  value: ClockTime;
  onChange: (value: ClockTime) => void;
  /** Square edge length in px. */
  size: number;
  /** Minute granularity the minute hand snaps to. */
  step: ClockStep;
  showRing?: boolean;
}

const norm360 = (deg: number): number => ((deg % 360) + 360) % 360;

/**
 * An analog clock whose two hands the child drags to set a time. The nearer-to-
 * centre touch grabs the (short) hour hand, otherwise the minute hand; each
 * hand snaps — to the complexity step for minutes, to the nearest number for
 * hours (drift-aware) — with a picker-style tick on every step.
 */
export function SettableClock({
  value,
  onChange,
  size,
  step,
  showRing,
}: SettableClockProps) {
  const centre = size / 2;
  const valueRef = useRef(value);
  valueRef.current = value;
  const activeHand = useRef<'hour' | 'minute'>('minute');
  const [grabbed, setGrabbed] = useState<'hour' | 'minute' | null>(null);
  // While setting, the minute hand moves in 5-minute steps (so the kid can sweep
  // it smoothly even at quarter complexity), or 1-minute steps for "Minutes".
  const minuteSnap = step === 'minute' ? 1 : 5;

  const angleAt = (x: number, y: number): number =>
    norm360((Math.atan2(x - centre, -(y - centre)) * 180) / Math.PI);

  const update = (x: number, y: number) => {
    const deg = angleAt(x, y);
    const cur = valueRef.current;
    let next: ClockTime;
    if (activeHand.current === 'minute') {
      next = {
        hour: cur.hour,
        minute: (Math.round(deg / 6 / minuteSnap) * minuteSnap) % 60,
      };
    } else {
      // Remove the hour hand's minute-drift before snapping to a number.
      const idx = Math.round(norm360(deg - cur.minute * 0.5) / 30) % 12;
      next = { hour: idx === 0 ? 12 : idx, minute: cur.minute };
    }
    if (next.hour !== cur.hour || next.minute !== cur.minute) {
      valueRef.current = next;
      tickFeedback();
      onChange(next);
    }
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => {
      const r = Math.hypot(e.x - centre, e.y - centre);
      activeHand.current = r < size * 0.3 ? 'hour' : 'minute';
      setGrabbed(activeHand.current);
      update(e.x, e.y);
    })
    .onUpdate((e) => update(e.x, e.y))
    .onFinalize(() => setGrabbed(null));

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width: size, height: size }} collapsable={false}>
        <ClockFace time={value} size={size} showRing={showRing} grabbed={grabbed} />
      </View>
    </GestureDetector>
  );
}
