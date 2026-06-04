import {
  FREE_OPERATIONS,
  OPERATIONS_PRODUCT_ID,
  isOperationFree,
  isOperationUnlocked,
} from '../lib/entitlement';
import type { Operation } from '../types';

const ALL: Operation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'mix',
];

describe('entitlement', () => {
  it('only Addition is free', () => {
    expect(FREE_OPERATIONS).toEqual(['addition']);
    expect(isOperationFree('addition')).toBe(true);
    for (const op of ALL.filter((o) => o !== 'addition')) {
      expect(isOperationFree(op)).toBe(false);
    }
  });

  it('free operations are always unlocked, owned or not', () => {
    expect(isOperationUnlocked('addition', false)).toBe(true);
    expect(isOperationUnlocked('addition', true)).toBe(true);
  });

  it('paid operations are locked until owned, then unlocked', () => {
    for (const op of ALL.filter((o) => o !== 'addition')) {
      expect(isOperationUnlocked(op, false)).toBe(false);
      expect(isOperationUnlocked(op, true)).toBe(true);
    }
  });

  it('exposes the Operations bundle product id', () => {
    expect(OPERATIONS_PRODUCT_ID).toBe('com.mc.mathpad.operations');
  });
});
