import { recognizeAnswerCell } from '../components/domain/workspace';
import type { InkStroke } from '../components/domain/ink';

/** A one-point stroke — enough to count as "has ink". */
const stroke = (): InkStroke => [{ x: 0, y: 0 }] as unknown as InkStroke;

describe('recognizeAnswerCell', () => {
  it('skips an empty cell without calling the recognizer', async () => {
    const recognize = jest.fn();
    const verdict = await recognizeAnswerCell([], recognize);
    expect(verdict).toEqual({ kind: 'skip' });
    expect(recognize).not.toHaveBeenCalled();
  });

  it('returns the digit when recognition succeeds', async () => {
    const recognize = jest.fn().mockResolvedValue({ digit: 0 });
    const verdict = await recognizeAnswerCell([stroke()], recognize);
    expect(verdict).toEqual({ kind: 'ok', digit: 0 });
  });

  it('flags unreadable ink as invalid', async () => {
    const recognize = jest.fn().mockResolvedValue({ digit: null });
    const verdict = await recognizeAnswerCell([stroke()], recognize);
    expect(verdict).toEqual({ kind: 'invalid' });
  });

  it('fails open (skip, never invalid) when the recognizer throws', async () => {
    const recognize = jest.fn().mockRejectedValue(new Error('model not ready'));
    const verdict = await recognizeAnswerCell([stroke()], recognize);
    expect(verdict).toEqual({ kind: 'skip' });
  });
});
