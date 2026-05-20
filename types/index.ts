/**
 * Shared, app-wide TypeScript types.
 *
 * Domain types that span multiple features live here. Feature-local types
 * (recognition results, storage shapes, etc.) stay co-located with their
 * adapters in /lib.
 */

/**
 * A practice topic. The four arithmetic operations plus `mix`, which
 * randomises across all four within a single session.
 */
export type Operation =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'mix';

/**
 * A single concrete operation — an `Operation` that can back one generated
 * question. Excludes `mix`, which is a session-level mode rather than a
 * per-question operation.
 */
export type ConcreteOperation = Exclude<Operation, 'mix'>;
