/**
 * PadRegion — the bottom-of-screen wrapper that hosts the AnswerPad while
 * a box is active. Shared between every operation's render branch so the
 * pad's collapse / nonce / undo / clear plumbing isn't duplicated.
 *
 * The kid-facing styling (full-height vs collapsed sliver anchored at the
 * bottom of the screen) is driven entirely by `collapsed`, and the caller
 * passes both the current strokes for the active box and the change
 * handler — keeping PadRegion presentational.
 */
import { StyleSheet, View } from 'react-native';

import { AnswerPad } from '../AnswerPad';
import type { InkStroke } from '../ink';
import { spacing } from '../../../constants/design';

export interface PadRegionProps {
  /** Active box id — used as the React key so a new box remounts the pad. */
  activeBox: string;
  /** Bumped externally (e.g. after Clear All) to force-remount the pad. */
  padNonce: number;
  /** True when the pad is collapsed to its toolbar + sliver of canvas. */
  collapsed: boolean;
  /** Toggle the collapsed state. */
  onToggleCollapsed: () => void;
  /** Current strokes shown inside the pad. */
  strokes: InkStroke[];
  /** Fires the moment a new stroke begins — used to cancel auto-advance. */
  onStrokeStart?: () => void;
  /** Reports the pad's full stroke list after each completed stroke. */
  onStrokesChange: (strokes: InkStroke[]) => void;
  /** Wipe every input area on this question. */
  onClearAll: () => void;
  /** Undo the last input change. */
  onUndo?: () => void;
  /** Whether there is anything left to undo. */
  canUndo?: boolean;
}

export function PadRegion({
  activeBox,
  padNonce,
  collapsed,
  onToggleCollapsed,
  strokes,
  onStrokeStart,
  onStrokesChange,
  onClearAll,
  onUndo,
  canUndo,
}: PadRegionProps) {
  return (
    <View style={collapsed ? styles.collapsed : styles.full}>
      <AnswerPad
        key={`${activeBox}:${padNonce}`}
        strokes={strokes}
        onStrokeStart={onStrokeStart}
        onStrokesChange={onStrokesChange}
        onClearAll={onClearAll}
        onUndo={onUndo}
        canUndo={canUndo}
        onToggleCollapsed={onToggleCollapsed}
        collapsed={collapsed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  // Collapsed: still takes the full bottom region, but pushes its content
  // (the toolbar + canvas sliver) to the bottom edge so the answer area
  // above gets the freed-up space.
  collapsed: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    justifyContent: 'flex-end',
  },
});
