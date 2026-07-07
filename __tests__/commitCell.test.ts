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
    const recognize = jest.fn().mockResolvedValue({ digit: 0, raw: '0' });
    const verdict = await recognizeAnswerCell([stroke()], recognize);
    expect(verdict).toEqual({ kind: 'ok', digit: 0 });
  });

  it('flags unreadable ink as invalid', async () => {
    const recognize = jest.fn().mockResolvedValue({ digit: null, raw: null });
    const verdict = await recognizeAnswerCell([stroke()], recognize);
    expect(verdict).toEqual({ kind: 'invalid' });
  });

  it('flags two digits in one box as multi (before taking the first)', async () => {
    // Recognizer grabbed a single digit, but its raw guess shows two — reject.
    const recognize = jest.fn().mockResolvedValue({ digit: 2, raw: '23' });
    const verdict = await recognizeAnswerCell([stroke()], recognize);
    expect(verdict).toEqual({ kind: 'multi' });
  });

  it('treats a single-digit raw as ok, not multi', async () => {
    const recognize = jest.fn().mockResolvedValue({ digit: 7, raw: '7' });
    const verdict = await recognizeAnswerCell([stroke()], recognize);
    expect(verdict).toEqual({ kind: 'ok', digit: 7 });
  });

  it('fails open (skip, never invalid) when the recognizer throws', async () => {
    const recognize = jest.fn().mockRejectedValue(new Error('model not ready'));
    const verdict = await recognizeAnswerCell([stroke()], recognize);
    expect(verdict).toEqual({ kind: 'skip' });
  });
});
