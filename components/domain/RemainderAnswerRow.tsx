import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../constants/design';
import { AnswerBox } from './AnswerBox';
import { type AnswerInk } from './ink';
import { ANSWER_BOX_HEIGHT, type AnswerShape } from './layout';

export interface RemainderAnswerRowProps {
  shape: AnswerShape;
  ink: AnswerInk;
  onChange: (ink: AnswerInk) => void;
  selectedBox: string | null;
  onSelectBox: (boxId: string) => void;
  tone?: string;
  isBoxWritable?: (boxId: string) => boolean;
}

/** Remainder-mode answer area: quotient boxes, an "R", then remainder boxes. */
export function RemainderAnswerRow({
  ink,
  onChange,
  selectedBox,
  onSelectBox,
  tone = colors.text,
  isBoxWritable,
}: RemainderAnswerRowProps) {
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
            onClear={() =>
              onChange({
                ...ink,
                integer: ink.integer.map((s, idx) => (idx === i ? [] : s)),
              })
            }
          />
        );
      })}

      <View style={styles.label}>
        <Text style={styles.labelText}>{t('practice.remainderLabel')}</Text>
      </View>

      {ink.remainder.map((boxStrokes, i) => {
        const id = `rem-${i}`;
        return (
          <AnswerBox
            key={id}
            accessibilityLabel={t('a11y.remainderBox', { position: i + 1 })}
            tone={tone}
            selected={selectedBox === id}
            locked={!writable(id)}
            onSelect={() => onSelectBox(id)}
            strokes={boxStrokes}
            onClear={() =>
              onChange({
                ...ink,
                remainder: ink.remainder.map((s, idx) =>
                  idx === i ? [] : s,
                ),
              })
            }
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  label: {
    height: ANSWER_BOX_HEIGHT + 22,
    justifyContent: 'flex-end',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  labelText: {
    fontSize: typography.size.heading,
    fontWeight: typography.weight.regular,
    color: colors.textMuted,
  },
});
