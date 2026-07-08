/**
 * Entitlement logic — which operations are free vs. paid.
 *
 * MathPad's V1 monetization (see the `pricing` skill): Addition is free; the
 * remaining operations (Subtraction, Multiplication, Division, Mix) unlock
 * together via one non-consumable in-app purchase. Pure logic only — the
 * purchase/StoreKit side-effects live in `hooks/usePurchases`.
 */
import type { Operation } from '../../types';

/** App Store Connect product id for the Operations bundle ($9.99). */
export const OPERATIONS_PRODUCT_ID = 'com.mc.mathpad.operations';

/** App Store Connect product id for the Clock module ($7.99). */
export const CLOCK_PRODUCT_ID = 'com.mc.mathpad.clock';

/** Whether the Clock module is playable — only once it's owned (or via the
 *  future Complete bundle). Pure mirror of {@link isOperationUnlocked}. */
export function isClockUnlocked(owned: boolean): boolean {
  return owned;
}

/** Operations that are always free, with no purchase required. */
export const FREE_OPERATIONS: readonly Operation[] = ['addition'];

/** Whether an operation is free for everyone (no purchase needed). */
export function isOperationFree(operation: Operation): boolean {
  return FREE_OPERATIONS.includes(operation);
}

/**
 * Whether an operation is currently playable: always for the free ones, and
 * for the rest only once the Operations bundle is owned.
 */
export function isOperationUnlocked(
  operation: Operation,
  owned: boolean,
): boolean {
  return isOperationFree(operation) || owned;
}
