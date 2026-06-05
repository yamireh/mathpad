import {
  clockPhrase,
  formatDigital,
  generateClockTime,
  handAngles,
  pointOnClock,
  STEP_MINUTES,
  type ClockStep,
} from '../lib/clock';

describe('clock — generateClockTime', () => {
  const steps: ClockStep[] = ['quarter', 'five', 'minute'];
  it('always produces a valid hour (1–12) and a minute on the step grid', () => {
    for (const step of steps) {
      for (let i = 0; i < 200; i += 1) {
        const { hour, minute } = generateClockTime(step);
        expect(hour).toBeGreaterThanOrEqual(1);
        expect(hour).toBeLessThanOrEqual(12);
        expect(minute).toBeGreaterThanOrEqual(0);
        expect(minute).toBeLessThan(60);
        expect(minute % STEP_MINUTES[step]).toBe(0);
      }
    }
  });

  it('quarter step only yields :00 :15 :30 :45', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 200; i += 1) seen.add(generateClockTime('quarter').minute);
    expect([...seen].sort((a, b) => a - b)).toEqual(
      expect.arrayContaining([...seen]),
    );
    for (const m of seen) expect([0, 15, 30, 45]).toContain(m);
  });
});

describe('clock — formatDigital', () => {
  it('pads the minutes', () => {
    expect(formatDigital({ hour: 6, minute: 30 })).toBe('6:30');
    expect(formatDigital({ hour: 9, minute: 5 })).toBe('9:05');
    expect(formatDigital({ hour: 12, minute: 0 })).toBe('12:00');
  });
});

describe('clock — clockPhrase', () => {
  it('names the special quarters and half', () => {
    expect(clockPhrase({ hour: 6, minute: 0 })).toEqual({ kind: 'oclock', hour: 6 });
    expect(clockPhrase({ hour: 6, minute: 15 })).toEqual({ kind: 'quarterPast', hour: 6 });
    expect(clockPhrase({ hour: 6, minute: 30 })).toEqual({ kind: 'half', hour: 6 });
    expect(clockPhrase({ hour: 6, minute: 45 })).toEqual({ kind: 'quarterTo', hour: 7 });
  });

  it('uses past before the half and to after it, naming the next hour', () => {
    expect(clockPhrase({ hour: 6, minute: 10 })).toEqual({ kind: 'past', minutes: 10, hour: 6 });
    expect(clockPhrase({ hour: 6, minute: 50 })).toEqual({ kind: 'to', minutes: 10, hour: 7 });
  });

  it('wraps 12 → 1 for "to" / "quarter to"', () => {
    expect(clockPhrase({ hour: 12, minute: 45 })).toEqual({ kind: 'quarterTo', hour: 1 });
    expect(clockPhrase({ hour: 12, minute: 50 })).toEqual({ kind: 'to', minutes: 10, hour: 1 });
  });
});

describe('clock — handAngles (realistic hour hand)', () => {
  it('places the hour hand between the numbers as minutes pass', () => {
    expect(handAngles({ hour: 3, minute: 0 })).toEqual({ hour: 90, minute: 0 });
    expect(handAngles({ hour: 6, minute: 30 })).toEqual({ hour: 195, minute: 180 });
    expect(handAngles({ hour: 12, minute: 0 })).toEqual({ hour: 0, minute: 0 });
    expect(handAngles({ hour: 12, minute: 30 })).toEqual({ hour: 15, minute: 180 });
  });
});

describe('clock — pointOnClock', () => {
  it('maps 0° to top, 90° to right, 180° to bottom', () => {
    const c = 100;
    const r = 100;
    const top = pointOnClock(c, r, 0);
    const right = pointOnClock(c, r, 90);
    const bottom = pointOnClock(c, r, 180);
    expect(top.x).toBeCloseTo(100);
    expect(top.y).toBeCloseTo(0);
    expect(right.x).toBeCloseTo(200);
    expect(right.y).toBeCloseTo(100);
    expect(bottom.x).toBeCloseTo(100);
    expect(bottom.y).toBeCloseTo(200);
  });
});
