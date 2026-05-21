import { Canvas, Path } from '@shopify/react-native-skia';
import { useTranslation } from 'react-i18next';
import {
  type GestureResponderEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '../ui';
import { colors, radius, spacing, typography } from '../../constants/design';
import { type InkStroke, strokeToPath, useInkCapture } from './ink';

export interface AnswerPadProps {
  /** The active answer box's current ink. */
  strokes: InkStroke[];
  /** Reports the box's full stroke list after each completed stroke. */
  onStrokesChange: (strokes: InkStroke[]) => void;
  /** Return to the scratch area. */
  onDone: () => void;
  tone: string;
}

/** Stroke width on the big pad (thicker — strokes are scaled down in the box). */
const STROKE_WIDTH = 4;

/**
 * The large writing pad for the focused answer box. The kid writes a digit
 * here at a comfortable size; the strokes mirror into the small answer box
 * (scaled), and recognition still happens only at Finish.
 */
export function AnswerPad({
  strokes,
  onStrokesChange,
  onDone,
  tone,
}: AnswerPadProps) {
  const { t } = useTranslation();
  const ink = useInkCapture(strokes, onStrokesChange);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          label={t('common.clear')}
          variant="secondary"
          fullWidth={false}
          onPress={ink.clear}
        />
        <Text style={styles.hint}>{t('practice.answerPadHint')}</Text>
        <Button
          label={t('common.done')}
          tone={tone}
          fullWidth={false}
          onPress={onDone}
        />
      </View>

      <View
        style={styles.canvas}
        accessibilityLabel={t('a11y.answerPad')}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e: GestureResponderEvent) =>
          ink.beginStroke(e.nativeEvent.locationX, e.nativeEvent.locationY)
        }
        onResponderMove={(e: GestureResponderEvent) =>
          ink.extendStroke(e.nativeEvent.locationX, e.nativeEvent.locationY)
        }
        onResponderRelease={ink.endStroke}
        onResponderTerminate={ink.endStroke}
      >
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {ink.strokes.map((stroke, i) => (
            <Path
              key={i}
              path={strokeToPath(stroke)}
              color={colors.text}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              strokeCap="round"
              strokeJoin="round"
            />
          ))}
          {ink.currentStroke ? (
            <Path
              path={strokeToPath(ink.currentStroke)}
              color={colors.text}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              strokeCap="round"
              strokeJoin="round"
            />
          ) : null}
        </Canvas>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  hint: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.body,
    color: colors.textMuted,
  },
  canvas: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
});
