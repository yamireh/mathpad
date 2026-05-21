import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../constants/design';
import { DirectInkBox } from './DirectInkBox';
import { type AnswerInk } from './ink';
import { ANSWER_BOX_HEIGHT, type AnswerShape } from './layout';

export interface DirectAnswerRowProps {
  shape: AnswerShape;
  ink: AnswerInk;
  onChange: (ink: AnswerInk) => void;
}

/** Generous box size — the long-division quotient has few digits and room. */
const QUOTIENT_BOX = { width: 92, height: ANSWER_BOX_HEIGHT };

/**
 * The long-division answer area: large, write-directly quotient boxes (and a
 * remainder, if any). No pop-up pad — the boxes are big enough on their own.
 */
export function DirectAnswerRow({ shape, ink, onChange }: DirectAnswerRowProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      {ink.integer.map((boxStrokes, i) => (
        <DirectInkBox
          key={`int-${i}`}
          accessibilityLabel={t('a11y.answerBox', { position: i + 1 })}
          strokes={boxStrokes}
          width={QUOTIENT_BOX.width}
          height={QUOTIENT_BOX.height}
          onStrokesChange={(next) =>
            onChange({
              ...ink,
              integer: ink.integer.map((s, idx) => (idx === i ? next : s)),
            })
          }
        />
      ))}

      {shape.remainderBoxes > 0 ? (
        <>
          <View style={styles.remainderLabel}>
            <Text style={styles.remainderText}>
              {t('practice.remainderLabel')}
            </Text>
          </View>
          {ink.remainder.map((boxStrokes, i) => (
            <DirectInkBox
              key={`rem-${i}`}
              accessibilityLabel={t('a11y.remainderBox', { position: i + 1 })}
              strokes={boxStrokes}
              width={QUOTIENT_BOX.width}
              height={QUOTIENT_BOX.height}
              onStrokesChange={(next) =>
                onChange({
                  ...ink,
                  remainder: ink.remainder.map((s, idx) =>
                    idx === i ? next : s,
                  ),
                })
              }
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  remainderLabel: {
    height: ANSWER_BOX_HEIGHT + 22,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  remainderText: {
    fontSize: typography.size.heading,
    fontWeight: typography.weight.regular,
    color: colors.textMuted,
  },
});
