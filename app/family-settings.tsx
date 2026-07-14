import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FamilyCode } from '../components/panels/parent/FamilyCode';
import { Button, Header, IconButton, ScreenContainer } from '../components/ui';
import {
  colors,
  operationColors,
  radius,
  spacing,
  typography,
} from '../constants/design';
import { useAuthUser, useDeviceRole, useFamily } from '../hooks';
import {
  authErrorKey,
  deleteAccount,
  signOut,
  updateDisplayName,
} from '../lib/firebase/auth';

/** Account block: the signed-in email + an inline display-name editor. */
function AccountSection({ email, name }: { email: string; name: string }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(name);
    setEditing(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      await updateDisplayName(draft);
      setEditing(false);
    } catch {
      // best-effort — leave the editor open so they can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('familySettings.account')}</Text>
      <Text style={styles.email}>
        {t('parentAuth.signedInAs', { email })}
      </Text>
      {editing ? (
        <View style={styles.nameEdit}>
          <TextInput
            style={styles.nameInput}
            placeholder={t('parentAuth.name')}
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            editable={!saving}
            autoFocus
          />
          <View style={styles.nameEditActions}>
            <Button
              label={t('common.cancel')}
              variant="ghost"
              onPress={() => setEditing(false)}
            />
            <Button
              label={t('common.save')}
              onPress={save}
              loading={saving}
              disabled={!draft.trim()}
            />
          </View>
        </View>
      ) : (
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name || t('familySettings.noName')}</Text>
          <Pressable onPress={startEdit} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.editNameLink}>
              {t(name ? 'parent.editName' : 'parent.addName')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/**
 * Account footer: Sign out and Delete account on one line (Delete in red), with
 * the delete confirm (password) expanding beneath it. Apple 5.1.1(v).
 */
function AccountFooter({
  onSignOut,
  onDeleted,
}: {
  onSignOut: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      onDeleted();
    } catch (e) {
      setError(t(authErrorKey(e)));
      setBusy(false);
    }
  };

  return (
    <View style={styles.footer}>
      <View style={styles.footerRow}>
        <Pressable
          onPress={onSignOut}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.footerAction}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.textMuted} />
          <Text style={styles.footerLink}>{t('parentAuth.signOut')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          hitSlop={8}
          style={styles.footerAction}
        >
          <Ionicons name="trash-outline" size={16} color={colors.wrong} />
          <Text style={[styles.footerLink, styles.footerDanger]}>
            {t('deleteAccount.button')}
          </Text>
        </Pressable>
      </View>

      {open ? (
        <View style={styles.deleteBox}>
          <Text style={styles.deleteWarning}>{t('deleteAccount.warning')}</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder={t('deleteAccount.passwordPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType="password"
              editable={!busy}
            />
            <Pressable
              onPress={() => setShowPassword((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={t(
                showPassword ? 'parentAuth.hidePassword' : 'parentAuth.showPassword',
              )}
              hitSlop={8}
              style={styles.eye}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
          {error ? <Text style={styles.deleteError}>{error}</Text> : null}
          <Button
            label={busy ? t('deleteAccount.deleting') : t('deleteAccount.confirm')}
            tone={colors.wrong}
            onPress={submit}
            loading={busy}
            disabled={!password}
            fullWidth
          />
        </View>
      ) : null}
    </View>
  );
}

/** A tappable, expandable settings section (chevron shows open/closed). */
function CollapsibleSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.collapsible}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.collapsibleHead}
      >
        <Ionicons name={icon} size={18} color={operationColors.addition.accent} />
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>
      {open ? <View style={styles.collapsibleBody}>{children}</View> : null}
    </View>
  );
}

/** A numbered how-to list. */
function Steps({ steps }: { steps: string[] }) {
  return (
    <View style={styles.steps}>
      {steps.map((s, i) => (
        <View key={i} style={styles.step}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>{i + 1}</Text>
          </View>
          <Text style={styles.stepText}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Parent settings — reached from the gear on the parent home. Holds the account
 * (name/email), the family share codes, and the mode/account actions, so the
 * dashboard itself stays a clean, glanceable view.
 */
export default function FamilySettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setRole } = useDeviceRole();
  const { user } = useAuthUser();
  const { family, loading } = useFamily(user?.uid ?? null);

  const back = (
    <IconButton
      name="arrow-back"
      accessibilityLabel={t('common.back')}
      onPress={() => router.back()}
    />
  );

  const openPractice = () => {
    setRole('child');
    router.dismissAll();
  };
  const doSignOut = () => {
    void signOut();
    router.back();
  };

  return (
    <ScreenContainer
      scroll
      header={<Header title={t('familySettings.title')} left={back} />}
    >
      <View style={styles.body}>
        {user ? (
          <AccountSection
            email={user.email ?? ''}
            name={user.displayName?.trim() ?? ''}
          />
        ) : null}

        {loading && !family ? (
          <ActivityIndicator color={operationColors.addition.accent} />
        ) : family ? (
          <>
            <CollapsibleSection
              title={t('coParent.addChildDevice')}
              icon="phone-portrait-outline"
            >
              <Steps
                steps={[
                  t('coParent.child1'),
                  t('coParent.child2'),
                  t('coParent.child3'),
                  t('coParent.child4'),
                ]}
              />
              <FamilyCode code={family.pairingCode} hint="" />
            </CollapsibleSection>

            <CollapsibleSection
              title={t('coParent.invite')}
              icon="people-outline"
            >
              <Steps
                steps={[
                  t('coParent.parent1'),
                  t('coParent.parent2'),
                  t('coParent.parent3'),
                  t('coParent.parent4'),
                ]}
              />
              <FamilyCode
                code={family.parentCode}
                label={t('coParent.codeLabel')}
                hint=""
              />
            </CollapsibleSection>
          </>
        ) : null}

        <View style={styles.actions}>
          {/* Peek at practice mode — stays signed in; grown-ups → "I'm a parent"
              returns here. */}
          <Button
            label={t('parentAuth.viewPractice')}
            icon="happy-outline"
            variant="secondary"
            onPress={openPractice}
            fullWidth
          />
        </View>

        <AccountFooter
          onSignOut={doSignOut}
          onDeleted={() => router.dismissAll()}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md },
  collapsible: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  collapsibleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  collapsibleTitle: {
    flex: 1,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  collapsibleBody: {
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.md,
  },
  steps: { gap: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: operationColors.addition.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: { color: '#FFFFFF', fontSize: typography.size.caption, fontWeight: '700' },
  stepText: { flex: 1, fontSize: typography.size.body, color: colors.text },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  email: { fontSize: typography.size.body, color: colors.textMuted },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  editNameLink: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: operationColors.addition.accent,
  },
  nameEdit: { gap: spacing.sm },
  nameInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.body,
    color: colors.text,
  },
  nameEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  footer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  footerLink: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  footerDanger: { color: colors.wrong },
  deleteBox: {
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.wrong,
  },
  deleteWarning: {
    fontSize: typography.size.caption,
    color: colors.textMuted,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.body,
    color: colors.text,
  },
  eye: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  deleteError: {
    fontSize: typography.size.caption,
    color: colors.wrong,
    textAlign: 'center',
  },
});
