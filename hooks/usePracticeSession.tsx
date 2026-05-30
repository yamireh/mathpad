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
  ProblemLayout,
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
  /** User-chosen layout overrides keyed by question id (division toggle). */
  layoutOverrides: Record<string, ProblemLayout>;
  /** Tapped borrow-lender columns keyed by question id (subtraction). */
  borrowMarks: Record<string, number[]>;
  /** Per-column carry-box ink keyed by question id (addition/×). */
  carryInk: Record<string, InkStroke[][]>;
  /**
   * Per-row, per-column partial-product ink keyed by question id (× only,
   * when the multiplier has > 1 digit). `partialInk[qid][row][col]` is the
   * stroke list for one cell of the row-th partial product. Working-out
   * only — never scored, never persisted as raw strokes.
   */
  partialInk: Record<string, InkStroke[][][]>;
  /**
   * Per-partial times-step carry ink keyed by question id (× only). Shape
   * mirrors `partialInk` but indexed by op1 column instead of partial cell:
   * `timesCarryInk[qid][partialRow][op1Col]`. A single UI row above op1
   * surfaces the active partial's slice.
   */
  timesCarryInk: Record<string, InkStroke[][][]>;
  /**
   * Long-division draft ink keyed by question id. Shape:
   * `divisionDraftInk[qid][row][col]` — one stroke list per cell of the
   * column-aligned grid of working-out boxes inside the long-division
   * bracket. Working-out only — never scored.
   */
  divisionDraftInk: Record<string, InkStroke[][][]>;
  /**
   * Per-question undo stacks. Each entry snapshots every input area for
   * the question (answer, scratch, carries, partials, times-carries,
   * division draft, borrows) right before a change. Capped at UNDO_LIMIT.
   * Clear All wipes the stack so it can't resurrect cleared work.
   */
  undoStacks: Record<string, QuestionSnapshot[]>;
  /** Per-question results — null until the first Finish. */
  results: QuestionResult[] | null;
  startedAt: number;
  finishedAt: number | null;
}

/** Snapshot of every input area for one question, used for undo. */
interface QuestionSnapshot {
  answerInk: AnswerInk;
  scratchInk: InkStroke[];
  borrowMarks: number[];
  carryInk: InkStroke[][];
  partialInk: InkStroke[][][];
  timesCarryInk: InkStroke[][][];
  divisionDraftInk: InkStroke[][][];
}

const UNDO_LIMIT = 50;

export interface PracticeSessionContextValue {
  session: SessionData | null;
  /** Generate a new session from settings. */
  start: (settings: Settings) => void;
  /** Replace the answer ink for one question. */
  updateAnswerInk: (questionId: string, ink: AnswerInk) => void;
  /** Replace the scratch ink for one question. */
  updateScratchInk: (questionId: string, strokes: InkStroke[]) => void;
  /** Override the problem layout for one question (division toggle). */
  setLayoutOverride: (questionId: string, layout: ProblemLayout) => void;
  /** Toggle a borrow on a top-operand digit column (subtraction). */
  toggleBorrowMark: (questionId: string, column: number) => void;
  /** Replace one carry box's ink for a question column. */
  updateCarryInk: (
    questionId: string,
    column: number,
    strokes: InkStroke[],
  ) => void;
  /** Replace one partial-product cell's ink (multiplication only). */
  updatePartialInk: (
    questionId: string,
    row: number,
    col: number,
    strokes: InkStroke[],
  ) => void;
  /** Replace one per-partial times-carry cell's ink (multiplication only). */
  updateTimesCarryInk: (
    questionId: string,
    partialRow: number,
    op1Col: number,
    strokes: InkStroke[],
  ) => void;
  /** Replace one long-division draft-grid cell's ink (division only). */
  updateDivisionDraftInk: (
    questionId: string,
    row: number,
    col: number,
    strokes: InkStroke[],
  ) => void;
  /** Undo the last ink change for a question. No-op if nothing to undo. */
  undoLastAction: (questionId: string) => void;
  /** Wipe the undo history for a question (used by Clear All). */
  clearUndoHistory: (questionId: string) => void;
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
        layoutOverrides: {},
        borrowMarks: {},
        carryInk: {},
        partialInk: {},
        timesCarryInk: {},
        divisionDraftInk: {},
        undoStacks: {},
        results: null,
        startedAt: Date.now(),
        finishedAt: null,
      });
    },
    [commit],
  );

  // Capture the current state of every input area for one question.
  const snapshotQuestion = useCallback(
    (data: SessionData, qid: string): QuestionSnapshot => ({
      answerInk: data.answerInk[qid],
      scratchInk: data.scratchInk[qid] ?? [],
      borrowMarks: data.borrowMarks[qid] ?? [],
      carryInk: data.carryInk[qid] ?? [],
      partialInk: data.partialInk[qid] ?? [],
      timesCarryInk: data.timesCarryInk[qid] ?? [],
      divisionDraftInk: data.divisionDraftInk[qid] ?? [],
    }),
    [],
  );

  // Push the question's current state onto its undo stack, then commit
  // `next` (which contains the post-change state). Caps the stack at
  // UNDO_LIMIT so deep practice sessions don't grow memory unbounded.
  const pushHistoryAndCommit = useCallback(
    (qid: string, next: SessionData) => {
      const prev = sessionRef.current;
      if (!prev) {
        commit(next);
        return;
      }
      const snapshot = snapshotQuestion(prev, qid);
      const stack = next.undoStacks[qid] ?? [];
      const trimmed =
        stack.length >= UNDO_LIMIT
          ? stack.slice(stack.length - UNDO_LIMIT + 1)
          : stack;
      commit({
        ...next,
        undoStacks: { ...next.undoStacks, [qid]: [...trimmed, snapshot] },
      });
    },
    [commit, snapshotQuestion],
  );

  const updateAnswerInk = useCallback(
    (questionId: string, ink: AnswerInk) => {
      const data = sessionRef.current;
      if (!data) return;
      pushHistoryAndCommit(questionId, {
        ...data,
        answerInk: { ...data.answerInk, [questionId]: ink },
      });
    },
    [pushHistoryAndCommit],
  );

  const updateScratchInk = useCallback(
    (questionId: string, strokes: InkStroke[]) => {
      const data = sessionRef.current;
      if (!data) return;
      pushHistoryAndCommit(questionId, {
        ...data,
        scratchInk: { ...data.scratchInk, [questionId]: strokes },
      });
    },
    [pushHistoryAndCommit],
  );

  const setLayoutOverride = useCallback(
    (questionId: string, layout: ProblemLayout) => {
      const data = sessionRef.current;
      if (!data) return;
      commit({
        ...data,
        layoutOverrides: { ...data.layoutOverrides, [questionId]: layout },
      });
    },
    [commit],
  );

  const toggleBorrowMark = useCallback(
    (questionId: string, column: number) => {
      const data = sessionRef.current;
      if (!data) return;
      const current = data.borrowMarks[questionId] ?? [];
      const next = current.includes(column)
        ? current.filter((c) => c !== column)
        : [...current, column];
      pushHistoryAndCommit(questionId, {
        ...data,
        borrowMarks: { ...data.borrowMarks, [questionId]: next },
      });
    },
    [pushHistoryAndCommit],
  );

  const updateCarryInk = useCallback(
    (questionId: string, column: number, strokes: InkStroke[]) => {
      const data = sessionRef.current;
      if (!data) return;
      const current = data.carryInk[questionId] ?? [];
      const next = [...current];
      while (next.length <= column) next.push([]);
      next[column] = strokes;
      pushHistoryAndCommit(questionId, {
        ...data,
        carryInk: { ...data.carryInk, [questionId]: next },
      });
    },
    [pushHistoryAndCommit],
  );

  const updatePartialInk = useCallback(
    (questionId: string, row: number, col: number, strokes: InkStroke[]) => {
      const data = sessionRef.current;
      if (!data) return;
      const currentRows = data.partialInk[questionId] ?? [];
      const nextRows = [...currentRows];
      while (nextRows.length <= row) nextRows.push([]);
      const nextRow = [...nextRows[row]];
      while (nextRow.length <= col) nextRow.push([]);
      nextRow[col] = strokes;
      nextRows[row] = nextRow;
      pushHistoryAndCommit(questionId, {
        ...data,
        partialInk: { ...data.partialInk, [questionId]: nextRows },
      });
    },
    [pushHistoryAndCommit],
  );

  const updateTimesCarryInk = useCallback(
    (
      questionId: string,
      partialRow: number,
      op1Col: number,
      strokes: InkStroke[],
    ) => {
      const data = sessionRef.current;
      if (!data) return;
      const currentRows = data.timesCarryInk[questionId] ?? [];
      const nextRows = [...currentRows];
      while (nextRows.length <= partialRow) nextRows.push([]);
      const nextRow = [...nextRows[partialRow]];
      while (nextRow.length <= op1Col) nextRow.push([]);
      nextRow[op1Col] = strokes;
      nextRows[partialRow] = nextRow;
      pushHistoryAndCommit(questionId, {
        ...data,
        timesCarryInk: {
          ...data.timesCarryInk,
          [questionId]: nextRows,
        },
      });
    },
    [pushHistoryAndCommit],
  );

  const updateDivisionDraftInk = useCallback(
    (questionId: string, row: number, col: number, strokes: InkStroke[]) => {
      const data = sessionRef.current;
      if (!data) return;
      const currentRows = data.divisionDraftInk[questionId] ?? [];
      const nextRows = [...currentRows];
      while (nextRows.length <= row) nextRows.push([]);
      const nextRow = [...nextRows[row]];
      while (nextRow.length <= col) nextRow.push([]);
      nextRow[col] = strokes;
      nextRows[row] = nextRow;
      pushHistoryAndCommit(questionId, {
        ...data,
        divisionDraftInk: {
          ...data.divisionDraftInk,
          [questionId]: nextRows,
        },
      });
    },
    [pushHistoryAndCommit],
  );

  // Pop the question's last snapshot and restore every input area.
  const undoLastAction = useCallback(
    (questionId: string) => {
      const data = sessionRef.current;
      if (!data) return;
      const stack = data.undoStacks[questionId] ?? [];
      if (stack.length === 0) return;
      const snap = stack[stack.length - 1];
      const remaining = stack.slice(0, -1);
      commit({
        ...data,
        answerInk: { ...data.answerInk, [questionId]: snap.answerInk },
        scratchInk: { ...data.scratchInk, [questionId]: snap.scratchInk },
        borrowMarks: { ...data.borrowMarks, [questionId]: snap.borrowMarks },
        carryInk: { ...data.carryInk, [questionId]: snap.carryInk },
        partialInk: { ...data.partialInk, [questionId]: snap.partialInk },
        timesCarryInk: {
          ...data.timesCarryInk,
          [questionId]: snap.timesCarryInk,
        },
        divisionDraftInk: {
          ...data.divisionDraftInk,
          [questionId]: snap.divisionDraftInk,
        },
        undoStacks: { ...data.undoStacks, [questionId]: remaining },
      });
    },
    [commit],
  );

  const clearUndoHistory = useCallback(
    (questionId: string) => {
      const data = sessionRef.current;
      if (!data) return;
      commit({
        ...data,
        undoStacks: { ...data.undoStacks, [questionId]: [] },
      });
    },
    [commit],
  );

  const finish = useCallback(
    async (recognize: AnswerRecognizer) => {
      const data = sessionRef.current;
      if (!data) throw new Error('No active session');
      const submissions = await Promise.all(
        data.questions.map((q) =>
          recognize(
            data.answerInk[q.id],
            data.layoutOverrides[q.id] ?? q.layout,
          ),
        ),
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

      const submitted = await recognize(
        data.answerInk[questionId],
        data.layoutOverrides[questionId] ?? question.layout,
      );
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
      setLayoutOverride,
      toggleBorrowMark,
      updateCarryInk,
      updatePartialInk,
      updateTimesCarryInk,
      updateDivisionDraftInk,
      undoLastAction,
      clearUndoHistory,
      finish,
      reviewSubmit,
      reset,
    }),
    [
      session,
      start,
      updateAnswerInk,
      updateScratchInk,
      setLayoutOverride,
      toggleBorrowMark,
      updateCarryInk,
      updatePartialInk,
      updateTimesCarryInk,
      updateDivisionDraftInk,
      undoLastAction,
      clearUndoHistory,
      finish,
      reviewSubmit,
      reset,
    ],
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
