import { getLocales } from 'expo-localization';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../constants/design';
import { AnswerBox } from './AnswerBox';
import { type AnswerInk } from './ink';
import { ANSWER_BOX_HEIGHT, type AnswerShape } from './layout';

export interface DecimalAnswerRowProps {
  shape: AnswerShape;
  ink: AnswerInk;
  onClearBox: (boxId: string) => void;
  selectedBox: string | null;
  onSelectBox: (boxId: string) => void;
  tone?: string;
  isBoxWritable?: (boxId: string) => boolean;
}

/**
 * Decimal-mode answer area: integer boxes, a PRE-PRINTED decimal separator
 * (never handwritten), then up to three decimal boxes. The separator follows
 * the device locale.
 */
const DECIMAL_SEPARATOR = getLocales()[0]?.decimalSeparator ?? '.';

export function DecimalAnswerRow({
  ink,
  onClearBox,
  selectedBox,
  onSelectBox,
  tone = colors.text,
  isBoxWritable,
}: DecimalAnswerRowProps) {
  const { t } = useTranslation();
  const writable = isBoxWritable ?? (() => true);

  return (
    <View style={styles.row}>
      {ink.integer.map((boxStrokes, i) => {
        const id = `int-${i}`;
        return (
          <AnswerBox
            key={id}
            accessibilityLabel={t('a11y.answerBox', { position: i + 1 })}
            tone={tone}
            selected={selectedBox === id}
            locked={!writable(id)}
            onSelect={() => onSelectBox(id)}
            strokes={boxStrokes}
            onClear={() => onClearBox(id)}
          />
        );
      })}

      <View style={styles.separator}>
        <Text style={styles.separatorText}>{DECIMAL_SEPARATOR}</Text>
      </View>

      {ink.decimal.map((boxStrokes, i) => {
        const id = `dec-${i}`;
        return (
          <AnswerBox
            key={id}
            accessibilityLabel={t('a11y.decimalBox', { position: i + 1 })}
            tone={tone}
            selected={selectedBox === id}
            locked={!writable(id)}
            onSelect={() => onSelectBox(id)}
            strokes={boxStrokes}
            onClear={() => onClearBox(id)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  separator: {
    height: ANSWER_BOX_HEIGHT + 22,
    justifyContent: 'flex-end',
    paddingBottom: spacing.md,
  },
  separatorText: {
    fontSize: typography.size.heading,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
});
