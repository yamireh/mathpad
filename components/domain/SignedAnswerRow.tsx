import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../constants/design';
import { AnswerBox } from './AnswerBox';
import { type AnswerInk } from './ink';
import type { AnswerShape } from './layout';

export interface SignedAnswerRowProps {
  shape: AnswerShape;
  ink: AnswerInk;
  onChange: (ink: AnswerInk) => void;
  selectedBox: string | null;
  onSelectBox: (boxId: string) => void;
  tone?: string;
}

/**
 * The answer area for an integer answer: an optional leading minus-sign box
 * (negative-answer mode) followed by one box per digit column.
 */
export function SignedAnswerRow({
  shape,
  ink,
  onChange,
  selectedBox,
  onSelectBox,
  tone = colors.text,
}: SignedAnswerRowProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      {shape.hasSign ? (
        <AnswerBox
          key="sign"
          accessibilityLabel={t('a11y.signBox')}
          tone={tone}
          selected={selectedBox === 'sign'}
          onSelect={() => onSelectBox('sign')}
          initialStrokes={ink.sign}
          onStrokesChange={(strokes) => onChange({ ...ink, sign: strokes })}
        />
      ) : null}

      {ink.integer.map((boxStrokes, i) => (
        <AnswerBox
          key={`int-${i}`}
          accessibilityLabel={t('a11y.answerBox', { position: i + 1 })}
          tone={tone}
          selected={selectedBox === `int-${i}`}
          onSelect={() => onSelectBox(`int-${i}`)}
          initialStrokes={boxStrokes}
          onStrokesChange={(strokes) =>
            onChange({
              ...ink,
              integer: ink.integer.map((s, idx) => (idx === i ? strokes : s)),
            })
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
});
