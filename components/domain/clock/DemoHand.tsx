import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Animated, StyleSheet } from 'react-native';

import { colors } from '../../../constants/design';

/** Demo hand colour — a neutral dark so it never clashes with the (blue) hour
 *  hand or the (orange) minute hand it's guiding. */
export const DEMO_HAND_COLOR = colors.text;
const SIZE = 44;

export interface DemoHandProps {
  /** Fingertip position, driven by an Animated value so moving the hand never
   *  re-renders the React tree (which would jitter the clock / tiles). */
  pos: Animated.ValueXY;
  /** Press-down pulse (a tap). */
  pressing?: boolean;
}

/** The guiding pointing-hand used in the clock how-to demo. */
export function DemoHand({ pos, pressing = false }: DemoHandProps) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.hand,
        {
          transform: [
            { translateX: Animated.subtract(pos.x, SIZE / 2) },
            { translateY: Animated.subtract(pos.y, 4) },
            { scale: pressing ? 0.84 : 1 },
          ],
        },
      ]}
    >
      <MaterialCommunityIcons
        name="hand-pointing-up"
        size={SIZE}
        color={DEMO_HAND_COLOR}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hand: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    shadowColor: '#1C1C28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
});
