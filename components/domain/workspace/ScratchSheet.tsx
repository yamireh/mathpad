/**
 * ScratchSheet — a slide-up overlay giving the kid a free scratch canvas for
 * working out (e.g. estimating a long-division quotient digit: "how many 82s in
 * 735?" → try 82×8, 82×9). Opens over the problem, which stays untouched
 * underneath; closing returns to the question. The scribbles persist per
 * question via the same `scratchInk` the +/−/× layout stores, so reopening
 * shows prior work.
 */
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '../../ui';
import { colors, radius, spacing, typography } from '../../../constants/design';
import { ScratchCanvas, type ScratchCanvasHandle } from '../ScratchCanvas';
import type { InkStroke } from '../ink';

export interface ScratchSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Persisted scratch strokes for this question. */
  strokes?: InkStroke[];
  onStrokesChange: (strokes: InkStroke[]) => void;
  /** Accent for the header (matches the operation tone). */
  tone: string;
}

/** Full-screen scratch overlay with a clear/undo toolbar and a close button. */
export function ScratchSheet({
  visible,
  onClose,
  strokes,
  onStrokesChange,
  tone,
}: ScratchSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const canvasRef = useRef<ScratchCanvasHandle>(null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <IconButton
              name="trash-outline"
              accessibilityLabel={t('practice.clearScratch')}
              onPress={() => canvasRef.current?.clear()}
            />
            <IconButton
              name="arrow-undo-outline"
              accessibilityLabel={t('practice.undo')}
              onPress={() => canvasRef.current?.undo()}
            />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {t('practice.scratchTitle')}
          </Text>
          <IconButton
            name="close"
            color={tone}
            accessibilityLabel={t('practice.closeScratch')}
            onPress={onClose}
          />
        </View>

        <View style={[styles.canvasWrap, { marginBottom: insets.bottom + spacing.md }]}>
          <ScratchCanvas
            ref={canvasRef}
            tool="pen"
            initialStrokes={strokes}
            onStrokesChange={onStrokesChange}
            accessibilityLabel={t('a11y.scratchCanvas')}
            label={t('practice.scratchButton')}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
  canvasWrap: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
});
