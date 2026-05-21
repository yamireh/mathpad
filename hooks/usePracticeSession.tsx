/**
 * usePracticeSession — the practice-session controller.
 *
 * Holds the whole in-memory session (questions, per-question answer ink and
 * scratch ink, results) and shares it across the Practice → Score → Review
 * screens via context. Ink is kept in memory so it survives review/edit and is
 * never persisted as raw strokes (SPEC § Local data storage).
 */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  type AnswerInk,
  answerShape,
  emptyAnswerInk,
  type InkStroke,
} from '../components/domain';
import { generateSession } from '../lib/questionGenerator';
import {
  countFinal,
  countFirstTry,
  isAnswerCorrect,
  markFirstAttempt,
  statusAfterEdit,
} from '../lib/scoring';
import { historyStore } from '../lib/storage';
import type {
  Question,
  QuestionResult,
  SessionResult,
  Settings,
} from '../types';
import type { AnswerRecognizer } from './useRecognition';

/** The full in-memory state of a practice session. */
export interface SessionData {
  sessionId: string;
  settings: Settings;
  questions: Question[];
  /** Answer-area ink keyed by question id. */
  answerInk: Record<string, AnswerInk>;
  /** Scratch-canvas ink keyed by question id. */
  scratchInk: Record<string, InkStroke[]>;
  /** Per-question results — null until the first Finish. */
  results: QuestionResult[] | null;
  startedAt: number;
  finishedAt: number | null;
}

export interface PracticeSessionContextValue {
  session: SessionData | null;
  /** Generate a new session from settings. */
  start: (settings: Settings) => void;
  /** Replace the answer ink for one question. */
  updateAnswerInk: (questionId: string, ink: AnswerInk) => void;
  /** Replace the scratch ink for one question. */
  updateScratchInk: (questionId: string, strokes: InkStroke[]) => void;
  /** Recognise and mark every question; locks the first-try score. */
  finish: (recognize: AnswerRecognizer) => Promise<QuestionResult[]>;
  /** Re-recognise and re-mark one question after an edit. */
  reviewSubmit: (
    questionId: string,
    recognize: AnswerRecognizer,
  ) => Promise<QuestionResult>;
  /** Discard the session (clears all in-memory ink). */
  reset: () => void;
}

const PracticeSessionContext =
  createContext<PracticeSessionContextValue | null>(null);

/** Build the persistable SessionResult from in-memory session data. */
function toSessionResult(data: SessionData): SessionResult {
  const results = data.results ?? [];
  const finishedAt = data.finishedAt ?? Date.now();
  return {
    id: data.sessionId,
    completedAt: new Date(finishedAt).toISOString(),
    operation: data.settings.operation,
    settings: data.settings,
    firstTryScore: countFirstTry(results),
    finalScore: countFinal(results),
    totalQuestions: data.questions.length,
    durationSeconds: Math.round((finishedAt - data.startedAt) / 1000),
    questions: results,
  };
}

export function PracticeSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<SessionData | null>(null);
  // Mirror in a ref so async actions never read a stale session.
  const sessionRef = useRef<SessionData | null>(null);
  const commit = useCallback((next: SessionData | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const start = useCallback(
    (settings: Settings) => {
      const questions = generateSession(settings);
      const answerInk: Record<string, AnswerInk> = {};
      for (const question of questions) {
        answerInk[question.id] = emptyAnswerInk(answerShape(question));
      }
      commit({
        sessionId: `s-${Date.now().toString(36)}`,
        settings,
        questions,
        answerInk,
        scratchInk: {},
        results: null,
        startedAt: Date.now(),
        finishedAt: null,
      });
    },
    [commit],
  );

  const updateAnswerInk = useCallback(
    (questionId: string, ink: AnswerInk) => {
      const data = sessionRef.current;
      if (!data) return;
      commit({
        ...data,
        answerInk: { ...data.answerInk, [questionId]: ink },
      });
    },
    [commit],
  );

  const updateScratchInk = useCallback(
    (questionId: string, strokes: InkStroke[]) => {
      const data = sessionRef.current;
      if (!data) return;
      commit({
        ...data,
        scratchInk: { ...data.scratchInk, [questionId]: strokes },
      });
    },
    [commit],
  );

  const finish = useCallback(
    async (recognize: AnswerRecognizer) => {
      const data = sessionRef.current;
      if (!data) throw new Error('No active session');
      const submissions = await Promise.all(
        data.questions.map((q) => recognize(data.answerInk[q.id])),
      );
      const results = markFirstAttempt(data.questions, submissions);
      const finished: SessionData = {
        ...data,
        results,
        finishedAt: Date.now(),
      };
      commit(finished);
      void historyStore.upsert(toSessionResult(finished));
      return results;
    },
    [commit],
  );

  const reviewSubmit = useCallback(
    async (questionId: string, recognize: AnswerRecognizer) => {
      const data = sessionRef.current;
      if (!data || !data.results) throw new Error('No finished session');
      const question = data.questions.find((q) => q.id === questionId);
      if (!question) throw new Error(`Unknown question: ${questionId}`);

      const submitted = await recognize(data.answerInk[questionId]);
      const nowCorrect = isAnswerCorrect(question, submitted);
      const results = data.results.map((r) =>
        r.question.id === questionId
          ? {
              ...r,
              submittedAnswer: submitted,
              status: statusAfterEdit(r.status, nowCorrect),
            }
          : r,
      );
      const updated: SessionData = { ...data, results };
      commit(updated);
      void historyStore.upsert(toSessionResult(updated));
      return results.find((r) => r.question.id === questionId) as QuestionResult;
    },
    [commit],
  );

  const reset = useCallback(() => commit(null), [commit]);

  const value = useMemo<PracticeSessionContextValue>(
    () => ({
      session,
      start,
      updateAnswerInk,
      updateScratchInk,
      finish,
      reviewSubmit,
      reset,
    }),
    [session, start, updateAnswerInk, updateScratchInk, finish, reviewSubmit, reset],
  );

  return (
    <PracticeSessionContext.Provider value={value}>
      {children}
    </PracticeSessionContext.Provider>
  );
}

/** Access the shared practice session. Must be under a provider. */
export function usePracticeSession(): PracticeSessionContextValue {
  const ctx = useContext(PracticeSessionContext);
  if (!ctx) {
    throw new Error(
      'usePracticeSession must be used within a PracticeSessionProvider',
    );
  }
  return ctx;
}
