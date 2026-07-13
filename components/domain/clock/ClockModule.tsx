import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import {
  defaultClockSettings,
  summariseClockSession,
  type ClockResult,
  type ClockSettings,
} from '../../../lib/clock';
import { isSignedInParent } from '../../../lib/firebase/auth';
import { maybeSync } from '../../../lib/firebase/sync';
import { clockHistoryStore } from '../../../lib/storage';
import { ClockFixView } from './ClockFixView';
import { ClockPracticeView } from './ClockPracticeView';
import { ClockResultsView } from './ClockResultsView';
import { ClockSettingsView } from './ClockSettingsView';

type Phase = 'settings' | 'practice' | 'results' | 'fix';

/**
 * Self-contained Clock module: orchestrates the settings → practice → results
 * (→ fix) phases with local state (no extra routes or providers). Mounted by
 * the Clock route when the feature flag is on.
 */
export function ClockModule() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('settings');
  const [settings, setSettings] = useState<ClockSettings>(defaultClockSettings);
  const [results, setResults] = useState<ClockResult[]>([]);
  const [fixIndex, setFixIndex] = useState<number | null>(null);
  // Sync the finished session to the parent dashboard exactly once (the
  // aggregate uses increments). Fixes happen after 'results', so we commit with
  // the final, fixed results — on Again, and on ANY exit (unmount), which also
  // covers a back-gesture that skips the "Home" button. A ref keeps the latest
  // results available to the unmount handler.
  const resultsRef = useRef<ClockResult[]>([]);
  resultsRef.current = results;
  const synced = useRef(false);
  const commitSession = () => {
    const rs = resultsRef.current;
    if (synced.current || rs.length === 0) return;
    // A signed-in parent is previewing — don't record it as the kid's practice.
    if (isSignedInParent()) return;
    synced.current = true;
    const id = `s-${Date.now().toString(36)}`;
    const completedAt = new Date().toISOString();
    const session = summariseClockSession(rs, settings, id, completedAt);
    // Save to Clock's own local history (shown on the Clock page)…
    void clockHistoryStore.add(session);
    // …and queue it for the parent dashboard (offline-safe, id-shared).
    void maybeSync({
      id,
      topic: 'clock',
      completedAt,
      totalQuestions: session.total,
      correctFirstTry: session.correct - session.corrected,
      finalScore: session.correct,
      corrected: session.corrected,
      solvedWithHelp: 0,
      hintsUsed: 0,
      durationSec: 0,
    });
  };
  // Commit on unmount so leaving the module by any means still syncs.
  useEffect(() => () => commitSession(), []);

  if (phase === 'fix' && fixIndex !== null) {
    return (
      <ClockFixView
        question={results[fixIndex].question}
        number={fixIndex + 1}
        onDone={(updated) => {
          setResults((prev) =>
            // Keep a first-try-correct answer; only a previously-wrong one can
            // change (to a fix or another miss).
            prev.map((r, i) =>
              i === fixIndex ? (r.correct ? r : updated) : r,
            ),
          );
          setFixIndex(null);
          setPhase('results');
        }}
        onCancel={() => {
          setFixIndex(null);
          setPhase('results');
        }}
      />
    );
  }

  if (phase === 'results') {
    return (
      <ClockResultsView
        results={results}
        onAgain={() => {
          commitSession();
          setPhase('practice');
        }}
        onHome={() => {
          commitSession();
          router.back();
        }}
        onFix={(i) => {
          setFixIndex(i);
          setPhase('fix');
        }}
      />
    );
  }

  if (phase === 'practice') {
    return (
      <ClockPracticeView
        settings={settings}
        onFinish={(r) => {
          setResults(r);
          synced.current = false; // a new session may be synced again
          setPhase('results');
        }}
        onExit={() => setPhase('settings')}
      />
    );
  }

  return (
    <ClockSettingsView
      initial={settings}
      onStart={(s) => {
        setSettings(s);
        setPhase('practice');
      }}
    />
  );
}
