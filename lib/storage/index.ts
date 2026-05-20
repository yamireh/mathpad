/**
 * Storage adapter.
 *
 * Local-only persistence built on AsyncStorage. Exposes two stores:
 *
 *  - `settingsStore` — last-used Settings per operation (restored on re-entry).
 *  - `historyStore`  — completed practice sessions.
 *
 * The implementations below are functional stubs: they read/write real
 * AsyncStorage but use intentionally loose value types. Concrete settings and
 * history shapes are tightened once the Settings and Practice screens exist.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** AsyncStorage keys, namespaced to avoid collisions. */
const KEYS = {
  settings: 'mathpad:settings',
  history: 'mathpad:history',
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

/**
 * Persisted settings, keyed by operation name. The value shape is open for now
 * and tightened when the Settings screen lands.
 */
export type StoredSettings = Record<string, unknown>;

/** A single persisted practice-session record. Shape tightened later. */
export type HistoryEntry = Record<string, unknown>;

/** Last-used Settings per operation. */
export const settingsStore = {
  /** Return the full per-operation settings map. */
  async getAll(): Promise<StoredSettings> {
    return readJSON<StoredSettings>(KEYS.settings, {});
  },

  /** Return the saved settings for one operation, or undefined if none. */
  async get(operation: string): Promise<unknown> {
    const all = await readJSON<StoredSettings>(KEYS.settings, {});
    return all[operation];
  },

  /** Save the settings for one operation. */
  async set(operation: string, settings: unknown): Promise<void> {
    const all = await readJSON<StoredSettings>(KEYS.settings, {});
    all[operation] = settings;
    await writeJSON(KEYS.settings, all);
  },

  /** Remove all saved settings. */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.settings);
  },
};

/** Completed practice sessions. */
export const historyStore = {
  /** Return all history entries, oldest first. */
  async list(): Promise<HistoryEntry[]> {
    return readJSON<HistoryEntry[]>(KEYS.history, []);
  },

  /** Append a completed-session entry. */
  async append(entry: HistoryEntry): Promise<void> {
    const entries = await readJSON<HistoryEntry[]>(KEYS.history, []);
    entries.push(entry);
    await writeJSON(KEYS.history, entries);
  },

  /** Remove all history. */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.history);
  },
};
