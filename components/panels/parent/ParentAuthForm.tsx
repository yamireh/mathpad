import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../../ui';
import {
  colors,
  operationColors,
  radius,
  spacing,
  typography,
} from '../../../constants/design';
import {
  authErrorKey,
  resetPassword,
  signIn,
  signUp,
} from '../../../lib/firebase/auth';

/** A small tappable text link (toggle / forgot / continue-as-child). */
function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

/**
 * Parent email/password sign-in + create-account, with a password reset and a
 * "continue as child" escape. On sign-in/up success the app's auth-state
 * listener swaps ParentPanel to the dashboard, so this form just fires the call
 * and surfaces errors/notices.
 */
export function ParentAuthForm({
  onContinueAsChild,
}: {
  onContinueAsChild?: () => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isSignup = mode === 'signup';

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (isSignup) await signUp(email.trim(), password);
      else await signIn(email.trim(), password);
      // Success unmounts this form (auth state flips) — no need to reset busy.
    } catch (e) {
      setError(t(authErrorKey(e)));
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      setNotice(null);
      setError(t('parentAuth.enterEmailFirst'));
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await resetPassword(email.trim());
      setNotice(t('parentAuth.resetSent'));
    } catch (e) {
      setError(t(authErrorKey(e)));
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.heading}>
        {t(isSignup ? 'parentAuth.signUpHeading' : 'parentAuth.signInHeading')}
      </Text>
      <Text style={styles.intro}>{t('parentAuth.intro')}</Text>

      <TextInput
        style={styles.input}
        placeholder={t('parentAuth.email')}
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        editable={!busy}
      />
      <View style={styles.passwordWrap}>
        <TextInput
          style={styles.passwordInput}
          placeholder={t('parentAuth.password')}
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          textContentType={isSignup ? 'newPassword' : 'password'}
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

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Button
        label={t(isSignup ? 'parentAuth.signUp' : 'parentAuth.signIn')}
        onPress={submit}
        loading={busy}
        fullWidth
      />

      <View style={styles.links}>
        {!isSignup ? <TextLink label={t('parentAuth.forgot')} onPress={forgot} /> : null}
        <TextLink
          label={t(isSignup ? 'parentAuth.toSignIn' : 'parentAuth.toSignUp')}
          onPress={() => {
            setMode(isSignup ? 'signin' : 'signup');
            setError(null);
            setNotice(null);
          }}
        />
      </View>

      {onContinueAsChild ? (
        <View style={styles.childBlock}>
          <Button
            label={t('parentAuth.continueAsChild')}
            icon="happy-outline"
            variant="secondary"
            onPress={onContinueAsChild}
            fullWidth
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.lg, gap: spacing.md },
  heading: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  intro: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.body,
    color: colors.text,
  },
  // Password field: border on the row so the eye toggle sits inside it.
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
  error: {
    fontSize: typography.size.caption,
    color: colors.wrong,
    textAlign: 'center',
  },
  notice: {
    fontSize: typography.size.caption,
    color: colors.correct,
    textAlign: 'center',
  },
  links: { alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  link: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: operationColors.addition.accent,
  },
  // The "continue as child" escape sits apart from the auth links — its own
  // visible button above a divider so it doesn't read as part of signing in.
  childBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
