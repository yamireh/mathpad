/**
 * Decimal vertical layout — column geometry + solver mapping for decimal
 * addition. Locks the grid math (the dot is just a visual separator; carries
 * cross it).
 */
import {
  answerShape,
  gridDigits,
  verticalGeometry,
} from '../components/domain/layout';
import { generateSession } from '../lib/questionGenerator';
import { computeSolvePlan } from '../lib/solver/solveValues';
import type { BaseSettings, Question } from '../types';

const base: BaseSettings = {
  digitCounts: [2],
  questionCount: 20,
  timer: { enabled: false, durationMinutes: 5 },
};

const additionDecimal = (
  operands: [number, number],
  operandDecimals: [number, number],
  value: number,
  decimalPlaces: number,
): Question => ({
  id: 'q',
  operation: 'addition',
  operands,
  operandDecimals,
  answer: { kind: 'decimal', value, decimalPlaces },
  layout: 'vertical',
});

describe('decimal vertical layout', () => {
  it('gridDigits aligns operands on the dot (leading/trailing zero pad)', () => {
    expect(gridDigits(12.5, 2, 2)).toEqual([1, 2, 5, 0]);
    expect(gridDigits(3.75, 2, 2)).toEqual([0, 3, 7, 5]);
  });

  it('geometry + shape for 0.7 + 0.5', () => {
    const q = additionDecimal([0.7, 0.5], [1, 1], 1.2, 1);
    expect(verticalGeometry(q)).toEqual({ intCols: 1, decCols: 1 });
    expect(answerShape(q)).toMatchObject({ integerBoxes: 1, decimalBoxes: 1 });
  });

  it('0.7 + 0.5: carry crosses the dot into the units box', () => {
    const { values } = computeSolvePlan(additionDecimal([0.7, 0.5], [1, 1], 1.2, 1), 'vertical');
    expect(values.get('dec-0')).toBe(2); // tenths: 7+5=12 → 2
    expect(values.get('carry-0')).toBe(1); // carry into units (left of dot)
    expect(values.get('int-0')).toBe(1); // units: 0+0+1
  });

  it('12.5 + 3.75 = 16.25', () => {
    const { values } = computeSolvePlan(
      additionDecimal([12.5, 3.75], [1, 2], 16.25, 2),
      'vertical',
    );
    expect(values.get('dec-1')).toBe(5); // hundredths
    expect(values.get('dec-0')).toBe(2); // tenths (5+7=12 → 2, carry)
    expect(values.get('carry-1')).toBe(1); // carry from tenths into units
    expect(values.get('int-1')).toBe(6); // units 2+3+1
    expect(values.get('int-0')).toBe(1); // tens
  });

  it('subtraction 1.2 − 0.5 = 0.7: borrow crosses the dot (units → tenths)', () => {
    const q: Question = {
      id: 'q',
      operation: 'subtraction',
      operands: [1.2, 0.5],
      operandDecimals: [1, 1],
      answer: { kind: 'decimal', value: 0.7, decimalPlaces: 1 },
      layout: 'vertical',
    };
    const plan = computeSolvePlan(q, 'vertical');
    expect(plan.values.get('dec-0')).toBe(7); // tenths: 12 − 5
    expect(plan.values.get('int-0')).toBe(0); // units: 0 − 0 after lending
    expect(plan.borrows).toEqual([0]); // tap the units (col 0), left of the dot
  });

  it('multiplication 2.5 × 3 = 7.5 (single-digit multiplier)', () => {
    const q: Question = {
      id: 'q',
      operation: 'multiplication',
      operands: [2.5, 3],
      operandDecimals: [1, 0],
      answer: { kind: 'decimal', value: 7.5, decimalPlaces: 1 },
      layout: 'vertical',
    };
    const { values } = computeSolvePlan(q, 'vertical');
    expect(values.get('int-0')).toBe(7); // 25 × 3 = 75 → point placed → 7.5
    expect(values.get('dec-0')).toBe(5);
  });

  it('multiplication 2.5 × 1.25 = 3.125 (digit strings → product, point placed)', () => {
    const q: Question = {
      id: 'q',
      operation: 'multiplication',
      operands: [2.5, 1.25],
      operandDecimals: [1, 2],
      answer: { kind: 'decimal', value: 3.125, decimalPlaces: 3 },
      layout: 'vertical',
    };
    const { values } = computeSolvePlan(q, 'vertical');
    // 25 × 125 = 3125 → 3 decimal places → 3.125
    expect(values.get('int-0')).toBe(3);
    expect(values.get('dec-0')).toBe(1);
    expect(values.get('dec-1')).toBe(2);
    expect(values.get('dec-2')).toBe(5);
  });

  it('generator: decimals=on yields decimal questions with operandDecimals', () => {
    const add = generateSession({
      ...base,
      operation: 'addition',
      carrying: 'random',
      decimals: 'on',
    });
    for (const q of add) {
      expect(q.answer.kind).toBe('decimal');
      expect(q.operandDecimals).toBeDefined();
    }
  });

  it('generator: × caps the product at ≤ 3 decimal places', () => {
    const mul = generateSession({
      ...base,
      operation: 'multiplication',
      regrouping: 'random',
      decimals: 'on',
    });
    for (const q of mul) {
      expect(q.answer.kind).toBe('decimal');
      if (q.answer.kind === 'decimal') {
        expect(q.answer.decimalPlaces).toBeLessThanOrEqual(3);
      }
    }
  });
});
