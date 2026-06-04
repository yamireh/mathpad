import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

export interface AttentionPulseProps {
  /** While true, the child gently pulses to draw the eye. */
  active: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps a child in a soft, repeating "look at me" pulse (a calm heartbeat
 * grow/shrink, not a harsh blink) — used to nudge first-time users toward an
 * affordance. Renders the child statically when `active` is false.
 */
export function AttentionPulse({ active, children, style }: AttentionPulseProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 460,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 460,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(1100),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] });

  return (
    <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
      {children}
    </Animated.View>
  );
}
