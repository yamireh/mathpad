import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Pill } from '../../ui';
import { colors, spacing, typography } from '../../../constants/design';
import { prepareModel } from '../../../lib/recognition';
import {
  checkPattern,
  checkSet,
  clockPhrase,
  formatDigital,
  patternBank,
  type ClockQuestion,
  type ClockTime,
  type ClockToken,
} from '../../../lib/clock';
import { fieldDigits, type ClockFieldValue } from './answerDigits';
import { ClockFace } from './ClockFace';
import { ClockLegend } from './ClockLegend';
import { DigitalClockAnswer } from './DigitalClockAnswer';
import { PatternBuilder } from './PatternBuilder';
import { SetClockPrompt } from './SetClockPrompt';
import { SettableClock } from './SettableClock';

export interface ClockJudgement {
  correct: boolean;
  /** The child's answer formatted for display. */
  given: string;
}

export interface ClockQuestionHandle {
  judge: () => Promise<ClockJudgement>;
}

export interface ClockQuestionViewProps {
  question: ClockQuestion;
  clockSize: number;
  /** Fired while drawing/dragging so a parent can lock page scrolling. */
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
}

const SET_START: ClockTime = { hour: 9, minute: 0 };

function digitsToNumber(digits: number[]): number {
  return digits.length === 0 ? NaN : Number(digits.join(''));
}

/**
 * Renders one clock question's prompt + answer surface (read→digital,
 * read→pattern, or set-the-hands) and owns the answer state. Call `judge()`
 * (via ref) to score it and get the child's answer for display. Remount it
 * (change `key`) to reset for a new question.
 */
export const ClockQuestionView = forwardRef<
  ClockQuestionHandle,
  ClockQuestionViewProps
>(function ClockQuestionView({ question, clockSize, onDrawStart, onDrawEnd }, ref) {
  const { t } = useTranslation();
  const [built, setBuilt] = useState<ClockToken[]>([]);
  const [setValue, setSetValue] = useState<ClockTime>(SET_START);
  const [selectedHand, setSelectedHand] = useState<'hour' | 'minute'>('hour');
  const hourRef = useRef<ClockFieldValue>({ strokes: [], digits: null });
  const minuteRef = useRef<ClockFieldValue>({ strokes: [], digits: null });

  useEffect(() => {
    void prepareModel();
  }, []);

  const showRing = question.step === 'quarter';
  const bank = useMemo(() => patternBank(clockPhrase(question.time)), [question]);

  const tokenLabel = (token: ClockToken) =>
    token.kind === 'word' ? t(`clock.words.${token.word}`) : String(token.value);

  useImperativeHandle(ref, () => ({
    judge: async (): Promise<ClockJudgement> => {
      if (question.answerWith === 'pattern') {
        return {
          correct: checkPattern(question.time, built),
          given: built.length ? built.map(tokenLabel).join(' ') : '—',
        };
      }
      if (question.answerWith === 'set') {
        return {
          correct: checkSet(question.time, setValue),
          given: formatDigital(setValue),
        };
      }
      try {
        const [hDigits, mDigits] = await Promise.all([
          fieldDigits(hourRef.current),
          fieldDigits(minuteRef.current),
        ]);
        const hour = digitsToNumber(hDigits);
        const minute = digitsToNumber(mDigits);
        const blank = Number.isNaN(hour) || Number.isNaN(minute);
        return {
          correct: hour === question.time.hour && minute === question.time.minute,
          given: blank ? '—' : `${hour}:${minute.toString().padStart(2, '0')}`,
        };
      } catch {
        return { correct: false, given: '—' };
      }
    },
  }));

  if (question.answerWith === 'set') {
    return (
      <>
        <SetClockPrompt time={formatDigital(question.time)} />
        <SettableClock
          value={setValue}
          onChange={setSetValue}
          selected={selectedHand}
          size={clockSize}
          step={question.step}
          showRing={showRing}
        />
        <ClockLegend selected={selectedHand} onSelect={setSelectedHand} />
        <Pill
          label={t('clock.reset')}
          icon="refresh-outline"
          onPress={() => {
            setSetValue(SET_START);
            setSelectedHand('hour');
          }}
        />
      </>
    );
  }

  return (
    <>
      <ClockFace time={question.time} size={clockSize} showRing={showRing} />
      <Text style={styles.prompt}>{t('clock.readPrompt')}</Text>
      {question.answerWith === 'pattern' ? (
        <PatternBuilder
          bank={bank}
          built={built}
          onAdd={(token) => setBuilt((b) => [...b, token])}
          onRemove={(i) => setBuilt((b) => b.filter((_, idx) => idx !== i))}
        />
      ) : (
        <DigitalClockAnswer
          onHourChange={(v) => {
            hourRef.current = v;
          }}
          onMinuteChange={(v) => {
            minuteRef.current = v;
          }}
          onDrawStart={onDrawStart}
          onDrawEnd={onDrawEnd}
        />
      )}
    </>
  );
});

const styles = StyleSheet.create({
  prompt: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
});
