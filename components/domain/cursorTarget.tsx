/**
 * Cursor-target context — lets the writing pad tell the demo HandCursor where
 * its drawing surface is, so the hand can hover there and "scribble" each
 * digit (mirroring what the kid does), without prop-drilling through the
 * panels.
 *
 * It is deliberately inert during normal practice: `enabled` is false, so the
 * pad never measures itself and there is zero overhead. `OperationsWorkspace`
 * flips `enabled` on for the duration of an auto-solve and renders the hand.
 */
import { createContext, useContext } from 'react';

/** A point (relative to the workspace root) the hand should hover at. */
export interface CursorTarget {
  x: number;
  y: number;
}

/** Minimal shape of a measurable host node (RN `View` ref). */
export interface MeasurableNode {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
}

export interface CursorTargetValue {
  /** When true, the pad/borrow cells measure + report themselves. */
  enabled: boolean;
  /**
   * Report the pad's drawing-surface host node so the hand can hover over it.
   * Pass `null` to clear. A no-op when `enabled` is false.
   */
  reportPad: (node: MeasurableNode | null) => void;
  /**
   * Register/unregister a borrow-lender digit's host node by its column index,
   * so the solver can move the hand there *before* triggering the borrow. Pass
   * `null` to unregister.
   */
  registerBorrowCell: (column: number, node: MeasurableNode | null) => void;
}

const CursorTargetContext = createContext<CursorTargetValue>({
  enabled: false,
  reportPad: () => {},
  registerBorrowCell: () => {},
});

export const CursorTargetProvider = CursorTargetContext.Provider;

/** Read the demo cursor wiring from inside the pad. */
export function useCursorTarget(): CursorTargetValue {
  return useContext(CursorTargetContext);
}
