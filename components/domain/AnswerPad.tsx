import { Canvas, Path } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type GestureResponderEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { IconButton, TipBubble } from '../ui';
import { colors, radius, spacing, typography } from '../../constants/design';
import { useCursorTarget } from './cursorTarget';
import { NotebookGrid } from './NotebookGrid';
import { type InkStroke, strokeToFreehandPath, useInkCapture } from './ink';

export interface AnswerPadProps {
  /** The active answer box's current ink. */
  strokes: InkStroke[];
  /** Reports the box's full stroke list after each completed stroke. */
  onStrokesChange: (strokes: InkStroke[]) => void;
  /** Fires the moment a new stroke begins (used to cancel an auto-advance). */
  onStrokeStart?: () => void;
  /** Clear every answer box (per-box clears live on the boxes themselves). */
  onClearAll: () => void;
  /** Undo the last input change on this question (any input area). */
  onUndo?: () => void;
  /** Whether there is anything left to undo. */
  canUndo?: boolean;
  /** Toggle the pad between full-height (expanded) and a small handle. */
  onToggleCollapsed: () => void;
  /** When true, the pad shrinks to its toolbar + a small touch sliver. */
  collapsed?: boolean;
}

/**
 * The large writing pad for the focused answer box. The kid writes a digit
 * here at a comfortable size; the strokes mirror into the small answer box
 * (scaled). When the kid pauses on a final-answer box the workspace recognizes
 * that box right away (see `commitAnswerBox`); the whole answer is still
 * re-recognized at Finish for marking.
 */
export function AnswerPad({
  strokes,
  onStrokesChange,
  onStrokeStart,
  onClearAll,
  onUndo,
  canUndo = false,
  onToggleCollapsed,
  collapsed = false,
}: AnswerPadProps) {
  const { t } = useTranslation();
  const ink = useInkCapture(strokes, onStrokesChange);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Demo solver: report the drawing surface so the hand can scribble over it.
  // Inert during normal practice (`enabled` is false).
  const canvasRef = useRef<View>(null);
  const { enabled: cursorEnabled, reportPad } = useCursorTarget();
  useEffect(() => {
    if (!cursorEnabled || collapsed) return;
    // One frame in, so the pad has laid out before we measure it.
    const id = setTimeout(() => reportPad(canvasRef.current), 60);
    return () => clearTimeout(id);
  }, [cursorEnabled, collapsed, reportPad]);

  return (
    <View style={[styles.container, collapsed && styles.containerCollapsed]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconButton
            name="trash-outline"
            accessibilityLabel={t('common.clearAll')}
            onPress={onClearAll}
          />
          {onUndo ? (
            <IconButton
              name="arrow-undo-outline"
              accessibilityLabel={t('practice.undo')}
              disabled={!canUndo}
              onPress={onUndo}
            />
          ) : null}
        </View>
        <IconButton
          name={collapsed ? 'chevron-up' : 'chevron-down'}
          accessibilityLabel={
            collapsed ? t('practice.openPad') : t('practice.closePad')
          }
          onPress={onToggleCollapsed}
        />
      </View>

      <View
        ref={canvasRef}
        style={[styles.canvas, collapsed && styles.canvasCollapsed]}
        accessibilityLabel={t('a11y.answerPad')}
        onLayout={(e) =>
          setSize({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
        onStartShouldSetResponder={() => !collapsed}
        onMoveShouldSetResponder={() => !collapsed}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e: GestureResponderEvent) => {
          onStrokeStart?.();
          ink.beginStroke(e.nativeEvent.locationX, e.nativeEvent.locationY);
        }}
        onResponderMove={(e: GestureResponderEvent) =>
          ink.extendStroke(e.nativeEvent.locationX, e.nativeEvent.locationY)
        }
        onResponderRelease={ink.endStroke}
        onResponderTerminate={ink.endStroke}
      >
        {!collapsed ? (
          <Text style={styles.label} pointerEvents="none">
            {t('practice.workspace')}
          </Text>
        ) : null}
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {!collapsed ? <NotebookGrid width={size.w} height={size.h} /> : null}
          {ink.strokes.map((stroke, i) => (
            <Path
              key={i}
              path={strokeToFreehandPath(stroke, true)}
              color={colors.text}
              style="fill"
            />
          ))}
          {ink.currentStroke ? (
            <Path
              path={strokeToFreehandPath(ink.currentStroke, false)}
              color={colors.text}
              style="fill"
            />
          ) : null}
        </Canvas>

        <View style={styles.tipOverlay} pointerEvents="box-none">
          <TipBubble
            id="write-in-pad"
            when={ink.isEmpty}
            text={t('practice.tips.writeInPad')}
            pointer="none"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.sm },
  containerCollapsed: { flex: 0, gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  canvas: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  // Collapsed: a short sliver below the toolbar so the kid can still see
  // the writing-pad surface is parked there, ready to be re-opened.
  canvasCollapsed: { flex: 0, height: 36 },
  label: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    zIndex: 1,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
    opacity: 0.45,
  },
  tipOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
