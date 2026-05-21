import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Chip, IconButton } from '../ui';
import { colors, spacing, typography } from '../../constants/design';
import type { ProblemLayout, Question } from '../../types';
import { AnswerArea } from './AnswerArea';
import { AnswerPad } from './AnswerPad';
import { ProblemDisplay } from './ProblemDisplay';
import {
  ScratchCanvas,
  type ScratchCanvasHandle,
  type ScratchTool,
} from './ScratchCanvas';
import {
  type AnswerInk,
  frontierBox,
  getBoxStrokes,
  type InkStroke,
  isBoxWritable,
  setBoxStrokes,
} from './ink';
import { answerShape } from './layout';

export interface QuestionWorkspaceProps {
  question: Question;
  /** Effective problem layout (after any user override). */
  layout: ProblemLayout;
  /** When set, division questions show a long ⇄ in-a-row layout toggle. */
  onLayoutChange?: (layout: ProblemLayout) => void;
  answerInk: AnswerInk;
  onAnswerInkChange: (ink: AnswerInk) => void;
  scratchInk?: InkStroke[];
  onScratchInkChange: (strokes: InkStroke[]) => void;
  tone: string;
}

/**
 * The shared "solve a question" surface used by Practice and Review.
 *
 * The answer boxes are small and column-aligned; tapping one focuses the large
 * writing pad below on it (the pad replaces the scratch area until "Done").
 * Strokes drawn in the pad mirror — scaled — into the box.
 */
export function QuestionWorkspace({
  question,
  layout,
  onLayoutChange,
  answerInk,
  onAnswerInkChange,
  scratchInk,
  onScratchInkChange,
  tone,
}: QuestionWorkspaceProps) {
  const { t } = useTranslation();
  const shape = answerShape(question);
  // The answer box bound to the writing pad; null = scratch mode. Focus
  // defaults to the first box to fill (rightmost digit — units first).
  const [activeBox, setActiveBox] = useState<string | null>(() =>
    frontierBox(answerInk, shape),
  );
  const [tool, setTool] = useState<ScratchTool>('pen');
  const scratchRef = useRef<ScratchCanvasHandle>(null);

  // Sequential fill: tapping a still-locked box snaps to the next box to fill.
  const selectBox = (boxId: string) => {
    setActiveBox(
      isBoxWritable(answerInk, shape, boxId)
        ? boxId
        : frontierBox(answerInk, shape),
    );
  };

  const isLongDivision = layout === 'divisionLong';
  const isDivision = question.operation === 'division';
  const inlineLayout: ProblemLayout =
    question.answer.kind === 'decimal'
      ? 'divisionDecimal'
      : 'divisionHorizontal';

  const answer = (
    <AnswerArea
      question={question}
      ink={answerInk}
      onChange={onAnswerInkChange}
      selectedBox={activeBox}
      onSelectBox={selectBox}
      tone={tone}
      isBoxWritable={(boxId) => isBoxWritable(answerInk, shape, boxId)}
    />
  );

  const scratch = (
    <ScratchCanvas
      ref={scratchRef}
      tool={tool}
      bordered={!isLongDivision}
      initialStrokes={scratchInk}
      onStrokesChange={onScratchInkChange}
      accessibilityLabel={t('a11y.scratchCanvas')}
    />
  );

  return (
    <View style={styles.container}>
      {isDivision && onLayoutChange ? (
        <View style={styles.layoutToggle}>
          <Chip
            label={t('practice.layoutLong')}
            selected={isLongDivision}
            tone={tone}
            onPress={() => onLayoutChange('divisionLong')}
          />
          <Chip
            label={t('practice.layoutInline')}
            selected={!isLongDivision}
            tone={tone}
            onPress={() => onLayoutChange(inlineLayout)}
          />
        </View>
      ) : null}

      {isLongDivision ? (
        <View style={styles.longBody}>
          <ProblemDisplay
            question={question}
            layout={layout}
            answerSlot={answer}
            workSlot={scratch}
          />
        </View>
      ) : (
        <View style={styles.problemArea}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.problemScroll}
          >
            <ProblemDisplay
              question={question}
              layout={layout}
              answerSlot={answer}
            />
          </ScrollView>
        </View>
      )}

      {activeBox ? (
        <View style={styles.bottomRegion}>
          <AnswerPad
            key={activeBox}
            strokes={getBoxStrokes(answerInk, activeBox)}
            onStrokesChange={(strokes) =>
              onAnswerInkChange(setBoxStrokes(answerInk, activeBox, strokes))
            }
            onDone={() => setActiveBox(null)}
            tone={tone}
          />
        </View>
      ) : isLongDivision ? null : (
        <View style={styles.bottomRegion}>{scratch}</View>
      )}

      {activeBox ? null : (
        <View style={styles.toolbar}>
          <Text style={styles.scratchLabel}>{t('practice.scratchHint')}</Text>
          <View style={styles.tools}>
            <Button
              label={t('practice.eraser')}
              variant={tool === 'eraser' ? 'primary' : 'secondary'}
              tone={tone}
              fullWidth={false}
              onPress={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
            />
            <IconButton
              name="arrow-undo-outline"
              accessibilityLabel={t('practice.undo')}
              onPress={() => scratchRef.current?.undo()}
            />
            <IconButton
              name="trash-outline"
              accessibilityLabel={t('practice.clearScratch')}
              onPress={() => scratchRef.current?.clear()}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  layoutToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  problemArea: { paddingVertical: spacing.lg },
  problemScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  longBody: { flex: 1, padding: spacing.lg },
  bottomRegion: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scratchLabel: {
    flex: 1,
    fontSize: typography.size.caption,
    color: colors.textMuted,
  },
  tools: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
