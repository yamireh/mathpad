import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip } from '../../ui';
import { spacing } from '../../../constants/design';
import type { ProblemLayout } from '../../../types';

export interface LayoutToggleProps {
  /** True when the long-division layout is currently active. */
  isLongDivision: boolean;
  /** Accent colour applied to the selected chip. */
  tone: string;
  /** Called with the layout the kid picked. */
  onChange: (layout: ProblemLayout) => void;
  /**
   * The non-long layout to switch to (depends on the question — in-row
   * for plain integer division, decimal for decimal-answer division).
   */
  inlineLayout: ProblemLayout;
}

/**
 * Division-only layout switcher — "Long division" vs the inline (in-row /
 * decimal) layout. Hidden for every operation that isn't division.
 */
export function LayoutToggle({
  isLongDivision,
  tone,
  onChange,
  inlineLayout,
}: LayoutToggleProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <Chip
        label={t('practice.layoutLong')}
        selected={isLongDivision}
        tone={tone}
        onPress={() => onChange('divisionLong')}
      />
      <Chip
        label={t('practice.layoutInline')}
        selected={!isLongDivision}
        tone={tone}
        onPress={() => onChange(inlineLayout)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
