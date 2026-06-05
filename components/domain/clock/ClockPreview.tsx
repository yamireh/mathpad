import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Header, IconButton, ScreenContainer } from '../../ui';
import { clockColors, colors, spacing, typography } from '../../../constants/design';
import {
  checkPattern,
  clockPhrase,
  formatDigital,
  generateClockTime,
  patternBank,
  type ClockStep,
  type ClockToken,
} from '../../../lib/clock';
import { ClockFace } from './ClockFace';
import { DigitalClockAnswer } from './DigitalClockAnswer';
import { PatternBuilder } from './PatternBuilder';

const STEPS: { step: ClockStep; label: string }[] = [
  { step: 'quarter', label: '15s' },
  { step: 'five', label: '5s' },
  { step: 'minute', label: 'Min' },
];

/**
 * Dev-only interactive preview of the Clock building blocks (face + pattern
 * builder). Mounted from `app/clock.tsx` only in `__DEV__` so the real Clock
 * topic stays "Coming Soon" in production while we build it.
 */
export function ClockPreview() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<ClockStep>('quarter');
  const [showRing, setShowRing] = useState(true);
  const [answer, setAnswer] = useState<'digital' | 'pattern'>('digital');
  const [time, setTime] = useState(() => generateClockTime('quarter'));
  const [built, setBuilt] = useState<ClockToken[]>([]);
  const [resetNonce, setResetNonce] = useState(0);

  const bank = useMemo(() => patternBank(clockPhrase(time)), [time]);
  const solved = answer === 'pattern' && built.length > 0 && checkPattern(time, built);

  const newTime = (s: ClockStep = step) => {
    setTime(generateClockTime(s));
    setBuilt([]);
    setResetNonce((n) => n + 1);
  };

  return (
    <ScreenContainer scroll>
      <Header
        title="Clock (preview)"
        left={
          <IconButton
            name="arrow-back"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
          />
        }
      />

      <View style={styles.clockWrap}>
        <ClockFace time={time} size={260} showRing={showRing} />
      </View>
      <Text style={styles.answer}>
        {formatDigital(time)}
        {solved ? '  ✓' : ''}
      </Text>

      <View style={styles.row}>
        {STEPS.map(({ step: s, label }) => (
          <View key={s} style={styles.flex}>
            <Button
              label={label}
              variant={s === step ? 'primary' : 'secondary'}
              tone={clockColors.hourHand}
              onPress={() => {
                setStep(s);
                newTime(s);
              }}
            />
          </View>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.flex}>
          <Button
            label={showRing ? 'Ring: on' : 'Ring: off'}
            variant="secondary"
            onPress={() => setShowRing((v) => !v)}
          />
        </View>
        <View style={styles.flex}>
          <Button
            label="New time"
            tone={clockColors.hourHand}
            onPress={() => newTime()}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.flex}>
          <Button
            label="Digital"
            variant={answer === 'digital' ? 'primary' : 'secondary'}
            tone={clockColors.minuteHand}
            onPress={() => setAnswer('digital')}
          />
        </View>
        <View style={styles.flex}>
          <Button
            label="Pattern"
            variant={answer === 'pattern' ? 'primary' : 'secondary'}
            tone={clockColors.minuteHand}
            onPress={() => setAnswer('pattern')}
          />
        </View>
      </View>

      <Card style={styles.builder}>
        {answer === 'pattern' ? (
          <PatternBuilder
            bank={bank}
            built={built}
            onAdd={(token) => setBuilt((b) => [...b, token])}
            onRemove={(i) => setBuilt((b) => b.filter((_, idx) => idx !== i))}
          />
        ) : (
          <DigitalClockAnswer
            key={resetNonce}
            onHourChange={() => {}}
            onMinuteChange={() => {}}
          />
        )}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  clockWrap: { alignItems: 'center', marginTop: spacing.lg },
  answer: {
    textAlign: 'center',
    marginTop: spacing.md,
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  flex: { flex: 1 },
  builder: { marginTop: spacing.lg },
});
