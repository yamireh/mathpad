import { fieldDigits } from '../components/domain/clock/answerDigits';
import type { InkStroke } from '../components/domain/ink';
import { recognizeNumber } from '../lib/recognition';

jest.mock('../lib/recognition', () => ({
  recognizeNumber: jest.fn(),
}));

const mockRecognize = recognizeNumber as jest.MockedFunction<
  typeof recognizeNumber
>;

describe('clock — fieldDigits', () => {
  beforeEach(() => mockRecognize.mockReset());

  it('trusts a converted field verbatim and never re-recognizes', async () => {
    // Regression: the field already recognized (and printed) these digits.
    // Re-recognizing the regenerated glyph is what turned a written "1" into
    // "7" on the results screen — so digits must be used as-is.
    const digits = await fieldDigits({ strokes: [], digits: [1] });
    expect(digits).toEqual([1]);
    expect(mockRecognize).not.toHaveBeenCalled();
  });

  it('recognizes raw handwriting only when the field has not converted', async () => {
    mockRecognize.mockResolvedValue({
      integerDigits: [1, 2],
      decimalDigits: [],
      raw: '12',
    });
    const strokes: InkStroke[] = [
      [
        [0, 0, 0],
        [1, 1, 8],
      ],
    ];
    const digits = await fieldDigits({ strokes, digits: null });
    expect(digits).toEqual([1, 2]);
    expect(mockRecognize).toHaveBeenCalledWith(strokes);
  });

  it('reports an empty answer for an empty, unconverted field', async () => {
    mockRecognize.mockResolvedValue({
      integerDigits: [],
      decimalDigits: [],
      raw: null,
    });
    expect(await fieldDigits({ strokes: [], digits: null })).toEqual([]);
  });
});
