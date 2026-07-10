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
 * Lay the recognized digits out as clean `digitInk` glyphs across the field —
 * the same handwritten-style conversion the operations answer boxes use, but
 * for a multi-digit field (e.g. "12"). Coordinates are the field's own pixels
 * so the HandwritingField renders them directly.
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
  /** Report the field's current strokes (raw while writing, clean glyphs once
   *  converted) — the consumer still recognizes these at judge time. */
  onStrokes: (strokes: InkStroke[]) => void;
  /** The kid wrote something unreadable — surface the "try again" prompt. */
  onUnreadable: () => void;
  /** Fired when the kid draws into this field (marks it as last-written). */
  onWrite: () => void;
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
}

/**
 * One HH/MM field with live recognition: after the kid pauses, the handwriting
 * is recognized and swapped for clean digit glyphs (like operations). Because a
 * field holds a whole two-digit number, the convert timer RESETS on every stroke
 * so a kid mid-number isn't cut off. An unreadable scribble is cleared and
 * flagged; writing again after a conversion drops the glyphs and starts fresh.
 */
const TimeField = forwardRef<TimeFieldHandle, TimeFieldProps>(function TimeField(
  {
    width,
    height,
    accessibilityLabel,
    onStrokes,
    onUnreadable,
    onWrite,
    onDrawStart,
    onDrawEnd,
  },
  ref,
) {
  const [key, setKey] = useState(0);
  const [seed, setSeed] = useState<InkStroke[]>([]);
  // Number of clean-glyph strokes currently shown (0 = raw handwriting / empty).
  const convertedCount = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => cancel, []);

  const remount = (strokes: InkStroke[], converted: number) => {
    convertedCount.current = converted;
    setSeed(strokes);
    setKey((k) => k + 1);
  };

  const reset = () => {
    cancel();
    remount([], 0);
    onStrokes([]);
  };

  useImperativeHandle(ref, () => ({ clear: reset, undo: reset }), []);

  const recognize = (strokes: InkStroke[]) => {
    void recognizeNumber(strokes)
      .then(({ integerDigits }) => {
        if (integerDigits.length === 0) {
          remount([], 0);
          onStrokes([]);
          onUnreadable();
          return;
        }
        const ink = numberToFieldInk(integerDigits, width, height);
        onStrokes(ink);
        remount(ink, ink.length);
      })
      .catch(() => {
        // Model not ready yet — leave the raw handwriting; it's still recognized
        // at judge time, so nothing is lost.
      });
  };

  // (Re)start the convert countdown from the last stroke.
  const schedule = (strokes: InkStroke[]) => {
    cancel();
    if (strokes.length === 0) return;
    timer.current = setTimeout(() => recognize(strokes), CONVERT_DELAY_MS);
  };

  // Pen-down: kill any pending convert so it can't fire while the kid is still
  // writing (mid-stroke, or between the phases of a digit). It's rescheduled on
  // pen-up, so the delay only ever counts during a real finger-up pause.
  const handleDrawStart = () => {
    cancel();
    onDrawStart?.();
  };

  const handleStrokes = (strokes: InkStroke[]) => {
    if (strokes.length) onWrite();
    if (convertedCount.current > 0) {
      // Seed echo — nothing new written.
      if (strokes.length <= convertedCount.current) return;
      // The kid is rewriting over clean digits: drop the glyphs, keep the new.
      const fresh = strokes.slice(convertedCount.current);
      convertedCount.current = 0;
      onStrokes(fresh);
      remount(fresh, 0);
      schedule(fresh);
      return;
    }
    onStrokes(strokes);
    schedule(strokes);
  };

  return (
    <HandwritingField
      key={key}
      initialStrokes={seed}
      width={width}
      height={height}
      onStrokesChange={handleStrokes}
      onDrawStart={handleDrawStart}
      onDrawEnd={onDrawEnd}
      accessibilityLabel={accessibilityLabel}
    />
  );
});

export interface DigitalClockAnswerProps {
  onHourChange: (strokes: InkStroke[]) => void;
  onMinuteChange: (strokes: InkStroke[]) => void;
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
          onStrokes={onHourChange}
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
          onStrokes={onMinuteChange}
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
