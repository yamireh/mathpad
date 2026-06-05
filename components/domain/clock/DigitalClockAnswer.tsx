import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { IconButton } from '../../ui';
import { clockColors, spacing, typography } from '../../../constants/design';
import { type InkStroke } from '../ink';
import {
  HandwritingField,
  type HandwritingFieldHandle,
} from './HandwritingField';

export interface DigitalClockAnswerProps {
  onHourChange: (strokes: InkStroke[]) => void;
  onMinuteChange: (strokes: InkStroke[]) => void;
  /** Lock page scrolling while a field is being drawn in. */
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
}

/**
 * "Write the time" answer surface: an hour field and a minute field separated
 * by a colon, each a {@link HandwritingField}, plus Undo + Clear-all controls.
 * The consumer recognises each field's strokes (as a number) and checks the
 * time.
 */
export function DigitalClockAnswer({
  onHourChange,
  onMinuteChange,
  onDrawStart,
  onDrawEnd,
}: DigitalClockAnswerProps) {
  const { t } = useTranslation();
  // Wide, responsive write boxes — two fit a row with the colon, larger on iPad.
  const { width } = useWindowDimensions();
  const fieldW = Math.min(Math.round(width * 0.37), 200);
  const fieldH = Math.round(fieldW * 1.05);
  // Bumping this remounts both fields with empty ink.
  const [nonce, setNonce] = useState(0);
  const hourField = useRef<HandwritingFieldHandle>(null);
  const minuteField = useRef<HandwritingFieldHandle>(null);
  // Which field was written in last, so Undo targets the right one.
  const lastField = useRef<'hour' | 'minute' | null>(null);

  const clearAll = () => {
    setNonce((n) => n + 1);
    onHourChange([]);
    onMinuteChange([]);
    lastField.current = null;
  };

  const undo = () => {
    if (lastField.current === 'hour') hourField.current?.undo();
    else if (lastField.current === 'minute') minuteField.current?.undo();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <HandwritingField
          key={`hour-${nonce}`}
          ref={hourField}
          width={fieldW}
          height={fieldH}
          onStrokesChange={(s) => {
            onHourChange(s);
            if (s.length) lastField.current = 'hour';
          }}
          onDrawStart={onDrawStart}
          onDrawEnd={onDrawEnd}
          accessibilityLabel="Hour"
        />
        <Text style={styles.colon}>:</Text>
        <HandwritingField
          key={`minute-${nonce}`}
          ref={minuteField}
          width={fieldW}
          height={fieldH}
          onStrokesChange={(s) => {
            onMinuteChange(s);
            if (s.length) lastField.current = 'minute';
          }}
          onDrawStart={onDrawStart}
          onDrawEnd={onDrawEnd}
          accessibilityLabel="Minutes"
        />
      </View>

      <View style={styles.tools}>
        <IconButton
          name="trash-outline"
          accessibilityLabel={t('common.clearAll')}
          onPress={clearAll}
        />
        <IconButton
          name="arrow-undo-outline"
          accessibilityLabel={t('practice.undo')}
          onPress={undo}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  colon: {
    fontSize: typography.size.display,
    fontWeight: typography.weight.medium,
    color: clockColors.minuteHand,
    marginHorizontal: spacing.xs,
  },
  tools: { flexDirection: 'row', gap: spacing.lg },
});
