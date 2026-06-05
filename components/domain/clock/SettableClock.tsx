import { useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { tickFeedback } from '../../../lib/feedback';
import { type ClockStep, type ClockTime } from '../../../lib/clock';
import { ClockFace } from './ClockFace';

export interface SettableClockProps {
  /** The time the hands currently show. */
  value: ClockTime;
  onChange: (value: ClockTime) => void;
  /** Which hand a drag moves (chosen via the hand selector). */
  selected: 'hour' | 'minute';
  /** Square edge length in px. */
  size: number;
  /** Minute granularity the minute hand snaps to. */
  step: ClockStep;
  showRing?: boolean;
}

const norm360 = (deg: number): number => ((deg % 360) + 360) % 360;

/**
 * An analog clock whose hands the child drags to set a time. A drag only moves
 * the *selected* hand (picked via the hand selector) so the other never changes
 * by accident. The minute hand snaps in 5-minute steps (1-minute at "Minutes"
 * complexity); the hour hand snaps to the nearest number (drift-aware). Each
 * step fires a picker-style tick.
 */
export function SettableClock({
  value,
  onChange,
  selected,
  size,
  step,
  showRing,
}: SettableClockProps) {
  const centre = size / 2;
  const valueRef = useRef(value);
  valueRef.current = value;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const minuteSnap = step === 'minute' ? 1 : 5;

  const angleAt = (x: number, y: number): number =>
    norm360((Math.atan2(x - centre, -(y - centre)) * 180) / Math.PI);

  const update = (x: number, y: number, dragging: boolean) => {
    const deg = angleAt(x, y);
    const cur = valueRef.current;
    let next: ClockTime;
    if (selectedRef.current === 'minute') {
      const minute = (Math.round(deg / 6 / minuteSnap) * minuteSnap) % 60;
      let hour = cur.hour;
      // Geared like a real clock: sweeping the minute hand past 12 rolls the
      // hour by one (only during a continuous drag, not the initial grab).
      if (dragging) {
        if (cur.minute >= 45 && minute <= 15) hour = hour === 12 ? 1 : hour + 1;
        else if (cur.minute <= 15 && minute >= 45)
          hour = hour === 1 ? 12 : hour - 1;
      }
      next = { hour, minute };
    } else {
      // Hour hand drifts with the minutes, so account for that drift before
      // snapping to the nearest number.
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
    .onBegin((e) => update(e.x, e.y, false))
    .onUpdate((e) => update(e.x, e.y, true));

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width: size, height: size }} collapsable={false}>
        <ClockFace
          time={value}
          size={size}
          showRing={showRing}
          grabbed={selected}
        />
      </View>
    </GestureDetector>
  );
}
