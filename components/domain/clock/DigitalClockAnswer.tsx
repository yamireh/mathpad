import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { IconButton, NoticeDialog } from '../../ui';
import { clockColors, colors, spacing, typography } from '../../../constants/design';
import { recognizeNumber } from '../../../lib/recognition';
import { digitInk } from '../../../lib/solver/digitInk';
import { type InkPoint, type InkStroke } from '../ink';
import { type ClockFieldValue } from './answerDigits';
import { HandwritingField } from './HandwritingField';

/** Fixed width for the colon (and the spacer above it), so the Hours/Minutes
 *  labels line up exactly over their fields. */
const COLON_W = spacing.xl;

/**
 * Idle time after the last pen-lift before the field auto-converts to clean
 * digits. Each new stroke RESETS it, so it's the pause allowed *between*
 * strokes — long enough to start the second digit of a two-digit number
 * (e.g. the "2" in "12") before it fires. Tune here if it feels off.
 */
const CONVERT_DELAY_MS = 1100;

/**
 * Lay the recognized digits out as canonical `digitInk` glyphs across the field.
 * These aren't shown (the field displays a printed number instead) — they're the
 * strokes reported upward so the consumer re-recognizes the answer deterministically
 * at judge time. Coordinates are the field's own pixels.
 */
function numberToFieldInk(
  digits: number[],
  width: number,
  height: number,
): InkStroke[] {
  const n = Math.max(1, digits.length);
  const slotW = width / n;
  const glyphH = height * 0.62;
  const glyphW = Math.min(slotW * 0.66, glyphH * 0.7);
  const padY = (height - glyphH) / 2;
  const out: InkStroke[] = [];
  digits.forEach((d, i) => {
    const baseX = i * slotW + (slotW - glyphW) / 2;
    for (const stroke of digitInk(d)) {
      out.push(
        stroke.map(
          ([x, y, t]): InkPoint => [
            baseX + (x / 100) * glyphW,
            padY + (y / 100) * glyphH,
            t,
          ],
        ),
      );
    }
  });
  return out;
}

interface TimeFieldHandle {
  clear: () => void;
  undo: () => void;
}

interface TimeFieldProps {
  width: number;
  height: number;
  accessibilityLabel: string;
  /** Report the field's value — raw strokes while writing, or the recognized
   *  digits once converted (see {@link ClockFieldValue}). */
  onValue: (value: ClockFieldValue) => void;
  /** The kid wrote something unreadable — surface the "try again" prompt. */
  onUnreadable: () => void;
  /** Fired when the kid draws into this field (marks it as last-written). */
  onWrite: () => void;
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
}

/**
 * One HH/MM field with live recognition: after the kid pauses, the handwriting
 * is recognized and shown as a clean printed number (blue, like the operations
 * answer boxes). The convert timer is cancelled on pen-down and only counts
 * during a real finger-up pause, so a kid mid-number isn't cut off. An
 * unreadable scribble is cleared and flagged; touching the field again drops the
 * printed number so they can rewrite. The canonical strokes are still reported
 * upward so the consumer judges the answer the same way.
 */
const TimeField = forwardRef<TimeFieldHandle, TimeFieldProps>(function TimeField(
  {
    width,
    height,
    accessibilityLabel,
    onValue,
    onUnreadable,
    onWrite,
    onDrawStart,
    onDrawEnd,
  },
  ref,
) {
  // Bumping `key` remounts (and so clears) the drawable field underneath.
  const [key, setKey] = useState(0);
  // The recognized number, shown as a clean printed overlay (null = drawing).
  const [printed, setPrinted] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => cancel, []);

  const clearField = () => setKey((k) => k + 1);

  const reset = () => {
    cancel();
    setPrinted(null);
    clearField();
    onValue({ strokes: [], digits: null });
  };

  useImperativeHandle(ref, () => ({ clear: reset, undo: reset }), []);

  const recognize = (strokes: InkStroke[]) => {
    void recognizeNumber(strokes)
      .then(({ integerDigits }) => {
        if (integerDigits.length === 0) {
          reset();
          onUnreadable();
          return;
        }
        // Report our own recognized digits so the consumer judges from exactly
        // what we print here — NOT a second recognition of regenerated ink,
        // which used to disagree (a canonical "1" glyph re-read as "7"). The
        // canonical glyphs still ride along for the strokes-as-source model.
        onValue({
          strokes: numberToFieldInk(integerDigits, width, height),
          digits: integerDigits,
        });
        setPrinted(integerDigits.join(''));
        clearField();
      })
      .catch(() => {
        // Model not ready yet — leave the raw handwriting; still judged fine.
      });
  };

  // (Re)start the convert countdown from the last stroke.
  const schedule = (strokes: InkStroke[]) => {
    cancel();
    if (strokes.length === 0) return;
    timer.current = setTimeout(() => recognize(strokes), CONVERT_DELAY_MS);
  };

  // Pen-down: cancel any pending convert (so it can't fire mid-stroke) and drop
  // the printed overlay so the kid writes on a clean field.
  const handleDrawStart = () => {
    cancel();
    if (printed !== null) setPrinted(null);
    onDrawStart?.();
  };

  const handleStrokes = (strokes: InkStroke[]) => {
    if (strokes.length) onWrite();
    // Raw handwriting (not yet converted) — no known digits, so the consumer
    // recognizes these strokes if the kid submits before the convert pause.
    onValue({ strokes, digits: null });
    schedule(strokes);
  };

  return (
    <View style={{ width, height }}>
      <HandwritingField
        key={key}
        width={width}
        height={height}
        onStrokesChange={handleStrokes}
        onDrawStart={handleDrawStart}
        onDrawEnd={onDrawEnd}
        accessibilityLabel={accessibilityLabel}
      />
      {printed !== null ? (
        <View style={styles.printedWrap} pointerEvents="none">
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.printedNumber, { fontSize: Math.round(height * 0.5) }]}
          >
            {printed}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

export interface DigitalClockAnswerProps {
  onHourChange: (value: ClockFieldValue) => void;
  onMinuteChange: (value: ClockFieldValue) => void;
  /** Lock page scrolling while a field is being drawn in. */
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
}

/**
 * "Write the time" answer surface: an hour field and a minute field separated
 * by a colon, each a live-recognizing {@link TimeField}, plus Undo + Clear-all.
 * The consumer still recognizes each field's reported strokes at judge time.
 */
export function DigitalClockAnswer({
  onHourChange,
  onMinuteChange,
  onDrawStart,
  onDrawEnd,
}: DigitalClockAnswerProps) {
  const { t } = useTranslation();
  // Wide, responsive write boxes — two fit a row with the colon, larger on iPad.
  const { width } = useWindowDimensions();
  const fieldW = Math.min(Math.round(width * 0.37), 200);
  const fieldH = Math.round(fieldW * 1.05);
  const [notice, setNotice] = useState(false);
  const hourField = useRef<TimeFieldHandle>(null);
  const minuteField = useRef<TimeFieldHandle>(null);
  // Which field was written in last, so Undo targets the right one.
  const lastField = useRef<'hour' | 'minute' | null>(null);

  const clearAll = () => {
    hourField.current?.clear();
    minuteField.current?.clear();
    lastField.current = null;
  };

  const undo = () => {
    if (lastField.current === 'hour') hourField.current?.undo();
    else if (lastField.current === 'minute') minuteField.current?.undo();
  };

  return (
    <View style={styles.wrap}>
      {/* Labels sit above each field (and a spacer over the colon) so it's clear
          hours go on the left, minutes on the right. */}
      <View style={styles.row}>
        <Text style={[styles.label, { width: fieldW }]}>{t('clock.hours')}</Text>
        <View style={{ width: COLON_W }} />
        <Text style={[styles.label, { width: fieldW }]}>
          {t('clock.minutes')}
        </Text>
      </View>
      <View style={styles.row}>
        <TimeField
          ref={hourField}
          width={fieldW}
          height={fieldH}
          onValue={onHourChange}
          onUnreadable={() => setNotice(true)}
          onWrite={() => {
            lastField.current = 'hour';
          }}
          onDrawStart={onDrawStart}
          onDrawEnd={onDrawEnd}
          accessibilityLabel={t('clock.hours')}
        />
        <Text style={[styles.colon, { width: COLON_W }]}>:</Text>
        <TimeField
          ref={minuteField}
          width={fieldW}
          height={fieldH}
          onValue={onMinuteChange}
          onUnreadable={() => setNotice(true)}
          onWrite={() => {
            lastField.current = 'minute';
          }}
          onDrawStart={onDrawStart}
          onDrawEnd={onDrawEnd}
          accessibilityLabel={t('clock.minutes')}
        />
      </View>

      <View style={styles.tools}>
        <IconButton
          name="trash-outline"
          accessibilityLabel={t('common.clearAll')}
          onPress={clearAll}
        />
        <IconButton
          name="arrow-undo-outline"
          accessibilityLabel={t('practice.undo')}
          onPress={undo}
        />
      </View>

      <NoticeDialog
        visible={notice}
        title={t('practice.invalidTitle')}
        message={t('practice.invalidBody')}
        buttonLabel={t('common.gotIt')}
        onDismiss={() => setNotice(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md },
  printedWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The recognized time, printed in a friendly blue with a little extra weight
  // so it reads as clean and deliberate (matches the operations answer colour).
  printedNumber: {
    color: colors.answerInk,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  colon: {
    fontSize: typography.size.display,
    fontWeight: typography.weight.medium,
    color: clockColors.minuteHand,
    textAlign: 'center',
  },
  label: {
    textAlign: 'center',
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  tools: { flexDirection: 'row', gap: spacing.lg },
});
