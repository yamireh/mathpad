import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  defaultClockSettings,
  type ClockResult,
  type ClockSettings,
} from '../../../lib/clock';
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
        onAgain={() => setPhase('practice')}
        onHome={() => router.back()}
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
