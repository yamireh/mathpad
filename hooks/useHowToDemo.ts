/**
 * Local, throwaway ink state for the How-to demo — everything QuestionWorkspace
 * needs to render and be auto-solved, without touching the real practice
 * session. Mirrors the session's per-question ink reducers for a single
 * question, plus a `reset()` so the demo can replay from blank.
 */
import { useCallback, useMemo, useState } from 'react';

import {
  type AnswerInk,
  emptyAnswerInk,
  type InkStroke,
} from '../components/domain/ink';
import { answerShape } from '../components/domain/layout';
import type { Question } from '../types';

/** Set `[a][b] = strokes` in a 2-deep array, growing it as needed. */
function set2D(
  rows: InkStroke[][][],
  a: number,
  b: number,
  strokes: InkStroke[],
): InkStroke[][][] {
  const next = [...rows];
  while (next.length <= a) next.push([]);
  const row = [...next[a]];
  while (row.length <= b) row.push([]);
  row[b] = strokes;
  next[a] = row;
  return next;
}

export function useHowToDemo(question: Question) {
  const empty = useMemo(
    () => emptyAnswerInk(answerShape(question)),
    [question],
  );
  const [answerInk, setAnswerInk] = useState<AnswerInk>(empty);
  const [scratchInk, setScratchInk] = useState<InkStroke[]>([]);
  const [borrowMarks, setBorrowMarks] = useState<number[]>([]);
  const [divisionBorrowMarks, setDivisionBorrowMarks] = useState<number[][]>([]);
  const [carryInk, setCarryInk] = useState<InkStroke[][]>([]);
  const [partialInk, setPartialInk] = useState<InkStroke[][][]>([]);
  const [timesCarryInk, setTimesCarryInk] = useState<InkStroke[][][]>([]);
  const [divisionDraftInk, setDivisionDraftInk] = useState<InkStroke[][][]>([]);
  const [divisionCarryInk, setDivisionCarryInk] = useState<InkStroke[][][]>([]);

  const reset = useCallback(() => {
    setAnswerInk(empty);
    setScratchInk([]);
    setBorrowMarks([]);
    setDivisionBorrowMarks([]);
    setCarryInk([]);
    setPartialInk([]);
    setTimesCarryInk([]);
    setDivisionDraftInk([]);
    setDivisionCarryInk([]);
  }, [empty]);

  const onToggleBorrow = useCallback((column: number) => {
    setBorrowMarks((cur) =>
      cur.includes(column)
        ? cur.filter((c) => c !== column)
        : [...cur, column],
    );
  }, []);

  const onToggleDivisionBorrow = useCallback(
    (step: number, lenderIndex: number) => {
      setDivisionBorrowMarks((cur) => {
        const next = cur.map((s) => [...(s ?? [])]);
        while (next.length <= step) next.push([]);
        const lenders = next[step];
        next[step] = lenders.includes(lenderIndex)
          ? lenders.filter((l) => l !== lenderIndex)
          : [...lenders, lenderIndex];
        return next;
      });
    },
    [],
  );

  const onCarryInkChange = useCallback(
    (column: number, strokes: InkStroke[]) => {
      setCarryInk((cur) => {
        const next = [...cur];
        while (next.length <= column) next.push([]);
        next[column] = strokes;
        return next;
      });
    },
    [],
  );

  const onPartialInkChange = useCallback(
    (row: number, col: number, strokes: InkStroke[]) =>
      setPartialInk((cur) => set2D(cur, row, col, strokes)),
    [],
  );
  const onTimesCarryInkChange = useCallback(
    (partialRow: number, op1Col: number, strokes: InkStroke[]) =>
      setTimesCarryInk((cur) => set2D(cur, partialRow, op1Col, strokes)),
    [],
  );
  const onDivisionDraftInkChange = useCallback(
    (row: number, col: number, strokes: InkStroke[]) =>
      setDivisionDraftInk((cur) => set2D(cur, row, col, strokes)),
    [],
  );
  const onDivisionCarryInkChange = useCallback(
    (step: number, col: number, strokes: InkStroke[]) =>
      setDivisionCarryInk((cur) => set2D(cur, step, col, strokes)),
    [],
  );

  /** Props to spread straight into QuestionWorkspace. */
  const workspaceProps = {
    answerInk,
    onAnswerInkChange: setAnswerInk,
    scratchInk,
    onScratchInkChange: setScratchInk,
    borrowMarks,
    onToggleBorrow,
    divisionBorrowMarks,
    onToggleDivisionBorrow,
    carryInk,
    onCarryInkChange,
    partialInk,
    onPartialInkChange,
    timesCarryInk,
    onTimesCarryInkChange,
    divisionDraftInk,
    onDivisionDraftInkChange,
    divisionCarryInk,
    onDivisionCarryInkChange,
    canUndo: false,
    onUndo: () => {},
    onClearUndoHistory: () => {},
    onSolved: () => {},
    errorMarks: null,
  } as const;

  return { workspaceProps, reset };
}
