/**
 * PracticeTab — the parent dashboard's "Practice" tab. Lists the family's
 * authored practice sets (exams) with each assigned child's status/score, and
 * lets the parent create + assign a new one.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { formatAnswer, formatProblem } from '../../domain/format';
import { CreateExamDialog } from './CreateExamDialog';

/** One assigned child's status chip: pending, or their score. */
function ResultChip({
  name,
  result,
}: {
  name: string;
  result: ExamWithChildResults['results'][number]['result'];
}) {
  const { t } = useTranslation();
  const done = result !== null;
  return (
    <View style={[styles.resultChip, done && styles.resultChipDone]}>
      <Text style={styles.resultName}>{name}</Text>
      <Text style={[styles.resultValue, done && styles.resultValueDone]}>
        {done
          ? t('exams.submitted', {
              score: result.finalScore,
              total: result.totalQuestions,
            })
          : t('exams.pending')}
      </Text>
    </View>
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
  const { exams, create, remove } = useFamilyExams(familyId);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const nameOf = (childId: string) =>
    children.find((c) => c.childId === childId)?.name ?? childId;
  const toggle = (id: string) =>
    setExpanded((m) => ({ ...m, [id]: !m[id] }));

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {exams.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="create-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('exams.none')}</Text>
          </View>
        ) : (
          exams.map(({ exam, results }) => {
            const open = expanded[exam.id] ?? false;
            return (
              <View key={exam.id} style={styles.card}>
                <View style={styles.cardHead}>
                  {/* Tap the title area to expand the question list. */}
                  <Pressable
                    style={styles.cardHeadText}
                    onPress={() => toggle(exam.id)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                  >
                    <Text style={styles.cardTitle}>{exam.title}</Text>
                    <View style={styles.metaRow}>
                      <Ionicons
                        name={open ? 'chevron-down' : 'chevron-forward'}
                        size={14}
                        color={colors.textMuted}
                      />
                      <Text style={styles.cardMeta}>
                        {t(`operations.${exam.operation}`)} ·{' '}
                        {exam.questions.length} {t('exams.count').toLowerCase()}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => void remove(exam.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('exams.delete')}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.wrong} />
                  </Pressable>
                </View>

                {open ? (
                  <View style={styles.questions}>
                    {exam.questions.map((q, i) => (
                      <Text key={q.id} style={styles.question}>
                        {i + 1}. {formatProblem(q)} = {formatAnswer(q.answer)}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <View style={styles.results}>
                  {results.map(({ childId, result }) => (
                    <ResultChip key={childId} name={nameOf(childId)} result={result} />
                  ))}
                </View>
              </View>
            );
          })
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
  cardHeadText: { flex: 1, gap: 2 },
  cardTitle: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMeta: { fontSize: typography.size.caption, color: colors.textMuted },
  questions: {
    gap: 2,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  question: {
    fontSize: typography.size.body,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  results: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  resultChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
  },
  resultChipDone: { backgroundColor: operationColors.addition.tint },
  resultName: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  resultValue: { fontSize: typography.size.caption, color: colors.textMuted },
  resultValueDone: {
    color: operationColors.addition.accent,
    fontVariant: ['tabular-nums'],
  },
  footer: { paddingTop: spacing.md },
});
