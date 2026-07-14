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
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';

  const go = (next: 'signin' | 'signup' | 'reset') => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (isReset) {
        await resetPassword(email.trim());
        setNotice(t('parentAuth.resetSent'));
        setBusy(false);
      } else if (isSignup) {
        await signUp(email.trim(), password, name);
      } else {
        await signIn(email.trim(), password);
      }
      // Sign in/up success unmounts this form (auth flips) — no need to reset busy.
    } catch (e) {
      setError(t(authErrorKey(e)));
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.heading}>
        {t(
          isReset
            ? 'parentAuth.resetHeading'
            : isSignup
              ? 'parentAuth.signUpHeading'
              : 'parentAuth.signInHeading',
        )}
      </Text>
      <Text style={styles.intro}>
        {t(isReset ? 'parentAuth.resetIntro' : 'parentAuth.intro')}
      </Text>

      {isSignup ? (
        <View style={styles.fieldWrap}>
          <TextInput
            style={styles.fieldInput}
            placeholder={t('parentAuth.name')}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="name"
            maxLength={40}
            editable={!busy}
          />
        </View>
      ) : null}

      <View style={styles.fieldWrap}>
        <TextInput
          style={styles.fieldInput}
          placeholder={t('parentAuth.email')}
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!busy}
        />
      </View>

      {!isReset ? (
        <View style={styles.fieldWrap}>
          <TextInput
            style={styles.fieldInput}
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
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Button
        label={t(
          isReset
            ? 'parentAuth.sendReset'
            : isSignup
              ? 'parentAuth.signUp'
              : 'parentAuth.signIn',
        )}
        onPress={submit}
        loading={busy}
        disabled={!email.trim() || (isSignup && !name.trim())}
        fullWidth
      />

      <View style={styles.links}>
        {isReset ? (
          <TextLink
            label={t('parentAuth.backToSignIn')}
            onPress={() => go('signin')}
          />
        ) : (
          <>
            {!isSignup ? (
              <TextLink label={t('parentAuth.forgot')} onPress={() => go('reset')} />
            ) : null}
            <TextLink
              label={t(isSignup ? 'parentAuth.toSignIn' : 'parentAuth.toSignUp')}
              onPress={() => go(isSignup ? 'signin' : 'signup')}
            />
          </>
        )}
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
  // One field style for name / email / password so they align identically. The
  // border is on the row (not the input) so the password eye toggle sits inside.
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  fieldInput: {
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
