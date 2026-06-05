import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  defaultClockSettings,
  type ClockResult,
  type ClockSettings,
} from '../../../lib/clock';
import { ClockPracticeView } from './ClockPracticeView';
import { ClockResultsView } from './ClockResultsView';
import { ClockSettingsView } from './ClockSettingsView';

type Phase = 'settings' | 'practice' | 'results';

/**
 * Self-contained Clock module: orchestrates the settings → practice → results
 * phases with local state (no extra routes or providers). Mounted by the Clock
 * route when the feature flag is on.
 */
export function ClockModule() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('settings');
  const [settings, setSettings] = useState<ClockSettings>(defaultClockSettings);
  const [results, setResults] = useState<ClockResult[]>([]);

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

  if (phase === 'results') {
    return (
      <ClockResultsView
        results={results}
        onAgain={() => setPhase('practice')}
        onHome={() => router.back()}
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
