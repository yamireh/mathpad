/**
 * Parent Pro — Assigned Exams: shared types.
 *
 * An exam is a fixed set of questions a parent assigns to children. It reuses
 * the existing `Question` shape (serializable) and `Settings` (how the questions
 * were generated). See `docs/parent-pro-exams.md`.
 */
import type {
  Operation,
  Question,
  QuestionResult,
  Settings,
} from '../../types';

/** An exam as authored by a parent and stored at the family level. */
export interface Exam {
  /** Firestore doc id. */
  id: string;
  title: string;
  /** Parent uid who created it. */
  createdBy: string;
  /** Child ids this exam is assigned to. */
  assignedTo: string[];
  /** The operation (or `mix`) the set was generated from. */
  operation: Operation;
  /** Settings used to generate the questions (kept for reference / retake). */
  settings: Settings;
  /** The fixed question list the child answers. */
  questions: Question[];
  /** ISO creation timestamp. */
  createdAt?: string;
  /** Optional ISO due date. */
  dueAt?: string;
}

/** A child's submitted result for one exam (stored under the child doc). */
export interface ExamResult {
  examId: string;
  /** ISO submission timestamp. */
  submittedAt: string;
  totalQuestions: number;
  finalScore: number;
  /** Full per-question breakdown, so the parent sees the same result page the
   *  kid would — status, the kid's answer, hints — read-only. */
  questions: QuestionResult[];
}

/** An exam plus (optionally) this child's result — for list views. */
export interface ExamWithResult {
  exam: Exam;
  result: ExamResult | null;
}
