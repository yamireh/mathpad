/**
 * CreateExamDialog — a parent authors a practice set: name, topic, question
 * count, and which children get it. Questions are generated from the topic's
 * default settings via the shared `generateSession`.
 */
import { useMemo, useState } from 'react';
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
import { nextExamTitle, parseCustomProblems, type Exam } from '../../../lib/exams';
import type { Operation, QuestionCount, Settings } from '../../../types';

type Mode = 'random' | 'custom';

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
  /** Existing set names — used to auto-number today's new name. */
  existingTitles: string[];
  /** Resolves once the set is created; the dialog shows a spinner until then. */
  onCreate: (exam: Omit<Exam, 'id' | 'createdAt'>) => void | Promise<void>;
  onCancel: () => void;
}

export function CreateExamDialog({
  visible,
  createdBy,
  children,
  existingTitles,
  onCreate,
  onCancel,
}: CreateExamDialogProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('random');
  const [operation, setOperation] = useState<Operation>('addition');
  const [count, setCount] = useState<QuestionCount>(10);
  const [customText, setCustomText] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>(
    children.length === 1 ? [children[0].childId] : [],
  );
  const [saving, setSaving] = useState(false);

  // Custom problems parsed live so the parent sees the count + any bad lines.
  const custom = useMemo(() => parseCustomProblems(customText), [customText]);

  // Auto-generated name — computed when the dialog opens. No text entry needed.
  const title = useMemo(
    () => (visible ? nextExamTitle(existingTitles, new Date()) : ''),
    [visible, existingTitles],
  );

  const toggleChild = (id: string) =>
    setAssignedTo((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );

  const customReady = custom.questions.length > 0 && custom.errors.length === 0;
  const canSave =
    assignedTo.length > 0 &&
    !saving &&
    (mode === 'random' || customReady);

  const create = async () => {
    // Random → generate from the topic's default settings. Custom → the parent's
    // parsed problems (operation is `mix` since they can span topics).
    const random = mode === 'random';
    const op: Operation = random ? operation : 'mix';
    const settings = random
      ? ({ ...defaultSettings(operation), questionCount: count } as Settings)
      : (defaultSettings('mix') as Settings);
    const questions = random ? generateSession(settings) : custom.questions;
    setSaving(true);
    try {
      await onCreate({ title, createdBy, assignedTo, operation: op, settings, questions });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.title}>{t('exams.createTitle')}</Text>

          <Text style={styles.label}>{t('exams.name')}</Text>
          <Text style={styles.autoName}>{title}</Text>

          {/* Random (generate from a topic) vs Custom (parent types problems). */}
          <View style={styles.modeRow}>
            <Chip
              label={t('exams.modeRandom')}
              selected={mode === 'random'}
              onPress={() => setMode('random')}
              tone={colors.answerInk}
            />
            <Chip
              label={t('exams.modeCustom')}
              selected={mode === 'custom'}
              onPress={() => setMode('custom')}
              tone={colors.answerInk}
            />
          </View>

          {mode === 'random' ? (
            <>
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
            </>
          ) : (
            <>
              <Text style={styles.label}>{t('exams.customLabel')}</Text>
              <TextInput
                style={styles.customInput}
                placeholder={t('exams.customPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={customText}
                onChangeText={setCustomText}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
              {custom.errors.length > 0 ? (
                <Text style={styles.errorHint}>
                  {t('exams.customErrors', { lines: custom.errors.join(', ') })}
                </Text>
              ) : (
                <Text style={styles.hint}>
                  {t('exams.customHint', { count: custom.questions.length })}
                </Text>
              )}
            </>
          )}

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
              loading={saving}
              onPress={() => void create()}
            />
            <Button
              label={t('exams.cancel')}
              variant="secondary"
              disabled={saving}
              onPress={onCancel}
            />
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
  autoName: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  customInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: typography.size.bodyLarge,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  hint: { fontSize: typography.size.caption, color: colors.textMuted },
  errorHint: { fontSize: typography.size.caption, color: colors.wrong },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
