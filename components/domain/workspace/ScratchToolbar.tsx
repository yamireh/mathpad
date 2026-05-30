import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '../../ui';
import { spacing } from '../../../constants/design';

export interface ScratchToolbarProps {
  /** Wipe every scratch stroke. */
  onClear: () => void;
  /** Undo the last scratch stroke. */
  onUndo: () => void;
}

/**
 * Tiny toolbar shown at the top of the scratch view (after the kid has
 * filled their answers). Layout mirrors the writing pad's collapsed
 * header so the icons stay in the same visual position across both
 * states.
 */
export function ScratchToolbar({ onClear, onUndo }: ScratchToolbarProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <IconButton
        name="trash-outline"
        accessibilityLabel={t('practice.clearScratch')}
        onPress={onClear}
      />
      <IconButton
        name="arrow-undo-outline"
        accessibilityLabel={t('practice.undo')}
        onPress={onUndo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
