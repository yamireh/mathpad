/**
 * useHistory — load and manage saved practice sessions.
 */
import { useCallback, useEffect, useState } from 'react';

import { historyStore } from '../lib/storage';
import type { SessionResult } from '../types';

export interface UseHistoryResult {
  /** Sessions most-recent first, or null while loading. */
  sessions: SessionResult[] | null;
  loading: boolean;
  /** Reload the list from storage. */
  reload: () => void;
  /** Delete every saved session. */
  clearAll: () => Promise<void>;
}

export function useHistory(): UseHistoryResult {
  const [sessions, setSessions] = useState<SessionResult[] | null>(null);

  const reload = useCallback(() => {
    historyStore.list().then(setSessions);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const clearAll = useCallback(async () => {
    await historyStore.clear();
    setSessions([]);
  }, []);

  return { sessions, loading: sessions === null, reload, clearAll };
}
