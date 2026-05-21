/**
 * useRecognition — recognition-model lifecycle and answer recognition.
 *
 * Prepares the ML Kit model on mount (a one-time, online setup step) and
 * exposes a helper that turns a whole answer area's ink into a SubmittedAnswer.
 */
import { useCallback, useEffect, useState } from 'react';

import { type AnswerInk } from '../components/domain';
import {
  prepareModel,
  recognizeDigit,
  recognizeSign,
} from '../lib/recognition';
import type { InkStroke } from '../components/domain';
import type { SubmittedAnswer } from '../types';

/** Status of the on-device recognition model. */
export type RecognitionStatus = 'preparing' | 'ready' | 'error';

/** Turns a whole answer area's ink into a recognised answer. */
export type AnswerRecognizer = (ink: AnswerInk) => Promise<SubmittedAnswer>;

export interface UseRecognitionResult {
  status: RecognitionStatus;
  /** Re-attempt model preparation after an error. */
  retry: () => void;
  recognizeAnswer: AnswerRecognizer;
}

/** Recognise one box's ink into a digit (null when the box is blank). */
async function recognizeBox(strokes: InkStroke[]): Promise<number | null> {
  if (strokes.length === 0) return null;
  return (await recognizeDigit(strokes)).digit;
}

export function useRecognition(): UseRecognitionResult {
  const [status, setStatus] = useState<RecognitionStatus>('preparing');

  const retry = useCallback(() => {
    setStatus('preparing');
    prepareModel()
      .then(() => setStatus('ready'))
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    retry();
  }, [retry]);

  const recognizeAnswer = useCallback<AnswerRecognizer>(async (ink) => {
    const [sign, integerDigits, decimalDigits, remainderDigits] =
      await Promise.all([
        ink.sign.length > 0
          ? recognizeSign(ink.sign).then((r) => r.sign)
          : Promise.resolve<null>(null),
        Promise.all(ink.integer.map(recognizeBox)),
        Promise.all(ink.decimal.map(recognizeBox)),
        Promise.all(ink.remainder.map(recognizeBox)),
      ]);
    return { sign, integerDigits, decimalDigits, remainderDigits };
  }, []);

  return { status, retry, recognizeAnswer };
}
