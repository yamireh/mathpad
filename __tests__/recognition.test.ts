import DigitalInk, { type Stroke } from '../modules/digital-ink';
import {
  isModelReady,
  prepareModel,
  recognizeDigit,
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
