/**
 * Parent Pro — Assigned Exams: types barrel.
 *
 * The exam data shapes. The Firestore layer lives in `lib/firebase/exams.ts`;
 * the questions are generated with the existing `generateSession`.
 */
export type { Exam, ExamResult, ExamWithResult } from './types';
export { nextExamTitle } from './naming';
export {
  parseProblem,
  parseCustomProblems,
  type ParsedProblem,
  type ParseCustomResult,
} from './parse';
