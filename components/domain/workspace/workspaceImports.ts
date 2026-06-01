/**
 * Re-exports the handful of `domain/` types the workspace folder needs.
 * Lets types.ts and the body components import everything from one place
 * without reaching back into the parent folder.
 */
export type { AnswerInk, InkStroke } from '../ink';
export type { AnswerShape } from '../layout';
export type { ScratchCanvasHandle } from '../ScratchCanvas';
export type { MultiplicationInfo, RowCol } from './boxIds';
