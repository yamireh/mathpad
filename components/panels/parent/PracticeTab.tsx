/**
 * PracticeTab — the parent dashboard's "Practice" tab. Lists the family's
 * authored practice sets (exams) with each assigned child's status/score, and
 * lets the parent create + assign a new one.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '../../ui';
import {
  colors,
  operationColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';
import { useFamilyExams, type ExamWithChildResults } from '../../../hooks';
import { CreateExamDialog } from './CreateExamDialog';
import { ExamPreview } from './ExamPreview';
import { ExamResultView } from './ExamResultView';
import { Avatar, InfoRow, TopicPill } from './kit';

/** One assigned child's result row (shared InfoRow): avatar + name, then a big
 *  color-coded score when submitted, or a muted "pending" badge. Tappable either
 *  way — a score opens the breakdown, a pending row previews the questions. */
function ResultRow({
  name,
  index,
  result,
  onPress,
}: {
  name: string;
  index: number;
  result: ExamWithChildResults['results'][number]['result'];
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const done = result !== null;
  const pct = done
    ? Math.round((result.finalScore / Math.max(1, result.totalQuestions)) * 100)
    : 0;
  const scoreColor = pct >= 70 ? colors.correct : pct >= 40 ? colors.amber : colors.wrong;
  return (
    <InfoRow
      onPress={onPress}
      accessibilityLabel={
        done
          ? t('exams.viewResult', { name })
          : t('exams.previewQuestions', { name })
      }
      valueColor={scoreColor}
      value={
        done ? (
          `${result.finalScore}/${result.totalQuestions}`
        ) : (
          <View style={styles.pendingBadge}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.pendingText}>{t('exams.pending')}</Text>
          </View>
        )
      }
    >
      <Avatar name={name} index={index} size={30} />
      <Text style={styles.resultName}>{name}</Text>
    </InfoRow>
  );
}

export interface PracticeTabProps {
  familyId: string;
  createdBy: string;
  /** Assignable children (id + display name), for the create dialog + result labels. */
  children: { childId: string; name: string }[];
}

export function PracticeTab({ familyId, createdBy, children }: PracticeTabProps) {
  const { t } = useTranslation();
  const { exams, loading, create, remove } = useFamilyExams(familyId);
  const [creating, setCreating] = useState(false);
  // The submitted result the parent is viewing (read-only), if any.
  const [viewing, setViewing] = useState<{
    childName: string;
    result: NonNullable<ExamWithChildResults['results'][number]['result']>;
  } | null>(null);
  // A not-yet-submitted exam whose questions the parent is previewing, if any.
  const [previewing, setPreviewing] = useState<{
    childName: string;
    exam: ExamWithChildResults['exam'];
  } | null>(null);

  const nameOf = (childId: string) =>
    children.find((c) => c.childId === childId)?.name ?? childId;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.answerInk} />
          </View>
        ) : exams.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="create-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('exams.none')}</Text>
          </View>
        ) : (
          exams.map(({ exam, results }) => (
            <View key={exam.id} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.cardHeadText}>
                  <Text style={styles.cardTitle}>{exam.title}</Text>
                  <View style={styles.metaRow}>
                    <TopicPill
                      label={t(`operations.${exam.operation}`)}
                      tint={operationColors[exam.operation].tint}
                      color={operationColors[exam.operation].accent}
                    />
                    <Text style={styles.cardMeta}>
                      {exam.questions.length} {t('exams.count').toLowerCase()}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => void remove(exam.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('exams.delete')}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.wrong} />
                </Pressable>
              </View>

              {/* Tap a submitted result to open the full per-question breakdown. */}
              <View style={styles.results}>
                {results.map(({ childId, result }, i) => (
                  <View key={childId}>
                    {i > 0 ? <View style={styles.resultDivider} /> : null}
                    <ResultRow
                      name={nameOf(childId)}
                      index={children.findIndex((c) => c.childId === childId)}
                      result={result}
                      onPress={
                        result
                          ? () => setViewing({ childName: nameOf(childId), result })
                          : () =>
                              setPreviewing({ childName: nameOf(childId), exam })
                      }
                    />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('exams.create')}
          icon="add"
          onPress={() => setCreating(true)}
        />
      </View>

      {/* Mount only while open so each session starts fresh (no cached input). */}
      {creating ? (
        <CreateExamDialog
          visible
          createdBy={createdBy}
          children={children}
          existingTitles={exams.map((e) => e.exam.title)}
          onCancel={() => setCreating(false)}
          onCreate={async (exam) => {
            await create(exam);
            setCreating(false);
          }}
        />
      ) : null}

      {viewing ? (
        <ExamResultView
          visible
          childName={viewing.childName}
          result={viewing.result}
          onClose={() => setViewing(null)}
        />
      ) : null}

      {previewing ? (
        <ExamPreview
          visible
          childName={previewing.childName}
          exam={previewing.exam}
          onClose={() => setPreviewing(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: spacing.lg, gap: spacing.md },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardHeadText: { flex: 1, gap: spacing.xs },
  cardTitle: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardMeta: { fontSize: typography.size.caption, color: colors.textMuted },
  results: {
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  resultDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.sm,
  },
  resultName: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  pendingText: { fontSize: typography.size.caption, color: colors.textMuted },
  footer: { paddingTop: spacing.md },
});
