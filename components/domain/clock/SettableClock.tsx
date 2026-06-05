import { useRef } from 'react';
import { type GestureResponderEvent, View } from 'react-native';

import { tickFeedback } from '../../../lib/feedback';
import { STEP_MINUTES, type ClockStep, type ClockTime } from '../../../lib/clock';
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
  /** Fired on touch-down / touch-up so a parent can lock page scrolling. */
  onDragStart?: () => void;
  onDragEnd?: () => void;
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
  onDragStart,
  onDragEnd,
}: SettableClockProps) {
  const centre = size / 2;
  const valueRef = useRef(value);
  valueRef.current = value;
  const activeHand = useRef<'hour' | 'minute'>('minute');

  const angleAt = (x: number, y: number): number =>
    norm360((Math.atan2(x - centre, -(y - centre)) * 180) / Math.PI);

  const update = (x: number, y: number) => {
    const deg = angleAt(x, y);
    const cur = valueRef.current;
    let next: ClockTime;
    if (activeHand.current === 'minute') {
      const s = STEP_MINUTES[step];
      next = { hour: cur.hour, minute: (Math.round(deg / 6 / s) * s) % 60 };
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

  const at = (e: GestureResponderEvent): [number, number] => [
    e.nativeEvent.locationX,
    e.nativeEvent.locationY,
  ];

  return (
    <View
      style={{ width: size, height: size }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        const [x, y] = at(e);
        const r = Math.hypot(x - centre, y - centre);
        activeHand.current = r < size * 0.3 ? 'hour' : 'minute';
        onDragStart?.();
        update(x, y);
      }}
      onResponderMove={(e) => {
        const [x, y] = at(e);
        update(x, y);
      }}
      onResponderRelease={onDragEnd}
      onResponderTerminate={onDragEnd}
    >
      <ClockFace time={value} size={size} showRing={showRing} />
    </View>
  );
}
