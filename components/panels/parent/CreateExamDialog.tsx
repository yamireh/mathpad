/**
 * CreateExamDialog — a parent authors a practice set: name, topic, question
 * count, and which children get it. Questions are generated from the topic's
 * default settings via the shared `generateSession`.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip } from '../../ui';
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';
import { generateSession } from '../../../lib/questionGenerator';
import { defaultSettings } from '../../../lib/storage';
import type { Exam } from '../../../lib/exams';
import type { Operation, QuestionCount, Settings } from '../../../types';

const OPERATIONS: Operation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'mix',
];
const COUNTS: QuestionCount[] = [5, 10, 15, 20];

export interface CreateExamDialogProps {
  visible: boolean;
  createdBy: string;
  /** Assignable children (id + display name). */
  children: { childId: string; name: string }[];
  onCreate: (exam: Omit<Exam, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export function CreateExamDialog({
  visible,
  createdBy,
  children,
  onCreate,
  onCancel,
}: CreateExamDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [operation, setOperation] = useState<Operation>('addition');
  const [count, setCount] = useState<QuestionCount>(10);
  const [assignedTo, setAssignedTo] = useState<string[]>(
    children.length === 1 ? [children[0].childId] : [],
  );

  const toggleChild = (id: string) =>
    setAssignedTo((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );

  const canSave = assignedTo.length > 0;

  const create = () => {
    const settings = {
      ...defaultSettings(operation),
      questionCount: count,
    } as Settings;
    const questions = generateSession(settings);
    onCreate({
      title: title.trim() || t(`operations.${operation}`),
      createdBy,
      assignedTo,
      operation,
      settings,
      questions,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.title}>{t('exams.createTitle')}</Text>

          <Text style={styles.label}>{t('exams.name')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('exams.namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>{t('exams.topic')}</Text>
          <View style={styles.chipRow}>
            {OPERATIONS.map((op) => (
              <Chip
                key={op}
                label={t(`operations.${op}`)}
                selected={operation === op}
                onPress={() => setOperation(op)}
                tone={colors.answerInk}
              />
            ))}
          </View>

          <Text style={styles.label}>{t('exams.count')}</Text>
          <View style={styles.chipRow}>
            {COUNTS.map((c) => (
              <Chip
                key={c}
                label={String(c)}
                selected={count === c}
                onPress={() => setCount(c)}
                tone={colors.answerInk}
              />
            ))}
          </View>

          <Text style={styles.label}>{t('exams.assignTo')}</Text>
          {children.length === 0 ? (
            <Text style={styles.hint}>{t('exams.noChildren')}</Text>
          ) : (
            <View style={styles.chipRow}>
              {children.map((c) => (
                <Chip
                  key={c.childId}
                  label={c.name}
                  selected={assignedTo.includes(c.childId)}
                  onPress={() => toggleChild(c.childId)}
                  tone={colors.correct}
                />
              ))}
            </View>
          )}
          {!canSave && children.length > 0 ? (
            <Text style={styles.hint}>{t('exams.pickChild')}</Text>
          ) : null}

          <View style={styles.actions}>
            <Button
              label={t('exams.save')}
              variant="primary"
              disabled={!canSave}
              onPress={create}
            />
            <Button label={t('exams.cancel')} variant="secondary" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 40, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xs,
    ...shadows.lg,
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.body,
    color: colors.text,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { fontSize: typography.size.caption, color: colors.textMuted },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
