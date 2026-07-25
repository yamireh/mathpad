/**
 * WelcomeTips — a one-time first-run tips card for kids. Points out the how-to
 * lightbulb (kids often don't notice it), suggests a stylus, and reminds them to
 * write one digit per box. Dismissed permanently with "Got it!" via the shared
 * `useTip` store, so it never nags again.
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  operationColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../constants/design';
import { Button } from '../ui';

/**
 * Tip id for the shared tips store — bump the suffix to re-show after edits.
 * v2: the card now shows every launch until an explicit "Don't show again"
 * (v1's "Got it!" persisted a dismissal), so v1 opt-outs must not carry over.
 */
export const WELCOME_TIP_ID = 'welcome-tips:v2';

interface TipRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  body: string;
}

function TipRow({ icon, iconColor, title, body }: TipRowProps) {
  return (
    <View style={styles.tipRow}>
      <View style={[styles.tipIcon, { backgroundColor: `${iconColor}22` }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.tipText}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipBody}>{body}</Text>
      </View>
    </View>
  );
}

export interface WelcomeTipsProps {
  visible: boolean;
  /** Close for now — it shows again next launch. (Back button / "Got it!") */
  onClose: () => void;
  /** Stop showing it on launch permanently (persists via the tips store). */
  onDontShowAgain: () => void;
}

export function WelcomeTips({
  visible,
  onClose,
  onDontShowAgain,
}: WelcomeTipsProps) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={styles.card}
          accessibilityViewIsModal
          accessibilityLabel={t('welcome.title')}
        >
          <Text style={styles.title}>{t('welcome.title')}</Text>
          <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>

          <View style={styles.tips}>
            <TipRow
              icon="bulb"
              iconColor={colors.amber}
              title={t('welcome.howToTitle')}
              body={t('welcome.howToBody')}
            />
            <TipRow
              icon="pencil"
              iconColor={operationColors.multiplication.accent}
              title={t('welcome.penTitle')}
              body={t('welcome.penBody')}
            />
            <TipRow
              icon="grid"
              iconColor={operationColors.addition.accent}
              title={t('welcome.boxesTitle')}
              body={t('welcome.boxesBody')}
            />
          </View>

          <View style={styles.actions}>
            <Button
              label={t('welcome.cta')}
              variant="primary"
              onPress={onClose}
            />
            <Button
              label={t('welcome.dontShowAgain')}
              variant="secondary"
              onPress={onDontShowAgain}
            />
          </View>
          <Text style={styles.footnote}>{t('welcome.footnote')}</Text>
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
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.lg,
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -spacing.xs,
  },
  tips: { gap: spacing.md, marginVertical: spacing.sm },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: { flex: 1, gap: 2 },
  tipTitle: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  tipBody: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    lineHeight: typography.lineHeight.body,
  },
  actions: { gap: spacing.sm },
  footnote: {
    fontSize: typography.size.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
