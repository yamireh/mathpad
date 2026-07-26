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
  patternSections,
  type ClockQuestion,
  type ClockTime,
  type ClockToken,
} from '../../../lib/clock';
import { fieldDigits, type ClockFieldValue } from './answerDigits';
import { ClockFace } from './ClockFace';
import { ClockLegend } from './ClockLegend';
import { DigitalClockAnswer } from './DigitalClockAnswer';
import { ElapsedPrompt } from './ElapsedPrompt';
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
  /**
   * Whether the kid has entered anything for this question — used to confirm
   * before moving on with a blank answer. "Set the hands" is always considered
   * answered (the hands always sit at some time).
   */
  hasAnswer: () => boolean;
}

export interface ClockQuestionViewProps {
  question: ClockQuestion;
  clockSize: number;
  /** Show the past/to teaching overlay (only meaningful in read modes). */
  help?: boolean;
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
>(function ClockQuestionView(
  { question, clockSize, help = false, onDrawStart, onDrawEnd },
  ref,
) {
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
  // The answer is always about `target` — which equals the shown time for
  // read/set, but is the computed later/earlier time for elapsed questions.
  const answer = question.target;
  const sections = useMemo(
    () => patternSections(clockPhrase(answer)),
    [answer],
  );

  const tokenLabel = (token: ClockToken) =>
    token.kind === 'word' ? t(`clock.words.${token.word}`) : String(token.value);

  useImperativeHandle(ref, () => ({
    judge: async (): Promise<ClockJudgement> => {
      if (question.answerWith === 'pattern') {
        return {
          correct: checkPattern(answer, built),
          given: built.length ? built.map(tokenLabel).join(' ') : '—',
        };
      }
      if (question.answerWith === 'set') {
        return {
          correct: checkSet(answer, setValue),
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
          correct: hour === answer.hour && minute === answer.minute,
          given: blank ? '—' : `${hour}:${minute.toString().padStart(2, '0')}`,
        };
      } catch {
        return { correct: false, given: '—' };
      }
    },
    hasAnswer: (): boolean => {
      if (question.answerWith === 'pattern') return built.length > 0;
      if (question.answerWith === 'set') return true;
      const filled = (v: ClockFieldValue) =>
        v.digits !== null || v.strokes.length > 0;
      return filled(hourRef.current) || filled(minuteRef.current);
    },
  }));

  // The answer surface: set the hands, build words, or write the digits.
  const answerNode =
    question.answerWith === 'set' ? (
      <>
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
    ) : question.answerWith === 'pattern' ? (
      <PatternBuilder
        sections={sections}
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
    );

  // The prompt above the answer, per skill.
  const promptNode =
    question.skill === 'set' ? (
      <SetClockPrompt time={formatDigital(answer)} />
    ) : question.skill === 'elapsed' && question.shift ? (
      <ElapsedPrompt shift={question.shift} />
    ) : (
      <Text style={styles.prompt}>{t('clock.readPrompt')}</Text>
    );

  return (
    <>
      {/* Read & elapsed show the clock to read; pure "set the hands" doesn't. */}
      {question.skill !== 'set' ? (
        <ClockFace
          time={question.time}
          size={clockSize}
          showRing={showRing}
          help={help && question.skill === 'read'}
        />
      ) : null}
      {promptNode}
      {answerNode}
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
