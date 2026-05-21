/**
 * Storage adapter.
 *
 * Local-only persistence over AsyncStorage (SPEC.md § Local data storage). All
 * data stays on the device — no cloud, no sync. Raw ink stroke data is never
 * persisted. Two stores:
 *
 *  - `settingsStore` — last-used Settings per operation.
 *  - `historyStore`  — completed practice sessions.
 *
 * Implementation details are hidden behind these objects; callers never touch
 * AsyncStorage directly.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  BaseSettings,
  Operation,
  SessionResult,
  Settings,
} from '../../types';

/** Versioned AsyncStorage keys (the `:v1` suffix allows future migrations). */
const KEYS = {
  settings: 'mathpad:settings:v1',
  history: 'mathpad:history:v1',
} as const;

/** Read and JSON-parse a key, returning `fallback` on miss or parse error. */
async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/** JSON-stringify and write a value. */
async function writeJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/* -------------------------------------------------------------------------- */
/* Default settings                                                             */
/* -------------------------------------------------------------------------- */

/** Settings shared by every operation (SPEC defaults: digits 2–3, 10 Qs). */
function baseSettings(): BaseSettings {
  return {
    digitRange: { min: 2, max: 3 },
    questionCount: 10,
    timer: { enabled: false, durationMinutes: 5 },
  };
}

/** The default Settings for an operation when nothing has been saved yet. */
export function defaultSettings(operation: Operation): Settings {
  switch (operation) {
    case 'addition':
      return { operation, ...baseSettings(), carrying: 'random' };
    case 'subtraction':
      return {
        operation,
        ...baseSettings(),
        borrowing: 'random',
        allowNegative: 'off',
      };
    case 'multiplication':
      return { operation, ...baseSettings(), regrouping: 'random' };
    case 'division':
      return { operation, ...baseSettings(), answerType: 'noRemainder' };
    case 'mix':
      return { operation, ...baseSettings() };
  }
}

/* -------------------------------------------------------------------------- */
/* Settings store                                                               */
/* -------------------------------------------------------------------------- */

type SettingsMap = Partial<Record<Operation, Settings>>;

/** Last-used Settings per operation. */
export const settingsStore = {
  /** Saved settings for an operation, or null if none. */
  async get(operation: Operation): Promise<Settings | null> {
    const all = await readJSON<SettingsMap>(KEYS.settings, {});
    return all[operation] ?? null;
  },

  /** Saved settings for an operation, or the defaults if none. */
  async getOrDefault(operation: Operation): Promise<Settings> {
    return (await settingsStore.get(operation)) ?? defaultSettings(operation);
  },

  /** Persist settings, keyed by their operation. */
  async save(settings: Settings): Promise<void> {
    const all = await readJSON<SettingsMap>(KEYS.settings, {});
    all[settings.operation] = settings;
    await writeJSON(KEYS.settings, all);
  },

  /** Forget all saved settings. */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.settings);
  },
};

/* -------------------------------------------------------------------------- */
/* History store                                                                */
/* -------------------------------------------------------------------------- */

/** Completed practice sessions. */
export const historyStore = {
  /** All sessions, most recent first. */
  async list(): Promise<SessionResult[]> {
    const items = await readJSON<SessionResult[]>(KEYS.history, []);
    return [...items].sort((a, b) =>
      b.completedAt.localeCompare(a.completedAt),
    );
  },

  /** Append a completed session. */
  async add(session: SessionResult): Promise<void> {
    const items = await readJSON<SessionResult[]>(KEYS.history, []);
    items.push(session);
    await writeJSON(KEYS.history, items);
  },

  /** Delete all history (SPEC: "Clear all history"). */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.history);
  },
};
