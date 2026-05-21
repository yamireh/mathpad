import AsyncStorage from '@react-native-async-storage/async-storage';

import { defaultSettings, historyStore, settingsStore } from '../lib/storage';
import type { SessionResult, Settings } from '../types';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('defaultSettings', () => {
  it('returns SPEC defaults shared across operations', () => {
    const s = defaultSettings('addition');
    expect(s.digitRange).toEqual({ min: 2, max: 3 });
    expect(s.questionCount).toBe(10);
    expect(s.timer.enabled).toBe(false);
  });
  it('returns operation-specific defaults', () => {
    expect(defaultSettings('addition')).toMatchObject({ carrying: 'random' });
    expect(defaultSettings('subtraction')).toMatchObject({
      borrowing: 'random',
      allowNegative: 'off',
    });
    expect(defaultSettings('multiplication')).toMatchObject({
      regrouping: 'random',
    });
    expect(defaultSettings('division')).toMatchObject({
      answerType: 'noRemainder',
    });
  });
  it('returns fresh nested objects each call', () => {
    const a = defaultSettings('addition');
    const b = defaultSettings('addition');
    expect(a.digitRange).not.toBe(b.digitRange);
  });
});

describe('settingsStore', () => {
  it('returns null before anything is saved', async () => {
    expect(await settingsStore.get('division')).toBeNull();
  });
  it('saves and restores settings per operation', async () => {
    const settings: Settings = {
      ...defaultSettings('division'),
      answerType: 'decimal',
    } as Settings;
    await settingsStore.save(settings);
    expect(await settingsStore.get('division')).toEqual(settings);
    // A different operation is unaffected.
    expect(await settingsStore.get('addition')).toBeNull();
  });
  it('getOrDefault falls back to defaults', async () => {
    expect(await settingsStore.getOrDefault('mix')).toEqual(
      defaultSettings('mix'),
    );
  });
  it('clear forgets saved settings', async () => {
    await settingsStore.save(defaultSettings('addition'));
    await settingsStore.clear();
    expect(await settingsStore.get('addition')).toBeNull();
  });
});

describe('historyStore', () => {
  const makeSession = (id: string, completedAt: string): SessionResult => ({
    id,
    completedAt,
    operation: 'addition',
    settings: defaultSettings('addition'),
    firstTryScore: 8,
    finalScore: 9,
    totalQuestions: 10,
    durationSeconds: 120,
    questions: [],
  });

  it('starts empty', async () => {
    expect(await historyStore.list()).toEqual([]);
  });
  it('adds sessions and lists them most-recent first', async () => {
    await historyStore.add(makeSession('old', '2026-01-01T10:00:00.000Z'));
    await historyStore.add(makeSession('new', '2026-05-01T10:00:00.000Z'));
    const list = await historyStore.list();
    expect(list.map((s) => s.id)).toEqual(['new', 'old']);
  });
  it('clear removes all history', async () => {
    await historyStore.add(makeSession('x', '2026-01-01T10:00:00.000Z'));
    await historyStore.clear();
    expect(await historyStore.list()).toEqual([]);
  });
});
