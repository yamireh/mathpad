import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../../ui';
import { colors, radius, spacing, typography } from '../../../constants/design';
import {
  InvalidCodeError,
  createFamily,
  joinAsParent,
} from '../../../lib/firebase/family';

/**
 * Shown to a signed-in parent who has no family yet: create a fresh one, or
 * join a partner's family with a co-parent invite code. On success the caller
 * reloads and the dashboard takes over.
 */
export function FamilySetup({
  uid,
  onReady,
}: {
  uid: string;
  onReady: () => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await createFamily(uid);
      onReady();
    } catch {
      setError(t('familySetup.error'));
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      await joinAsParent(code, uid);
      onReady();
    } catch (e) {
      setError(
        t(e instanceof InvalidCodeError ? 'familySetup.invalid' : 'familySetup.error'),
      );
      setBusy(false);
    }
  };

  if (mode === 'join') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.heading}>{t('familySetup.joinHeading')}</Text>
        <Text style={styles.intro}>{t('familySetup.joinIntro')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('familySetup.codePlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          editable={!busy}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={t('familySetup.join')}
          onPress={join}
          loading={busy}
          disabled={code.trim().length < 4}
          fullWidth
        />
        <Button
          label={t('common.back')}
          variant="ghost"
          onPress={() => {
            setMode('choose');
            setError(null);
          }}
          fullWidth
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{t('familySetup.heading')}</Text>
      <Text style={styles.intro}>{t('familySetup.intro')}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={t('familySetup.create')}
        icon="home-outline"
        onPress={create}
        loading={busy}
        fullWidth
      />
      <Button
        label={t('familySetup.joinCta')}
        icon="people-outline"
        variant="secondary"
        onPress={() => setMode('join')}
        disabled={busy}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', gap: spacing.md, paddingVertical: spacing.md },
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
    paddingVertical: spacing.md,
    fontSize: typography.size.heading,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    color: colors.text,
  },
  error: {
    fontSize: typography.size.caption,
    color: colors.wrong,
    textAlign: 'center',
  },
});
