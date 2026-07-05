import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../constants/design';
import { type IoniconName } from './IconButton';

/** How many digits the adult must read back. */
const CHALLENGE_LENGTH = 4;

function randomDigits(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * 10));
}

export interface ParentalGateProps {
  visible: boolean;
  /** Called once the adult enters the correct sequence. */
  onSuccess: () => void;
  /** Called when the gate is dismissed without passing. */
  onCancel: () => void;
  /**
   * Fires after the modal has *fully* dismissed (iOS `Modal.onDismiss`). The
   * gated action must wait for this — presenting the StoreKit sheet while the
   * modal is still animating out silently fails on iOS.
   */
  onClosed?: () => void;
}

/**
 * Parental gate — required by Apple's Kids-category rules (guideline 1.3) in
 * front of anything that leaves the app or makes a purchase.
 *
 * It shows a short sequence of numbers spelled out as *words*, which an adult
 * reads and types back on a keypad. Reading words defeats random tapping and
 * (unlike an arithmetic gate) doesn't lean on the child's math skill — which
 * matters here because the app itself teaches that math. The gate cannot be
 * disabled or remembered: it re-challenges on every gated action, a wrong
 * answer regenerates the sequence, and the only way past without solving it is
 * to cancel.
 */
export function ParentalGate({
  visible,
  onSuccess,
  onCancel,
  onClosed,
}: ParentalGateProps) {
  const { t } = useTranslation();
  const words = t('parentalGate.numbers', {
    returnObjects: true,
  }) as unknown as string[];

  const [target, setTarget] = useState<number[]>(() =>
    randomDigits(CHALLENGE_LENGTH),
  );
  const [entered, setEntered] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  // Fresh challenge every time the gate opens; clear any stale input.
  useEffect(() => {
    if (visible) {
      setTarget(randomDigits(CHALLENGE_LENGTH));
      setEntered([]);
      setWrong(false);
    }
  }, [visible]);

  const fail = () => {
    setWrong(true);
    Animated.sequence([
      Animated.timing(shake, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
    // New sequence after a wrong attempt — a fixed answer can't be brute-forced.
    setTarget(randomDigits(CHALLENGE_LENGTH));
    setEntered([]);
  };

  const press = (digit: number) => {
    if (wrong) setWrong(false);
    const next = [...entered, digit];
    if (next.length < CHALLENGE_LENGTH) {
      setEntered(next);
      return;
    }
    // Final digit entered — check the whole sequence.
    if (next.every((d, i) => d === target[i])) {
      setEntered([]);
      onSuccess();
    } else {
      fail();
    }
  };

  const backspace = () => {
    if (wrong) setWrong(false);
    setEntered((e) => e.slice(0, -1));
  };

  const translateX = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-10, 10],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      onDismiss={onClosed}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[styles.dialog, { transform: [{ translateX }] }]}
          accessibilityViewIsModal
          accessibilityLabel={t('parentalGate.title')}
        >
          <Text style={styles.title}>{t('parentalGate.title')}</Text>
          <Text style={styles.instruction}>{t('parentalGate.instruction')}</Text>

          <Text
            style={styles.words}
            accessibilityLabel={target.map((d) => words[d]).join(', ')}
          >
            {target.map((d) => words[d]).join('   ')}
          </Text>

          <View style={styles.dots}>
            {Array.from({ length: CHALLENGE_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < entered.length && styles.dotFilled,
                  wrong && styles.dotWrong,
                ]}
              />
            ))}
          </View>

          <Text style={[styles.status, !wrong && styles.statusHidden]}>
            {t('parentalGate.wrong')}
          </Text>

          <View style={styles.keypad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <Key key={n} label={String(n)} onPress={() => press(n)} />
            ))}
            <View style={styles.key} />
            <Key label="0" onPress={() => press(0)} />
            <Key
              icon="backspace-outline"
              accessibilityLabel={t('parentalGate.delete')}
              onPress={backspace}
            />
          </View>

          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            style={styles.cancel}
          >
            <Text style={styles.cancelLabel}>{t('common.cancel')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Key({
  label,
  icon,
  accessibilityLabel,
  onPress,
}: {
  label?: string;
  icon?: IoniconName;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.key,
        styles.keyActive,
        pressed && styles.keyPressed,
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={24} color={colors.text} />
      ) : (
        <Text style={styles.keyLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

const KEY_SIZE = 72;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 40, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  instruction: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  words: {
    fontSize: typography.size.heading,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotFilled: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  dotWrong: {
    borderColor: colors.wrong,
    backgroundColor: 'transparent',
  },
  status: {
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    height: typography.lineHeight.caption,
    color: colors.wrong,
    marginTop: spacing.md,
  },
  statusHidden: { opacity: 0 },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    width: KEY_SIZE * 3 + spacing.sm * 2,
  },
  key: {
    width: KEY_SIZE,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyActive: { backgroundColor: colors.surfaceAlt },
  keyPressed: { transform: [{ scale: 0.94 }], opacity: 0.85 },
  keyLabel: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  cancel: {
    marginTop: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
});
