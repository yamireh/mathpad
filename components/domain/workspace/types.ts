/**
 * WorkspaceCore — the state, refs, and handlers the practice workspace
 * threads through to its per-operation panels and per-layout bodies.
 *
 * The outer dispatcher (`OperationsWorkspace` / `QuestionWorkspace`)
 * builds this object once per render. Per-operation panels
 * (`AdditionPanel`, `SubtractionPanel`, …) and per-layout bodies
 * (`CompactBody`, `DivisionBody`) receive it as a single `core` prop
 * instead of dozens of individual props.
 */
import type { MutableRefObject, RefObject } from 'react';

import type {
  AnswerInk,
  AnswerShape,
  InkStroke,
  MultiplicationInfo,
  RowCol,
  ScratchCanvasHandle,
} from './workspaceImports';
import type { LongDivisionStepMinuend } from '../layout';
import type { ProblemLayout, Question } from '../../../types';

export interface WorkspaceCore {
  /* --- Inputs (pass-through from props) --- */
  question: Question;
  layout: ProblemLayout;
  tone: string;
  answerInk: AnswerInk;
  onAnswerInkChange: (ink: AnswerInk) => void;
  scratchInk?: InkStroke[];
  onScratchInkChange: (strokes: InkStroke[]) => void;
  borrowMarks?: number[];
  onToggleBorrow?: (column: number) => void;
  divisionBorrowMarks?: number[][];
  onToggleDivisionBorrow?: (step: number, lenderIndex: number) => void;
  carryInk?: InkStroke[][];
  onCarryInkChange?: (column: number, strokes: InkStroke[]) => void;
  partialInk?: InkStroke[][][];
  onPartialInkChange?: (
    row: number,
    col: number,
    strokes: InkStroke[],
  ) => void;
  timesCarryInk?: InkStroke[][][];
  onTimesCarryInkChange?: (
    partialRow: number,
    op1Col: number,
    strokes: InkStroke[],
  ) => void;
  divisionDraftInk?: InkStroke[][][];
  onDivisionDraftInkChange?: (
    row: number,
    col: number,
    strokes: InkStroke[],
  ) => void;
  divisionCarryInk?: InkStroke[][][];
  onDivisionCarryInkChange?: (
    step: number,
    col: number,
    strokes: InkStroke[],
  ) => void;
  onUndo?: () => void;
  canUndo: boolean;
  onLayoutChange?: (layout: ProblemLayout) => void;

  /* --- Derived once per render --- */
  shape: AnswerShape;
  isLongDivision: boolean;
  inlineLayout: ProblemLayout;
  expectedCarries: boolean[] | null;
  multInfo: MultiplicationInfo | null;
  partialShape: number[] | null;
  /** Per quotient step, the divisor columns (from left) that get a carry box. */
  divisionStepCarryCols: number[][];
  /** Per-step subtraction minuends (chunk above each product) for borrowing. */
  divisionStepMinuends: LongDivisionStepMinuend[];
  /** Draft rows (by `dd` row index) that render as locked read-only labels. */
  lockedDraftRows: Set<number>;
  /** Correct digit per long-division draft cell id (`dd-{row}-{col}`) for labels. */
  draftLabels: Map<string, number>;
  windowWidth: number;

  /* --- Box-id splits for the active box --- */
  activeBox: string | null;
  activeCarryColumn: number;
  activePartial: RowCol | null;
  activeTimesCarry: RowCol | null;
  activeDivisionDraft: RowCol | null;
  activeDivisionCarry: RowCol | null;

  /* --- Reactive state --- */
  padCollapsed: boolean;
  padNonce: number;
  bringDownPulse: { cellId: string; nonce: number } | null;
  currentPartialRow: number;
  currentDivisionStep: number;

  /* --- Mutable refs --- */
  scratchRef: RefObject<ScratchCanvasHandle | null>;
  advanceTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  lastStrokeCountRef: MutableRefObject<number>;
  latestInkRef: MutableRefObject<AnswerInk>;
  latestCarryInkRef: MutableRefObject<InkStroke[][] | undefined>;
  latestPartialInkRef: MutableRefObject<InkStroke[][][] | undefined>;
  latestTimesCarryRef: MutableRefObject<InkStroke[][][] | undefined>;
  latestDivisionDraftRef: MutableRefObject<InkStroke[][][] | undefined>;
  latestDivisionCarryRef: MutableRefObject<InkStroke[][][] | undefined>;

  /* --- Setters --- */
  setActiveBox: (id: string | null) => void;
  setPadCollapsed: (next: boolean | ((prev: boolean) => boolean)) => void;
  setPadNonce: (next: number | ((prev: number) => number)) => void;

  /* --- Handlers --- */
  selectBox: (boxId: string) => void;
  clearBox: (boxId: string) => void;
  clearAllAnswers: () => void;
  cancelAdvance: () => void;
}
