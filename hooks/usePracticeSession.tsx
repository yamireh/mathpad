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
  /** Tapped borrow-lender columns keyed by question id (subtraction). */
  borrowMarks: Record<string, number[]>;
  /**
   * Long-division borrow lenders keyed by question id, per quotient step:
   * `divisionBorrowMarks[qid][step]` is the list of minuend digit indices the
   * kid tapped to borrow from for that step's subtraction.
   */
  divisionBorrowMarks: Record<string, number[][]>;
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
   * Long-division divisor-carry ink keyed by question id. Shape:
   * `divisionCarryInk[qid][step][col]` — the carry written above the divisor
   * digit `col` (from the left) while computing one quotient step's
   * `quotientDigit × divisor`. Working-out only — never scored.
   */
  divisionCarryInk: Record<string, InkStroke[][][]>;
  /**
   * Per-question undo stacks. Each entry snapshots every input area for
   * the question (answer, scratch, carries, partials, times-carries,
   * division draft, borrows) right before a change. Capped at UNDO_LIMIT.
   * Clear All wipes the stack so it can't resurrect cleared work.
   */
  undoStacks: Record<string, QuestionSnapshot[]>;
  /**
   * Question ids on which Auto-Solve was invoked during this session. At
   * Finish, any such question that recognises as correct is downgraded from
   * `'correct_first_try'` to `'fixed'` — the answer is right but should not
   * count as a first-try success.
   */
  solvedQuestions: Record<string, true>;
  /** Question ids on which the kid used a hint during practice. */
  hintedQuestions: Record<string, true>;
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
  divisionBorrowMarks: number[][];
  carryInk: InkStroke[][];
  partialInk: InkStroke[][][];
  timesCarryInk: InkStroke[][][];
  divisionDraftInk: InkStroke[][][];
  divisionCarryInk: InkStroke[][][];
}

const UNDO_LIMIT = 50;

/** Equal if both lists hold the same stroke objects (immutable updates keep
 *  references, so identity-compare pinpoints the one box an edit touched). */
function strokesEq(a: InkStroke[] = [], b: InkStroke[] = []): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i]);
}

/** The answer box id whose strokes changed between two states (or null) —
 *  immutable updates keep references, so `!==` pinpoints the touched box. Used
 *  to coalesce a box's consecutive edits into one undo step. */
function changedAnswerBox(
  prev: AnswerInk | undefined,
  next: AnswerInk,
): string | null {
  if (!prev) return null;
  if (prev.sign !== next.sign) return 'sign';
  for (let i = 0; i < next.integer.length; i += 1)
    if (prev.integer[i] !== next.integer[i]) return `int-${i}`;
  for (let i = 0; i < next.decimal.length; i += 1)
    if (prev.decimal[i] !== next.decimal[i]) return `dec-${i}`;
  for (let i = 0; i < next.remainder.length; i += 1)
    if (prev.remainder[i] !== next.remainder[i]) return `rem-${i}`;
  return null;
}

/**
 * The id of the box whose ink differs between the question's current state and
 * the snapshot being restored — i.e. the box an undo just reverted, so focus
 * can return to it. Null for non-box edits (scratch strokes, borrow toggles).
 */
function undoneBox(
  cur: SessionData,
  snap: QuestionSnapshot,
  qid: string,
): string | null {
  const a = cur.answerInk[qid];
  if (a) {
    if (!strokesEq(a.sign, snap.answerInk.sign)) return 'sign';
    for (let i = 0; i < a.integer.length; i += 1)
      if (!strokesEq(a.integer[i], snap.answerInk.integer[i])) return `int-${i}`;
    for (let i = 0; i < a.decimal.length; i += 1)
      if (!strokesEq(a.decimal[i], snap.answerInk.decimal[i])) return `dec-${i}`;
    for (let i = 0; i < a.remainder.length; i += 1)
      if (!strokesEq(a.remainder[i], snap.answerInk.remainder[i]))
        return `rem-${i}`;
  }
  const carry = cur.carryInk[qid];
  if (carry)
    for (let c = 0; c < carry.length; c += 1)
      if (!strokesEq(carry[c], snap.carryInk[c])) return `carry-${c}`;
  const find = (
    grid: InkStroke[][][] | undefined,
    snapGrid: InkStroke[][][],
    id: (r: number, c: number) => string,
  ): string | null => {
    if (!grid) return null;
    for (let r = 0; r < grid.length; r += 1)
      for (let c = 0; c < (grid[r]?.length ?? 0); c += 1)
        if (!strokesEq(grid[r][c], snapGrid[r]?.[c])) return id(r, c);
    return null;
  };
  return (
    find(cur.partialInk[qid], snap.partialInk, (r, c) => `pp-${r}-${c}`) ??
    find(
      cur.timesCarryInk[qid],
      snap.timesCarryInk,
      (r, c) => `tcarry-${r}-${c}`,
    ) ??
    find(
      cur.divisionDraftInk[qid],
      snap.divisionDraftInk,
      (r, c) => `dd-${r}-${c}`,
    ) ??
    find(
      cur.divisionCarryInk[qid],
      snap.divisionCarryInk,
      (r, c) => `dcarry-${r}-${c}`,
    )
  );
}

export interface PracticeSessionContextValue {
  session: SessionData | null;
  /** Generate a new session from settings. */
  start: (settings: Settings) => void;
  /** Replace the answer ink for one question. */
  updateAnswerInk: (questionId: string, ink: AnswerInk) => void;
  /** Replace the scratch ink for one question. */
  updateScratchInk: (questionId: string, strokes: InkStroke[]) => void;
  /** Toggle a borrow on a top-operand digit column (subtraction). */
  toggleBorrowMark: (questionId: string, column: number) => void;
  /** Toggle a borrow lender for one long-division step's subtraction. */
  toggleDivisionBorrowMark: (
    questionId: string,
    step: number,
    lenderIndex: number,
  ) => void;
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
  /** Replace one divisor-carry cell's ink for a quotient step (division only). */
  updateDivisionCarryInk: (
    questionId: string,
    step: number,
    col: number,
    strokes: InkStroke[],
  ) => void;
  /**
   * Undo the last ink change for a question. No-op if nothing to undo.
   * Returns the id of the box it reverted (so focus can return there), or
   * null for non-box edits / nothing to undo.
   */
  undoLastAction: (questionId: string) => string | null;
  /** Wipe the undo history for a question (used by Clear All). */
  clearUndoHistory: (questionId: string) => void;
  /**
   * Flag that Auto-Solve was used on this question. Sticky for the rest of
   * the session; downgrades the question's first-Finish status to `'fixed'`.
   */
  markSolved: (questionId: string) => void;
  /** Flag that a hint was used on this question. Surfaced on the Results row. */
  markHinted: (questionId: string) => void;
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
        borrowMarks: {},
        divisionBorrowMarks: {},
        carryInk: {},
        partialInk: {},
        timesCarryInk: {},
        divisionDraftInk: {},
        divisionCarryInk: {},
        undoStacks: {},
        solvedQuestions: {},
        hintedQuestions: {},
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
      divisionBorrowMarks: data.divisionBorrowMarks[qid] ?? [],
      carryInk: data.carryInk[qid] ?? [],
      partialInk: data.partialInk[qid] ?? [],
      timesCarryInk: data.timesCarryInk[qid] ?? [],
      divisionDraftInk: data.divisionDraftInk[qid] ?? [],
      divisionCarryInk: data.divisionCarryInk[qid] ?? [],
    }),
    [],
  );

  // The cell (`qid:boxId`) the last history push was for, so consecutive edits
  // to the same cell coalesce into ONE undo step. Reset (null) whenever the
  // next edit must start a fresh step (after an undo / clear).
  const lastEditRef = useRef<string | null>(null);

  // Push the question's current state onto its undo stack, then commit
  // `next` (which contains the post-change state). Caps the stack at
  // UNDO_LIMIT so deep practice sessions don't grow memory unbounded.
  //
  // `coalesceKey` identifies the edited cell: consecutive edits to the same
  // cell (all the strokes of one digit, plus the live-recognition swap that
  // replaces them with a clean glyph) collapse into a single undo step, so one
  // undo empties the box rather than peeling back a stroke or the swap.
  const pushHistoryAndCommit = useCallback(
    (qid: string, next: SessionData, coalesceKey?: string | null) => {
      const prev = sessionRef.current;
      if (!prev) {
        commit(next);
        return;
      }
      const fullKey = coalesceKey != null ? `${qid}:${coalesceKey}` : null;
      if (fullKey != null && fullKey === lastEditRef.current) {
        commit(next); // same cell as the last edit — no new undo step
        return;
      }
      lastEditRef.current = fullKey;
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
      pushHistoryAndCommit(
        questionId,
        { ...data, answerInk: { ...data.answerInk, [questionId]: ink } },
        changedAnswerBox(data.answerInk[questionId], ink),
      );
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

  const toggleDivisionBorrowMark = useCallback(
    (questionId: string, step: number, lenderIndex: number) => {
      const data = sessionRef.current;
      if (!data) return;
      const currentSteps = data.divisionBorrowMarks[questionId] ?? [];
      const nextSteps = currentSteps.map((s) => [...(s ?? [])]);
      while (nextSteps.length <= step) nextSteps.push([]);
      const lenders = nextSteps[step];
      nextSteps[step] = lenders.includes(lenderIndex)
        ? lenders.filter((l) => l !== lenderIndex)
        : [...lenders, lenderIndex];
      pushHistoryAndCommit(questionId, {
        ...data,
        divisionBorrowMarks: {
          ...data.divisionBorrowMarks,
          [questionId]: nextSteps,
        },
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
      pushHistoryAndCommit(
        questionId,
        { ...data, carryInk: { ...data.carryInk, [questionId]: next } },
        `carry-${column}`,
      );
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
      pushHistoryAndCommit(
        questionId,
        { ...data, partialInk: { ...data.partialInk, [questionId]: nextRows } },
        `pp-${row}-${col}`,
      );
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
      pushHistoryAndCommit(
        questionId,
        {
          ...data,
          timesCarryInk: { ...data.timesCarryInk, [questionId]: nextRows },
        },
        `tcarry-${partialRow}-${op1Col}`,
      );
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
      pushHistoryAndCommit(
        questionId,
        {
          ...data,
          divisionDraftInk: { ...data.divisionDraftInk, [questionId]: nextRows },
        },
        `dd-${row}-${col}`,
      );
    },
    [pushHistoryAndCommit],
  );

  const updateDivisionCarryInk = useCallback(
    (questionId: string, step: number, col: number, strokes: InkStroke[]) => {
      const data = sessionRef.current;
      if (!data) return;
      const currentRows = data.divisionCarryInk[questionId] ?? [];
      const nextRows = [...currentRows];
      while (nextRows.length <= step) nextRows.push([]);
      const nextRow = [...nextRows[step]];
      while (nextRow.length <= col) nextRow.push([]);
      nextRow[col] = strokes;
      nextRows[step] = nextRow;
      pushHistoryAndCommit(
        questionId,
        {
          ...data,
          divisionCarryInk: { ...data.divisionCarryInk, [questionId]: nextRows },
        },
        `dcarry-${step}-${col}`,
      );
    },
    [pushHistoryAndCommit],
  );

  // Pop the question's last snapshot and restore every input area.
  const undoLastAction = useCallback(
    (questionId: string): string | null => {
      const data = sessionRef.current;
      if (!data) return null;
      const stack = data.undoStacks[questionId] ?? [];
      if (stack.length === 0) return null;
      // After an undo, the next edit — even to the same cell — must start a new
      // undo step rather than coalescing into the step we just reverted.
      lastEditRef.current = null;
      const snap = stack[stack.length - 1];
      const remaining = stack.slice(0, -1);
      const box = undoneBox(data, snap, questionId);
      commit({
        ...data,
        answerInk: { ...data.answerInk, [questionId]: snap.answerInk },
        scratchInk: { ...data.scratchInk, [questionId]: snap.scratchInk },
        borrowMarks: { ...data.borrowMarks, [questionId]: snap.borrowMarks },
        divisionBorrowMarks: {
          ...data.divisionBorrowMarks,
          [questionId]: snap.divisionBorrowMarks,
        },
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
        divisionCarryInk: {
          ...data.divisionCarryInk,
          [questionId]: snap.divisionCarryInk,
        },
        undoStacks: { ...data.undoStacks, [questionId]: remaining },
      });
      return box;
    },
    [commit],
  );

  const clearUndoHistory = useCallback(
    (questionId: string) => {
      const data = sessionRef.current;
      if (!data) return;
      lastEditRef.current = null;
      commit({
        ...data,
        undoStacks: { ...data.undoStacks, [questionId]: [] },
      });
    },
    [commit],
  );

  const markSolved = useCallback(
    (questionId: string) => {
      const data = sessionRef.current;
      if (!data) return;
      if (data.solvedQuestions[questionId]) return;
      commit({
        ...data,
        solvedQuestions: { ...data.solvedQuestions, [questionId]: true },
      });
    },
    [commit],
  );

  const markHinted = useCallback(
    (questionId: string) => {
      const data = sessionRef.current;
      if (!data) return;
      if (data.hintedQuestions[questionId]) return;
      commit({
        ...data,
        hintedQuestions: { ...data.hintedQuestions, [questionId]: true },
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
          recognize(data.answerInk[q.id], q.layout),
        ),
      );
      // Downgrade any Auto-Solved question that recognises as correct from
      // `'correct_first_try'` to `'fixed'` so it shows the Fixed badge and is
      // excluded from the first-try score.
      const results = markFirstAttempt(data.questions, submissions).map((r) => {
        const marked =
          data.solvedQuestions[r.question.id] &&
          r.status === 'correct_first_try'
            ? { ...r, status: 'fixed' as const }
            : r;
        return data.hintedQuestions[r.question.id]
          ? { ...marked, hinted: true }
          : marked;
      });
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
        question.layout,
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
      toggleBorrowMark,
      toggleDivisionBorrowMark,
      updateCarryInk,
      updatePartialInk,
      updateTimesCarryInk,
      updateDivisionDraftInk,
      updateDivisionCarryInk,
      undoLastAction,
      clearUndoHistory,
      markSolved,
      markHinted,
      finish,
      reviewSubmit,
      reset,
    }),
    [
      session,
      start,
      updateAnswerInk,
      updateScratchInk,
      toggleBorrowMark,
      toggleDivisionBorrowMark,
      updateCarryInk,
      updatePartialInk,
      updateTimesCarryInk,
      updateDivisionDraftInk,
      updateDivisionCarryInk,
      undoLastAction,
      clearUndoHistory,
      markSolved,
      markHinted,
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
