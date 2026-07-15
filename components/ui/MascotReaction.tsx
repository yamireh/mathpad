import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type ImageSourcePropType,
  StyleSheet,
  type StyleProp,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { colors, spacing, typography } from '../../constants/design';

/** Bundled mascot artwork. Callers may override via the `source` prop. */
const MASCOT_SOURCE = require('../../assets/mascot.png');

/** The mood the mascot is currently expressing. */
export type MascotMood =
  /** Resting — a slow, gentle float. */
  | 'idle'
  /** Working on it — a soft side-to-side sway. */
  | 'thinking'
  /** A single correct answer — one happy pop. */
  | 'correct'
  /** A wrong answer — a soft, non-harsh head shake. */
  | 'wrong'
  /** Bigger win (e.g. finishing a set) — a short repeated cheer. */
  | 'celebrate';

export interface MascotReactionProps {
  /** Which reaction the mascot is showing. Defaults to `'idle'`. */
  reaction?: MascotMood;
  /** Rendered width/height of the mascot, in points. Defaults to 88. */
  size?: number;
  /**
   * Optional caption beneath the mascot (e.g. "Great job!"). Pass an
   * already-localized string; this component is presentation-only.
   */
  message?: string;
  /** Override the mascot artwork. Defaults to the bundled mascot. */
  source?: ImageSourcePropType;
  /** Overrides the VoiceOver label for the mascot image. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Whether a mood animates continuously (loops) or plays once. */
const LOOPS: Record<MascotMood, boolean> = {
  idle: true,
  thinking: true,
  correct: false,
  wrong: false,
  celebrate: false,
};

/** Default VoiceOver labels, used when `accessibilityLabel` is not supplied. */
const A11Y_LABEL: Record<MascotMood, string> = {
  idle: 'Mascot',
  thinking: 'Mascot thinking',
  correct: 'Mascot celebrating a correct answer',
  wrong: 'Mascot after a wrong answer',
  celebrate: 'Mascot cheering',
};

/**
 * Builds the animation for a mood. `anim` is a single 0→…→ driver; each mood
 * maps its own range of that driver onto the transforms in {@link moodTransform}.
 */
function buildAnimation(
  mood: MascotMood,
  anim: Animated.Value,
): Animated.CompositeAnimation {
  const timing = (toValue: number, duration: number, easing = Easing.inOut(Easing.ease)) =>
    Animated.timing(anim, { toValue, duration, easing, useNativeDriver: true });

  switch (mood) {
    case 'idle':
      // Slow breathing float, up and back down forever.
      return Animated.loop(Animated.sequence([timing(1, 1600), timing(0, 1600)]));
    case 'thinking':
      // Gentle sway, a touch quicker than idle.
      return Animated.loop(Animated.sequence([timing(1, 900), timing(0, 900)]));
    case 'correct':
      // One springy pop, then settle.
      return Animated.sequence([
        timing(1, 200, Easing.out(Easing.back(2))),
        timing(0, 260),
      ]);
    case 'wrong':
      // A soft, calm head shake (not a harsh blink — SPEC § motion).
      return timing(1, 420);
    case 'celebrate':
      // A few quick bounces + wiggle.
      return Animated.loop(timing(1, 520), { iterations: 3 });
  }
}

/** Transforms for a mood, driven by the shared 0→1 `anim` value. */
function moodTransform(mood: MascotMood, anim: Animated.Value) {
  switch (mood) {
    case 'idle':
      return [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }];
    case 'thinking':
      return [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) }];
    case 'correct':
      return [
        { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) },
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
      ];
    case 'wrong':
      return [
        {
          translateX: anim.interpolate({
            inputRange: [0, 0.25, 0.5, 0.75, 1],
            outputRange: [0, -5, 5, -3, 0],
          }),
        },
      ];
    case 'celebrate':
      return [
        { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.1, 1] }) },
        {
          rotate: anim.interpolate({
            inputRange: [0, 0.25, 0.5, 0.75, 1],
            outputRange: ['0deg', '5deg', '-5deg', '5deg', '0deg'],
          }),
        },
      ];
  }
}

/** Message tint follows the marking palette — green for wins, coral for misses. */
function messageColor(mood: MascotMood): string {
  if (mood === 'correct' || mood === 'celebrate') return colors.correct;
  if (mood === 'wrong') return colors.wrong;
  return colors.textMuted;
}

/**
 * The MathPad mascot, animated to react to what the child just did. A single
 * static illustration is brought to life with restrained motion — a float when
 * idle, a happy pop on a correct answer, a soft shake on a wrong one. Motion is
 * skipped entirely when the OS "Reduce Motion" setting is on.
 *
 * Presentation-only: pass an already-localized `message`; state (which
 * `reaction` to show, when) belongs to the caller.
 */
export function MascotReaction({
  reaction = 'idle',
  size = 88,
  message,
  source,
  accessibilityLabel,
  style,
}: MascotReactionProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    anim.setValue(0);
    if (reduceMotion) return;
    const animation = buildAnimation(reaction, anim);
    animation.start();
    return () => animation.stop();
  }, [reaction, reduceMotion, anim]);

  return (
    <View style={[styles.container, style]}>
      <Animated.Image
        source={source ?? MASCOT_SOURCE}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel ?? A11Y_LABEL[reaction]}
        resizeMode="contain"
        style={[
          { width: size, height: size },
          reduceMotion ? null : { transform: moodTransform(reaction, anim) },
        ]}
      />
      {message ? (
        <Text style={[styles.message, { color: messageColor(reaction) }]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  message: {
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
});
