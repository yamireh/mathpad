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
  isBoxWritable?: (boxId: string) => boolean;
}

/**
 * Answer area for an integer answer: an optional leading minus-sign box
 * (negative-answer mode) followed by one box per digit column.
 */
export function SignedAnswerRow({
  shape,
  ink,
  onChange,
  selectedBox,
  onSelectBox,
  tone = colors.text,
  isBoxWritable,
}: SignedAnswerRowProps) {
  const { t } = useTranslation();
  const writable = isBoxWritable ?? (() => true);

  return (
    <View style={styles.row}>
      {shape.hasSign ? (
        <AnswerBox
          key="sign"
          accessibilityLabel={t('a11y.signBox')}
          tone={tone}
          selected={selectedBox === 'sign'}
          locked={!writable('sign')}
          onSelect={() => onSelectBox('sign')}
          strokes={ink.sign}
          onClear={() => onChange({ ...ink, sign: [] })}
        />
      ) : null}

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
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
});
