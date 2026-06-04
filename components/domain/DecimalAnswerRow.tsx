import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../constants/design';
import type { ReviewMarks } from '../../lib/review';
import { AnswerBox } from './AnswerBox';
import { type AnswerInk } from './ink';
import { ANSWER_BOX_HEIGHT, DIGIT_COLUMN_WIDTH, type AnswerShape } from './layout';
import { DECIMAL_SEPARATOR, decimalDotWidth } from './problem/shared';

export interface DecimalAnswerRowProps {
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
  /**
   * Render the decimal point as a thin overlay between cells (no column)
   * instead of a fixed column. Used for multiplication, whose answer aligns
   * with the integer partial-product rows.
   */
  thinDot?: boolean;
  /** Review error-highlight marks keyed by box id. */
  errorMarks?: ReviewMarks | null;
  /** Answer-box ids a hint filled in — drawn in the hint colour. */
  hintedBoxes?: ReadonlySet<string>;
}

/**
 * Decimal-mode answer area: integer boxes, a PRE-PRINTED decimal separator
 * (never handwritten), then decimal boxes. Laid out on the same fixed-width
 * column grid as the operands (cell-width boxes + a fixed dot column) so the
 * point lines up under the operands in the vertical +/−/× layout.
 */
export function DecimalAnswerRow({
  ink,
  onClearBox,
  selectedBox,
  onSelectBox,
  tone = colors.text,
  isBoxWritable,
  cellWidth,
  boxHeight,
  thinDot = false,
  errorMarks,
  hintedBoxes,
}: DecimalAnswerRowProps) {
  const { t } = useTranslation();
  const writable = isBoxWritable ?? (() => true);
  const separatorHeight = (boxHeight ?? ANSWER_BOX_HEIGHT) + 22;
  const cw = cellWidth ?? DIGIT_COLUMN_WIDTH;
  const dotWidth = decimalDotWidth(cw);

  return (
    <View style={[styles.row, thinDot && styles.thinRow]}>
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
            hinted={hintedBoxes?.has(id) ?? false}
          />
        );
      })}

      {thinDot ? null : (
        <View
          style={[
            styles.separator,
            { height: separatorHeight, width: dotWidth },
          ]}
        >
          <Text style={styles.separatorText}>{DECIMAL_SEPARATOR}</Text>
        </View>
      )}

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
            cellWidth={cellWidth}
            boxHeight={boxHeight}
            status={errorMarks?.get(id) ?? null}
            hinted={hintedBoxes?.has(id) ?? false}
          />
        );
      })}

      {thinDot ? (
        <Text
          style={[
            styles.thinDot,
            { left: ink.integer.length * cw - cw * 0.12, top: separatorHeight - spacing.xl },
          ]}
        >
          {DECIMAL_SEPARATOR}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  thinRow: { position: 'relative' },
  separator: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.md,
  },
  separatorText: {
    fontSize: typography.size.heading,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  thinDot: {
    position: 'absolute',
    fontSize: typography.size.heading,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
});
