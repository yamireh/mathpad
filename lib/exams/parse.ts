/**
 * Parse parent-entered custom problems (e.g. "24*6", "100 - 45", "48/6") into
 * real `Question`s the practice workspace can render + mark. Integer +/−/×/÷
 * only. Pure + testable.
 */
import type { ConcreteOperation, Question, QuestionAnswer } from '../../types';

const OP_MAP: Record<string, ConcreteOperation> = {
  '+': 'addition',
  '-': 'subtraction',
  '−': 'subtraction',
  '*': 'multiplication',
  x: 'multiplication',
  X: 'multiplication',
  '×': 'multiplication',
  '/': 'division',
  '÷': 'division',
};

/** One parsed problem, or an error for that line. */
export type ParsedProblem =
  | { ok: true; core: Omit<Question, 'id'> }
  | { ok: false; input: string };

/** Parse a single "a <op> b" line. Whole numbers only. */
export function parseProblem(input: string): ParsedProblem {
  const raw = input.trim();
  if (raw === '') return { ok: false, input };
  const m = /^(\d+)\s*([+\-−*xX×/÷])\s*(\d+)$/.exec(raw);
  if (!m) return { ok: false, input };
  const a = Number(m[1]);
  const b = Number(m[3]);
  const operation = OP_MAP[m[2]];
  if (!operation) return { ok: false, input };

  let operands: [number, number];
  let answer: QuestionAnswer;
  let layout: Question['layout'] = 'vertical';

  switch (operation) {
    case 'addition':
      operands = [a, b];
      answer = { kind: 'integer', value: a + b };
      break;
    case 'subtraction':
      // Keep it non-negative — put the larger number on top.
      operands = [Math.max(a, b), Math.min(a, b)];
      answer = { kind: 'integer', value: Math.abs(a - b) };
      break;
    case 'multiplication':
      // Standard column layout stacks the larger operand on top.
      operands = [Math.max(a, b), Math.min(a, b)];
      answer = { kind: 'integer', value: a * b };
      break;
    case 'division': {
      if (b === 0 || a < b) return { ok: false, input }; // need a real division
      operands = [a, b];
      const quotient = Math.floor(a / b);
      const remainder = a % b;
      answer =
        remainder === 0
          ? { kind: 'integer', value: quotient }
          : { kind: 'remainder', quotient, remainder };
      layout = 'divisionLong';
      break;
    }
  }

  return { ok: true, core: { operation, operands, answer, layout } };
}

export interface ParseCustomResult {
  questions: Question[];
  /** Lines that couldn't be parsed (shown back to the parent). */
  errors: string[];
}

/**
 * Parse a block of problems (one per line). Blank lines are ignored. Each valid
 * line becomes a `Question` with a stable session id (`q-1`, `q-2`, …).
 */
export function parseCustomProblems(text: string): ParseCustomResult {
  const questions: Question[] = [];
  const errors: string[] = [];
  const lines = text.split('\n').map((l) => l.trim());
  for (const line of lines) {
    if (line === '') continue;
    const parsed = parseProblem(line);
    if (parsed.ok) {
      questions.push({ id: `q-${questions.length + 1}`, ...parsed.core });
    } else {
      errors.push(line);
    }
  }
  return { questions, errors };
}
