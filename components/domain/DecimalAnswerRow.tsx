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
  onChange: (ink: AnswerInk) => void;
  selectedBox: string | null;
  onSelectBox: (boxId: string) => void;
  tone?: string;
}

/**
 * Decimal-mode answer area: integer boxes, a PRE-PRINTED decimal separator
 * (never handwritten), then up to three decimal boxes. The separator follows
 * the device locale.
 */
const DECIMAL_SEPARATOR = getLocales()[0]?.decimalSeparator ?? '.';

export function DecimalAnswerRow({
  ink,
  onChange,
  selectedBox,
  onSelectBox,
  tone = colors.text,
}: DecimalAnswerRowProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      {ink.integer.map((boxStrokes, i) => (
        <AnswerBox
          key={`int-${i}`}
          accessibilityLabel={t('a11y.answerBox', { position: i + 1 })}
          tone={tone}
          selected={selectedBox === `int-${i}`}
          onSelect={() => onSelectBox(`int-${i}`)}
          strokes={boxStrokes}
          onClear={() =>
            onChange({
              ...ink,
              integer: ink.integer.map((s, idx) => (idx === i ? [] : s)),
            })
          }
        />
      ))}

      <View style={styles.separator}>
        <Text style={styles.separatorText}>{DECIMAL_SEPARATOR}</Text>
      </View>

      {ink.decimal.map((boxStrokes, i) => (
        <AnswerBox
          key={`dec-${i}`}
          accessibilityLabel={t('a11y.decimalBox', { position: i + 1 })}
          tone={tone}
          selected={selectedBox === `dec-${i}`}
          onSelect={() => onSelectBox(`dec-${i}`)}
          strokes={boxStrokes}
          onClear={() =>
            onChange({
              ...ink,
              decimal: ink.decimal.map((s, idx) => (idx === i ? [] : s)),
            })
          }
        />
      ))}
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
