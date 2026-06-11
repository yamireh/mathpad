import { Ionicons } from '@expo/vector-icons';
import { Canvas, Path } from '@shopify/react-native-skia';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  type LayoutRectangle,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  clockColors,
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';
import { successFeedback } from '../../../lib/feedback';
import {
  formatDigital,
  handAngles,
  pointOnClock,
  type ClockTime,
  type ClockToken,
} from '../../../lib/clock';
import { digitInk } from '../../../lib/solver/digitInk';
import type { IoniconName } from '../../ui';
import { type InkStroke, strokeToPath } from '../ink';
import { NotebookGrid } from '../NotebookGrid';
import { ClockFace } from './ClockFace';
import { ClockLegend } from './ClockLegend';
import { ClockTile } from './ClockTile';
import { DemoHand } from './DemoHand';
import { SetClockPrompt } from './SetClockPrompt';

/** The worked example: 6:30 — the canonical "half past". */
const DEMO_HOUR = 6;
const DEMO_MINUTE = 30;
/** The clock starts here (the app's default set time); the hour hand drags 9 → 6. */
const START_HOUR = 9;
const SWEEP_MS = 2400; // slow, so each hand is easy to follow
const GLIDE_MS = 900; // hand travelling between targets
const WRITE_MS = 900; // drawing one digit glyph
/** Reserved area below the clock for the selector / tiles / write boxes. */
const WORK_H = 200;

type Mode = 'set' | 'words' | 'write';

/** Demo pattern tiles: the correct phrase (half · past · 6) plus a few decoys. */
const DEMO_BANK: ClockToken[] = [
  { kind: 'word', word: 'quarter' },
  { kind: 'word', word: 'half' },
  { kind: 'word', word: 'past' },
  { kind: 'word', word: 'to' },
  { kind: 'number', value: 6 },
  { kind: 'number', value: 9 },
];
const keyOf = (tk: ClockToken) =>
  tk.kind === 'word' ? `w-${tk.word}` : `n-${tk.value}`;
const TAP_ORDER = ['w-half', 'w-past', 'n-6'];
const TOKEN_BY_KEY: Record<string, ClockToken> = Object.fromEntries(
  DEMO_BANK.map((tk) => [keyOf(tk), tk]),
);

/** Scale a number string's digit ink into a box, centred per digit, in the
 *  given (stage) coordinate space — one InkStroke per glyph stroke. */
function numberStrokes(
  cx: number,
  cy: number,
  w: number,
  h: number,
  numStr: string,
): InkStroke[] {
  const pad = Math.min(w, h) * 0.16;
  const cell = (w - pad * 2) / numStr.length;
  const gsize = Math.min(cell, h - pad * 2) * 0.92;
  const out: InkStroke[] = [];
  numStr.split('').forEach((ch, idx) => {
    const subCx = cx - w / 2 + pad + idx * cell + cell / 2;
    digitInk(Number(ch)).forEach((stroke) => {
      out.push(
        stroke.map(
          ([x, y], j) =>
            [subCx + ((x - 50) / 100) * gsize, cy + ((y - 50) / 100) * gsize, j] as [
              number,
              number,
              number,
            ],
        ),
      );
    });
  });
  return out;
}

const pointAt = (stroke: InkStroke, tt: number) => {
  const i = Math.min(stroke.length - 1, Math.floor(tt * (stroke.length - 1)));
  return { x: stroke[i][0], y: stroke[i][1] };
};

export interface ClockHowToHandle {
  play(): void;
}

export interface ClockHowToViewProps {
  /** Square edge length of the clock face in px. */
  size: number;
}

/**
 * "How to read a clock" — a guiding hand demonstrates all three answer modes in
 * one continuous, slow walkthrough: Set the time (target prompt + real hand
 * selector), Say it in words (word tiles), and Write the time (handwriting the
 * digits into notebook boxes). Each part is titled, with a dimmed transition
 * card between modes. `play()` runs it.
 */
export const ClockHowToView = forwardRef<ClockHowToHandle, ClockHowToViewProps>(
  function ClockHowToView({ size }, ref) {
    const { t } = useTranslation();
    const centre = size / 2;
    const dialR = size * 0.465;
    const boxW = Math.min(Math.round(size * 0.42), 140);
    const boxH = Math.round(boxW * 1.05);

    const [mode, setMode] = useState<Mode>('set');
    const [time, setTime] = useState<ClockTime>({ hour: START_HOUR, minute: 0 });
    const [legendSel, setLegendSel] = useState<'hour' | 'minute'>('hour');
    const [cursorVisible, setCursorVisible] = useState(false);
    const [pressing, setPressing] = useState(false);
    const [built, setBuilt] = useState<ClockToken[]>([]);
    const [writeStrokes, setWriteStrokes] = useState<InkStroke[]>([]);
    const [drawing, setDrawing] = useState<InkStroke | null>(null);
    const [drawEnd, setDrawEnd] = useState(0);
    const [title, setTitle] = useState('');
    const [titleIcon, setTitleIcon] = useState<IoniconName>('time-outline');
    const [blinking, setBlinking] = useState(false);
    const [sub, setSub] = useState('');
    const [solved, setSolved] = useState(false);
    const [transition, setTransition] = useState<string | null>(null);

    const hourSweep = useRef(new Animated.Value(1)).current;
    const minuteSweep = useRef(new Animated.Value(1)).current;
    const cursorXY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const writeVal = useRef(new Animated.Value(0)).current;
    const blink = useRef(new Animated.Value(1)).current;
    const transFade = useRef(new Animated.Value(0)).current;
    const blinkLoop = useRef<Animated.CompositeAnimation | null>(null);
    const sweepMode = useRef<'hour' | 'minute' | null>(null);
    const drawStroke = useRef<InkStroke | null>(null);
    const legendBox = useRef<LayoutRectangle | null>(null);
    const bankOffset = useRef({ x: 0, y: 0 });
    const tileLayouts = useRef<Record<string, LayoutRectangle>>({});
    const rowOffset = useRef({ x: 0, y: 0 });
    const boxLayouts = useRef<Record<string, LayoutRectangle>>({});
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const runId = useRef(0);

    const tipOf = useCallback(
      (which: 'hour' | 'minute', tm: ClockTime) => {
        const a = handAngles(tm);
        return which === 'hour'
          ? pointOnClock(centre, dialR * 0.5, a.hour)
          : pointOnClock(centre, dialR * 0.72, a.minute);
      },
      [centre, dialR],
    );

    useEffect(() => {
      const h = hourSweep.addListener(({ value }) => {
        if (sweepMode.current !== 'hour') return;
        const tm = { hour: START_HOUR + 9 * value, minute: 0 }; // 9 → 6 clockwise
        setTime(tm);
        cursorXY.setValue(tipOf('hour', tm));
      });
      const m = minuteSweep.addListener(({ value }) => {
        if (sweepMode.current !== 'minute') return;
        const tm = { hour: DEMO_HOUR, minute: DEMO_MINUTE * value };
        setTime(tm);
        cursorXY.setValue(tipOf('minute', tm));
      });
      const w = writeVal.addListener(({ value }) => {
        const s = drawStroke.current;
        if (!s) return;
        setDrawEnd(value);
        cursorXY.setValue(pointAt(s, value));
      });
      return () => {
        hourSweep.removeListener(h);
        minuteSweep.removeListener(m);
        writeVal.removeListener(w);
      };
    }, [hourSweep, minuteSweep, cursorXY, writeVal, tipOf]);

    const clearTimers = useCallback(() => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    }, []);

    useEffect(() => () => clearTimers(), [clearTimers]);

    const play = useCallback(() => {
      runId.current += 1;
      const myRun = runId.current;
      clearTimers();
      blinkLoop.current?.stop();
      hourSweep.stopAnimation();
      minuteSweep.stopAnimation();
      cursorXY.stopAnimation();
      writeVal.stopAnimation();

      const alive = () => runId.current === myRun;
      const wait = (ms: number) =>
        new Promise<void>((resolve) => {
          timers.current.push(setTimeout(resolve, ms));
        });
      const animate = (val: Animated.Value, toValue: number, duration: number) =>
        new Promise<void>((resolve) => {
          Animated.timing(val, {
            toValue,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }).start(() => resolve());
        });
      const glideTo = (to: { x: number; y: number }, duration = GLIDE_MS) =>
        new Promise<void>((resolve) => {
          // Animates from the cursor's current value — no React re-render.
          Animated.timing(cursorXY, {
            toValue: to,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }).start(() => resolve());
        });
      const showCursorAt = (p: { x: number; y: number }) => {
        cursorXY.setValue(p);
        setCursorVisible(true);
      };
      const toStage = (r: LayoutRectangle, ox = 0, oy = 0) => ({
        x: ox + r.x + r.width / 2,
        y: size + oy + r.y + r.height / 2,
      });
      const tap = async (to: { x: number; y: number }) => {
        await glideTo(to);
        if (!alive()) return;
        setPressing(true);
        await wait(200);
        setPressing(false);
      };
      const confirm = () => {
        setSolved(true);
        successFeedback();
      };
      const showTransition = async (modeTitle: string) => {
        setTransition(t('clock.howTo.next', { mode: modeTitle }));
        transFade.setValue(0);
        await animate(transFade, 1, 320);
        await wait(950);
        if (!alive()) return;
        await animate(transFade, 0, 320);
        setTransition(null);
      };
      const legendButton = (hand: 'hour' | 'minute') => {
        const r = legendBox.current!;
        return {
          x: r.x + r.width * (hand === 'hour' ? 0.27 : 0.73),
          y: size + r.y + r.height / 2,
        };
      };
      // Write a number into a box: the hand draws each glyph stroke, ink trailing
      // the fingertip, then the stroke persists.
      const writeNumber = async (boxKey: string, numStr: string) => {
        const rect = boxLayouts.current[boxKey];
        if (!rect) return;
        const c = toStage(rect, rowOffset.current.x, rowOffset.current.y);
        const strokes = numberStrokes(c.x, c.y, rect.width, rect.height, numStr);
        for (const s of strokes) {
          await glideTo({ x: s[0][0], y: s[0][1] }, 450);
          if (!alive()) return;
          drawStroke.current = s;
          setDrawing(s);
          setDrawEnd(0);
          writeVal.setValue(0);
          setPressing(true);
          await animate(writeVal, 1, WRITE_MS);
          setPressing(false);
          drawStroke.current = null;
          setDrawing(null);
          setWriteStrokes((prev) => [...prev, s]);
          if (!alive()) return;
          await wait(150);
        }
      };

      const run = async () => {
        // Reset (mode off first so resetting Animated values can't move hands).
        sweepMode.current = null;
        setMode('set');
        setBuilt([]);
        setWriteStrokes([]);
        setDrawing(null);
        setSolved(false);
        setLegendSel('hour');
        setSub('');
        hourSweep.setValue(0);
        minuteSweep.setValue(0);
        setTime({ hour: START_HOUR, minute: 0 });
        showCursorAt({ x: size * 0.9, y: size * 0.92 });

        /* ---- Part 1: Set the time ---- */
        setTitleIcon('time-outline');
        setTitle(t('clock.howTo.titleSet'));
        setBlinking(true);
        blink.setValue(1);
        blinkLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(blink, { toValue: 0.3, duration: 540, useNativeDriver: true }),
            Animated.timing(blink, { toValue: 1, duration: 540, useNativeDriver: true }),
          ]),
        );
        blinkLoop.current.start();
        await wait(2000);
        if (!alive()) return;
        blinkLoop.current.stop();
        setBlinking(false);
        blink.setValue(1);

        // Pick the hour hand on the selector, then drag it to 6.
        setSub(t('clock.howTo.step1'));
        if (legendBox.current) await tap(legendButton('hour'));
        if (!alive()) return;
        setLegendSel('hour');
        await glideTo(tipOf('hour', { hour: START_HOUR, minute: 0 }));
        if (!alive()) return;
        await wait(300);
        sweepMode.current = 'hour';
        await animate(hourSweep, 1, SWEEP_MS);
        if (!alive()) return;
        await wait(500);

        // Pick the minute hand, then drag it to 30.
        setSub(t('clock.howTo.step2'));
        if (legendBox.current) await tap(legendButton('minute'));
        if (!alive()) return;
        setLegendSel('minute');
        await glideTo(tipOf('minute', { hour: DEMO_HOUR, minute: 0 }));
        if (!alive()) return;
        await wait(300);
        sweepMode.current = 'minute';
        await animate(minuteSweep, 1, SWEEP_MS);
        if (!alive()) return;
        await wait(400);

        setCursorVisible(false);
        confirm();
        await wait(1500);
        if (!alive()) return;

        /* ---- Transition → words ---- */
        setSolved(false);
        await showTransition(t('clock.howTo.titleWords'));
        if (!alive()) return;

        /* ---- Part 2: Say it in words ---- */
        setMode('words');
        setTitleIcon('chatbubbles-outline');
        setTitle(t('clock.howTo.titleWords'));
        setSub('');
        showCursorAt({ x: size * 0.9, y: size * 0.96 });
        await wait(600);
        if (!alive()) return;
        for (const key of TAP_ORDER) {
          const r = tileLayouts.current[key];
          await tap(
            r
              ? toStage(r, bankOffset.current.x, bankOffset.current.y)
              : { x: centre, y: size + WORK_H / 2 },
          );
          if (!alive()) return;
          setBuilt((prev) => [...prev, TOKEN_BY_KEY[key]]);
          await wait(500);
          if (!alive()) return;
        }
        await wait(300);
        setCursorVisible(false);
        confirm();
        await wait(1500);
        if (!alive()) return;

        /* ---- Transition → write ---- */
        setSolved(false);
        await showTransition(t('clock.howTo.titleWrite'));
        if (!alive()) return;

        /* ---- Part 3: Write the time ---- */
        setMode('write');
        setTitleIcon('create-outline');
        setTitle(t('clock.howTo.titleWrite'));
        setSub('');
        setWriteStrokes([]);
        showCursorAt({ x: size * 0.9, y: size * 0.96 });
        await wait(600);
        if (!alive()) return;
        await writeNumber('hour', String(DEMO_HOUR));
        if (!alive()) return;
        await wait(250);
        await writeNumber('minute', String(DEMO_MINUTE));
        if (!alive()) return;
        await wait(300);
        setCursorVisible(false);
        confirm();
      };

      void run();
    }, [
      t,
      blink,
      transFade,
      writeVal,
      hourSweep,
      minuteSweep,
      cursorXY,
      tipOf,
      clearTimers,
      centre,
      size,
    ]);

    useImperativeHandle(ref, () => ({ play }), [play]);

    const label = (tk: ClockToken) =>
      tk.kind === 'word' ? t(`clock.words.${tk.word}`) : String(tk.value);

    // Memoised so it only re-renders when the time changes (cursor / ink-reveal
    // state updates won't reflow the clock — which caused a visible jitter).
    const clockEl = useMemo(
      () => <ClockFace time={time} size={size} showRing />,
      [time, size],
    );

    return (
      <View style={styles.wrap}>
        <View style={styles.content}>
          {mode === 'set' ? (
            <Animated.View style={{ opacity: blinking ? blink : 1 }}>
              <SetClockPrompt time={formatDigital({ hour: DEMO_HOUR, minute: DEMO_MINUTE })} />
            </Animated.View>
          ) : title ? (
            <View style={styles.chip}>
              <Ionicons name={titleIcon} size={18} color={clockColors.hourHand} />
              <Text style={styles.chipText}>{title}</Text>
            </View>
          ) : (
            <View style={styles.chipSpacer} />
          )}

          <View style={[styles.stage, { width: size, height: size + WORK_H }]}>
            {clockEl}

          <View style={[styles.work, { height: WORK_H }]}>
            {mode === 'set' ? (
              <>
                <View
                  onLayout={(e) => {
                    legendBox.current = e.nativeEvent.layout;
                  }}
                >
                  <ClockLegend selected={legendSel} onSelect={() => {}} />
                </View>
                {sub ? <Text style={styles.sub}>{sub}</Text> : null}
              </>
            ) : mode === 'words' ? (
              <>
                <View style={styles.answerLine}>
                  {built.length === 0 ? (
                    <Text style={styles.answerHint}>{t('clock.patternHint')}</Text>
                  ) : (
                    built.map((tk, i) => (
                      <ClockTile key={i} label={label(tk)} variant="answer" onPress={() => {}} />
                    ))
                  )}
                </View>
                <View
                  style={styles.bank}
                  onLayout={(e) => {
                    bankOffset.current = {
                      x: e.nativeEvent.layout.x,
                      y: e.nativeEvent.layout.y,
                    };
                  }}
                >
                  {DEMO_BANK.map((tk) => {
                    const k = keyOf(tk);
                    return (
                      <View
                        key={k}
                        onLayout={(e) => {
                          tileLayouts.current[k] = e.nativeEvent.layout;
                        }}
                      >
                        <ClockTile label={label(tk)} onPress={() => {}} />
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <View
                style={styles.writeRow}
                onLayout={(e) => {
                  rowOffset.current = {
                    x: e.nativeEvent.layout.x,
                    y: e.nativeEvent.layout.y,
                  };
                }}
              >
                <View
                  style={[styles.writeBox, { width: boxW, height: boxH }]}
                  onLayout={(e) => {
                    boxLayouts.current.hour = e.nativeEvent.layout;
                  }}
                >
                  <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
                    <NotebookGrid width={boxW} height={boxH} />
                  </Canvas>
                </View>
                <Text style={styles.colon}>:</Text>
                <View
                  style={[styles.writeBox, { width: boxW, height: boxH }]}
                  onLayout={(e) => {
                    boxLayouts.current.minute = e.nativeEvent.layout;
                  }}
                >
                  <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
                    <NotebookGrid width={boxW} height={boxH} />
                  </Canvas>
                </View>
              </View>
            )}
          </View>

          {mode === 'write' ? (
            <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
              {writeStrokes.map((s, i) => (
                <Path
                  key={i}
                  path={strokeToPath(s)}
                  color={colors.text}
                  style="stroke"
                  strokeWidth={3}
                  strokeCap="round"
                  strokeJoin="round"
                />
              ))}
              {drawing ? (
                <Path
                  path={strokeToPath(drawing)}
                  color={colors.text}
                  style="stroke"
                  strokeWidth={3}
                  strokeCap="round"
                  strokeJoin="round"
                  start={0}
                  end={drawEnd}
                />
              ) : null}
            </Canvas>
          ) : null}

            {cursorVisible ? <DemoHand pos={cursorXY} pressing={pressing} /> : null}
          </View>
        </View>

        {/* Correct indicator, sat just above the route's Watch button. */}
        <View style={styles.resultArea}>
          {solved ? (
            <Ionicons name="checkmark-circle" size={40} color={colors.correct} />
          ) : null}
        </View>

        {/* Mode-change card over a full-view dimmed scrim. */}
        {transition ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.transition, { opacity: transFade }]}
          >
            <View style={styles.transCard}>
              <Ionicons name="arrow-forward-circle" size={26} color={clockColors.hourHand} />
              <Text style={styles.transText}>{transition}</Text>
            </View>
          </Animated.View>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%', alignItems: 'center' },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  resultArea: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  chipSpacer: { height: 40 },
  chipText: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  stage: { position: 'relative', alignItems: 'center' },
  work: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sub: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  answerLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    alignSelf: 'stretch',
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  answerHint: { fontSize: typography.size.body, color: colors.textMuted },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  writeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  writeBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  colon: {
    fontSize: typography.size.display,
    fontWeight: typography.weight.medium,
    color: clockColors.minuteHand,
  },
  transition: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,28,40,0.45)',
  },
  transCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  transText: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
});
