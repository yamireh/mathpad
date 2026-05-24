import { getLocales } from 'expo-localization';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../constants/design';
import { DirectInkBox } from './DirectInkBox';
import { type AnswerInk, type InkStroke, setBoxStrokes } from './ink';
import { DIVISION_QUOTIENT_HEIGHT, type AnswerShape } from './layout';

export interface DirectAnswerRowProps {
  shape: AnswerShape;
  ink: AnswerInk;
  onChange: (ink: AnswerInk) => void;
}

/** Locale decimal separator, pre-printed between the answer strips. */
const DECIMAL_SEPARATOR = getLocales()[0]?.decimalSeparator ?? '.';

/**
 * The long-division answer area: large, write-directly number strips that flex
 * to fill the width. Decimal answers get a second strip after a pre-printed
 * separator (the dot is never handwritten — ML Kit cannot read it reliably).
 */
export function DirectAnswerRow({ shape, ink, onChange }: DirectAnswerRowProps) {
  const { t } = useTranslation();

  /** Render one wide strip bound to a box id. */
  const strip = (boxId: string, strokes: InkStroke[], label: string) => (
    <DirectInkBox
      key={boxId}
      accessibilityLabel={label}
      strokes={strokes}
      height={DIVISION_QUOTIENT_HEIGHT}
      onStrokesChange={(next) => onChange(setBoxStrokes(ink, boxId, next))}
    />
  );

  return (
    <View style={styles.row}>
      {ink.integer.map((boxStrokes, i) =>
        strip(
          `int-${i}`,
          boxStrokes,
          t('a11y.answerBox', { position: i + 1 }),
        ),
      )}

      {ink.decimal.length > 0 ? (
        <>
          <View style={styles.fixedLabel}>
            <Text style={styles.separatorText}>{DECIMAL_SEPARATOR}</Text>
          </View>
          {ink.decimal.map((boxStrokes, i) =>
            strip(
              `dec-${i}`,
              boxStrokes,
              t('a11y.decimalBox', { position: i + 1 }),
            ),
          )}
        </>
      ) : null}

      {ink.remainder.length > 0 ? (
        <>
          <View style={styles.fixedLabel}>
            <Text style={styles.remainderText}>
              {t('practice.remainderLabel')}
            </Text>
          </View>
          {ink.remainder.map((boxStrokes, i) =>
            strip(
              `rem-${i}`,
              boxStrokes,
              t('a11y.remainderBox', { position: i + 1 }),
            ),
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  fixedLabel: {
    height: DIVISION_QUOTIENT_HEIGHT + 22,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  separatorText: {
    fontSize: typography.size.heading,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  remainderText: {
    fontSize: typography.size.heading,
    fontWeight: typography.weight.regular,
    color: colors.textMuted,
  },
});
