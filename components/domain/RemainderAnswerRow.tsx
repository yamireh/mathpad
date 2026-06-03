import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../constants/design';
import type { ReviewMarks } from '../../lib/review';
import { AnswerBox } from './AnswerBox';
import { type AnswerInk } from './ink';
import { ANSWER_BOX_HEIGHT, type AnswerShape } from './layout';

export interface RemainderAnswerRowProps {
  shape: AnswerShape;
  ink: AnswerInk;
  onClearBox: (boxId: string) => void;
  selectedBox: string | null;
  onSelectBox: (boxId: string) => void;
  tone?: string;
  isBoxWritable?: (boxId: string) => boolean;
  /** Column / cell width — defaults to the full grid. */
  cellWidth?: number;
  /** Answer box height — defaults to the full grid. */
  boxHeight?: number;
  /** Review error-highlight marks keyed by box id. */
  errorMarks?: ReviewMarks | null;
}

/** Remainder-mode answer area: quotient boxes, an "R", then remainder boxes. */
export function RemainderAnswerRow({
  ink,
  onClearBox,
  selectedBox,
  onSelectBox,
  tone = colors.text,
  isBoxWritable,
  cellWidth,
  boxHeight,
  errorMarks,
}: RemainderAnswerRowProps) {
  const { t } = useTranslation();
  const writable = isBoxWritable ?? (() => true);
  const labelHeight = (boxHeight ?? ANSWER_BOX_HEIGHT) + 22;

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
            cellWidth={cellWidth}
            boxHeight={boxHeight}
            status={errorMarks?.get(id) ?? null}
          />
        );
      })}

      <View style={[styles.label, { height: labelHeight }]}>
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
            onClear={() => onClearBox(id)}
            cellWidth={cellWidth}
            boxHeight={boxHeight}
            status={errorMarks?.get(id) ?? null}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  label: {
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
