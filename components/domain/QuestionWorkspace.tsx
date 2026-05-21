import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Chip, IconButton } from '../ui';
import { colors, spacing, typography } from '../../constants/design';
import type { ProblemLayout, Question } from '../../types';
import { AnswerArea } from './AnswerArea';
import { AnswerPad } from './AnswerPad';
import { DirectAnswerRow } from './DirectAnswerRow';
import { ProblemDisplay } from './ProblemDisplay';
import {
  ScratchCanvas,
  type ScratchCanvasHandle,
  type ScratchTool,
} from './ScratchCanvas';
import {
  type AnswerInk,
  emptyAnswerInk,
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
  /** Tapped borrow-lender columns for subtraction. */
  borrowMarks?: number[];
  /** Toggle a borrow on a top-operand digit (subtraction only). */
  onToggleBorrow?: (column: number) => void;
  tone: string;
}

/**
 * The shared "solve a question" surface used by Practice and Review.
 *
 * Standard layouts (+/−/×, horizontal & decimal division) use small,
 * column-aligned answer boxes plus a pop-up writing pad. Long division uses
 * its own layout: large write-directly quotient boxes on top and the whole
 * area below the bracket as the working space.
 */
export function QuestionWorkspace({
  question,
  layout,
  onLayoutChange,
  answerInk,
  onAnswerInkChange,
  scratchInk,
  onScratchInkChange,
  borrowMarks,
  onToggleBorrow,
  tone,
}: QuestionWorkspaceProps) {
  const { t } = useTranslation();
  const shape = answerShape(question);
  const [activeBox, setActiveBox] = useState<string | null>(() =>
    frontierBox(answerInk, shape, layout),
  );
  const [tool, setTool] = useState<ScratchTool>('pen');
  const [padNonce, setPadNonce] = useState(0);
  const scratchRef = useRef<ScratchCanvasHandle>(null);

  const isLongDivision = layout === 'divisionLong';
  const isDivision = question.operation === 'division';
  const inlineLayout: ProblemLayout =
    question.answer.kind === 'decimal'
      ? 'divisionDecimal'
      : 'divisionHorizontal';

  // Sequential fill: tapping a still-locked box snaps to the next box to fill.
  const selectBox = (boxId: string) => {
    setActiveBox(
      isBoxWritable(answerInk, shape, layout, boxId)
        ? boxId
        : frontierBox(answerInk, shape, layout),
    );
  };

  // Clear every answer box and return focus to the first box.
  const clearAllAnswers = () => {
    const empty = emptyAnswerInk(shape);
    onAnswerInkChange(empty);
    setActiveBox(frontierBox(empty, shape, layout));
    setPadNonce((n) => n + 1);
  };

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

  const toolbar = (
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
  );

  const layoutToggle =
    isDivision && onLayoutChange ? (
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
    ) : null;

  // Long division: write-directly quotient boxes; the whole area below the
  // bracket is the working space; no pop-up answer pad.
  if (isLongDivision) {
    return (
      <View style={styles.container}>
        {layoutToggle}
        <View style={styles.longBody}>
          <ProblemDisplay
            question={question}
            layout={layout}
            answerSlot={
              <DirectAnswerRow
                shape={shape}
                ink={answerInk}
                onChange={onAnswerInkChange}
              />
            }
            workSlot={scratch}
          />
        </View>
        {toolbar}
      </View>
    );
  }

  // Standard layout: small answer boxes + pop-up writing pad.
  const answer = (
    <AnswerArea
      question={question}
      ink={answerInk}
      onChange={onAnswerInkChange}
      selectedBox={activeBox}
      onSelectBox={selectBox}
      tone={tone}
      isBoxWritable={(boxId) =>
        isBoxWritable(answerInk, shape, layout, boxId)
      }
    />
  );

  return (
    <View style={styles.container}>
      {layoutToggle}

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
            borrowMarks={borrowMarks}
            onToggleBorrow={
              question.operation === 'subtraction'
                ? onToggleBorrow
                : undefined
            }
            tone={tone}
          />
        </ScrollView>
      </View>

      {activeBox ? (
        <View style={styles.bottomRegion}>
          <AnswerPad
            key={`${activeBox}:${padNonce}`}
            strokes={getBoxStrokes(answerInk, activeBox)}
            onStrokesChange={(strokes) =>
              onAnswerInkChange(setBoxStrokes(answerInk, activeBox, strokes))
            }
            onClearAll={clearAllAnswers}
            onDone={() => setActiveBox(null)}
            tone={tone}
          />
        </View>
      ) : (
        <View style={styles.bottomRegion}>{scratch}</View>
      )}

      {activeBox ? null : toolbar}
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
