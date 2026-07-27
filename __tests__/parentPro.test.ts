import {
  isParentProActive,
  isTrialActive,
  trialDaysLeft,
} from '../lib/parentPro';

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_700_000_000_000; // fixed "now" base

describe('parentPro — trial + active state', () => {
  it('a paid subscription is always active', () => {
    const data = { subscribed: true, trialStartedAt: null };
    expect(isParentProActive(data, 1, T0)).toBe(true);
  });

  it('a live trial is active until it expires', () => {
    const startedAt = new Date(T0).toISOString();
    const data = { subscribed: false, trialStartedAt: startedAt };
    // within the 1-day window
    expect(isTrialActive(data, 1, T0 + DAY / 2)).toBe(true);
    expect(isParentProActive(data, 1, T0 + DAY / 2)).toBe(true);
    // just past it
    expect(isTrialActive(data, 1, T0 + DAY + 1)).toBe(false);
    expect(isParentProActive(data, 1, T0 + DAY + 1)).toBe(false);
  });

  it('no trial when never started or trialDays is 0', () => {
    expect(isTrialActive({ subscribed: false, trialStartedAt: null }, 1, T0)).toBe(false);
    const started = { subscribed: false, trialStartedAt: new Date(T0).toISOString() };
    expect(isTrialActive(started, 0, T0)).toBe(false);
  });

  it('trialDaysLeft counts remaining whole days', () => {
    const started = { subscribed: false, trialStartedAt: new Date(T0).toISOString() };
    expect(trialDaysLeft(started, 2, T0)).toBe(2);
    expect(trialDaysLeft(started, 2, T0 + DAY + 1)).toBe(1);
    expect(trialDaysLeft(started, 2, T0 + 2 * DAY + 1)).toBe(0);
    expect(trialDaysLeft({ subscribed: false, trialStartedAt: null }, 2, T0)).toBe(0);
  });
});
