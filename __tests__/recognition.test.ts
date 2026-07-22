import DigitalInk, { type Stroke } from '../modules/digital-ink';
import {
  isModelReady,
  prepareModel,
  recognizeDigit,
  recognizeNumber,
  recognizeSign,
} from '../lib/recognition';

const recognize = DigitalInk.recognize as jest.Mock;
const isDownloaded = DigitalInk.isModelDownloaded as jest.Mock;
const download = DigitalInk.downloadModel as jest.Mock;

/** One non-empty stroke (a couple of timed points). */
const strokes: Stroke[] = [
  [
    [0, 0, 0],
    [5, 8, 12],
  ],
];

beforeEach(() => {
  jest.clearAllMocks();
  isDownloaded.mockResolvedValue(true);
  download.mockResolvedValue(undefined);
  recognize.mockResolvedValue([]);
});

describe('recognizeDigit', () => {
  it('returns the recognised digit', async () => {
    recognize.mockResolvedValueOnce([{ text: '7', score: 0.92 }]);
    expect(await recognizeDigit(strokes)).toEqual({
      digit: 7,
      confidence: 0.92,
      raw: '7',
    });
  });

  it('post-filters past non-digit candidates', async () => {
    recognize.mockResolvedValueOnce([
      { text: 'T', score: 0.8 },
      { text: '7', score: 0.6 },
    ]);
    const result = await recognizeDigit(strokes);
    expect(result.digit).toBe(7);
    expect(result.raw).toBe('T');
  });

  it('returns null when no candidate is a digit', async () => {
    recognize.mockResolvedValueOnce([{ text: 'X', score: 0.5 }]);
    expect(await recognizeDigit(strokes)).toEqual({
      digit: null,
      confidence: null,
      raw: 'X',
    });
  });

  it('returns null for empty strokes without calling the engine', async () => {
    expect(await recognizeDigit([])).toEqual({
      digit: null,
      confidence: null,
      raw: null,
    });
    expect(recognize).not.toHaveBeenCalled();
  });

  it('overrides ML Kit when a "1" was misread as 7 (tall narrow vertical line)', async () => {
    // ML Kit's guess: 7. But the strokes are a clear `1` — narrow + tall,
    // no top bar to speak of.
    recognize.mockResolvedValueOnce([{ text: '7', score: 0.6 }]);
    const oneStrokes: Stroke[] = [
      [
        [10, 0, 0],
        [10, 50, 50], // straight vertical
      ],
    ];
    expect((await recognizeDigit(oneStrokes)).digit).toBe(1);
  });

  it('overrides ML Kit when a "7" was misread as 1 (top bar + diagonal)', async () => {
    // ML Kit's guess: 1. Strokes describe a clear 7: a long horizontal
    // top followed by a diagonal down to the lower left.
    recognize.mockResolvedValueOnce([{ text: '1', score: 0.6 }]);
    const sevenStrokes: Stroke[] = [
      [
        [0, 0, 0],
        [30, 0, 5], // top horizontal
        [10, 50, 30], // diagonal down
      ],
    ];
    expect((await recognizeDigit(sevenStrokes)).digit).toBe(7);
  });

  it('classifies a moderately-wide stroke as 7 via aspect-ratio fallback', async () => {
    // A single short diagonal — width ≈ 5, height ≈ 8 → aspect 0.625
    // which sits above the "definitely 7" threshold.
    recognize.mockResolvedValueOnce([{ text: '7', score: 0.92 }]);
    const wideish: Stroke[] = [
      [
        [0, 0, 0],
        [5, 8, 12],
      ],
    ];
    expect((await recognizeDigit(wideish)).digit).toBe(7);
  });
});

describe('recognizeSign', () => {
  it('recognises a minus sign', async () => {
    recognize.mockResolvedValueOnce([{ text: '-', score: 0.7 }]);
    expect((await recognizeSign(strokes)).sign).toBe('minus');
  });

  it('accepts unicode dash forms', async () => {
    recognize.mockResolvedValueOnce([{ text: '−', score: 0.7 }]);
    expect((await recognizeSign(strokes)).sign).toBe('minus');
  });

  it('returns null for a non-minus candidate', async () => {
    recognize.mockResolvedValueOnce([{ text: '1', score: 0.9 }]);
    expect((await recognizeSign(strokes)).sign).toBeNull();
  });
});

describe('recognizeNumber', () => {
  it('recognises a whole multi-digit number', async () => {
    recognize.mockResolvedValueOnce([{ text: '34', score: 0.9 }]);
    expect(await recognizeNumber(strokes)).toEqual({
      integerDigits: [3, 4],
      decimalDigits: [],
      raw: '34',
    });
  });

  it('parses a decimal point', async () => {
    recognize.mockResolvedValueOnce([{ text: '3.75', score: 0.9 }]);
    const result = await recognizeNumber(strokes);
    expect(result.integerDigits).toEqual([3]);
    expect(result.decimalDigits).toEqual([7, 5]);
  });

  it('accepts a comma as the decimal separator', async () => {
    recognize.mockResolvedValueOnce([{ text: '3,5', score: 0.9 }]);
    const result = await recognizeNumber(strokes);
    expect(result.integerDigits).toEqual([3]);
    expect(result.decimalDigits).toEqual([5]);
  });

  it('returns empty digits for a non-number', async () => {
    recognize.mockResolvedValueOnce([{ text: 'hello', score: 0.5 }]);
    expect((await recognizeNumber(strokes)).integerDigits).toEqual([]);
  });

  it('returns empty for empty strokes', async () => {
    expect(await recognizeNumber([])).toEqual({
      integerDigits: [],
      decimalDigits: [],
      raw: null,
    });
  });

  it('fixes a 1 misread as 7 per-digit (single tall vertical)', async () => {
    recognize.mockResolvedValueOnce([{ text: '7', score: 0.6 }]);
    const one: Stroke[] = [
      [
        [10, 0, 0],
        [10, 50, 50], // straight vertical → a clear 1
      ],
    ];
    expect((await recognizeNumber(one)).integerDigits).toEqual([1]);
  });

  it('fixes 11 misread as 77 (both digits, two clusters)', async () => {
    recognize.mockResolvedValueOnce([{ text: '77', score: 0.6 }]);
    const eleven: Stroke[] = [
      [
        [10, 0, 0],
        [10, 50, 50], // left vertical
      ],
      [
        [40, 0, 0],
        [40, 50, 50], // right vertical, clear X gap
      ],
    ];
    expect((await recognizeNumber(eleven)).integerDigits).toEqual([1, 1]);
  });

  it('recovers 11 from bare verticals ML Kit read as non-numeric', async () => {
    recognize
      .mockResolvedValueOnce([{ text: 'll', score: 0.5 }]) // whole read fails
      .mockResolvedValueOnce([{ text: '1', score: 0.9 }]) // left cluster
      .mockResolvedValueOnce([{ text: '1', score: 0.9 }]); // right cluster
    const eleven: Stroke[] = [
      [
        [10, 0, 0],
        [10, 50, 50],
      ],
      [
        [40, 0, 0],
        [40, 50, 50],
      ],
    ];
    expect((await recognizeNumber(eleven)).integerDigits).toEqual([1, 1]);
  });

  it('leaves a decimal reading untouched (no per-digit refinement)', async () => {
    recognize.mockResolvedValueOnce([{ text: '1.5', score: 0.9 }]);
    const result = await recognizeNumber(strokes);
    expect(result.integerDigits).toEqual([1]);
    expect(result.decimalDigits).toEqual([5]);
  });
});

describe('model lifecycle', () => {
  it('isModelReady reflects the engine', async () => {
    isDownloaded.mockResolvedValueOnce(false);
    expect(await isModelReady()).toBe(false);
  });

  it('prepareModel downloads only when the model is missing', async () => {
    isDownloaded.mockResolvedValueOnce(false);
    await prepareModel();
    expect(download).toHaveBeenCalledTimes(1);

    isDownloaded.mockResolvedValueOnce(true);
    await prepareModel();
    expect(download).toHaveBeenCalledTimes(1); // unchanged
  });
});
