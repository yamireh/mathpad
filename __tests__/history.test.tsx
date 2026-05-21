import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';

import '../lib/i18n';
import HistoryDetailScreen from '../app/history/[id]';
import HistoryScreen from '../app/history/index';
import { defaultSettings, historyStore } from '../lib/storage';
import type { QuestionResult, SessionResult } from '../types';

const questionResult: QuestionResult = {
  question: {
    id: 'q-1',
    operation: 'addition',
    operands: [2, 3],
    answer: { kind: 'integer', value: 5 },
    layout: 'vertical',
  },
  submittedAnswer: null,
  status: 'wrong',
};

const sampleSession: SessionResult = {
  id: 'sess-1',
  completedAt: '2026-05-01T10:00:00.000Z',
  operation: 'addition',
  settings: defaultSettings('addition'),
  firstTryScore: 8,
  finalScore: 9,
  totalQuestions: 10,
  durationSeconds: 240,
  questions: [questionResult],
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('History screen', () => {
  it('shows the empty state when there is no history', async () => {
    render(<HistoryScreen />);
    await waitFor(() =>
      expect(screen.getByText('No sessions yet')).toBeOnTheScreen(),
    );
  });

  it('lists saved sessions', async () => {
    await historyStore.add(sampleSession);
    render(<HistoryScreen />);
    await waitFor(() =>
      expect(screen.getByText('Addition')).toBeOnTheScreen(),
    );
    expect(screen.getByText('Clear all history')).toBeOnTheScreen();
  });
});

describe('History detail screen', () => {
  it('shows a session and its questions', async () => {
    await historyStore.add(sampleSession);
    globalThis.__expoRouterParams = { id: 'sess-1' };
    render(<HistoryDetailScreen />);
    await waitFor(() =>
      expect(screen.getByText('Session details')).toBeOnTheScreen(),
    );
    // The question's correct answer is shown.
    expect(screen.getByText('5')).toBeOnTheScreen();
  });
});
