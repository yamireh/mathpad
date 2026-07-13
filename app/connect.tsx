import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Header, IconButton, ScreenContainer } from '../components/ui';
import { colors, operationColors, radius, spacing, typography } from '../constants/design';
import { useFamilyLink } from '../hooks';
import { ensureSignedInUid } from '../lib/firebase/auth';
import { InvalidCodeError, joinFamily } from '../lib/firebase/family';
import { backfillSessions } from '../lib/firebase/sync';
import { historyStore } from '../lib/storage';

/**
 * "Connect to a parent" — a grown-up enters the family code (from the parent's
 * device) to link this child device. Reached from the gated Grown-ups menu.
 * Once linked, the device is locked to child mode until a parent unlinks it.
 */
export default function ConnectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { linked, setLink } = useFamilyLink();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const uid = await ensureSignedInUid();
      const familyId = await joinFamily(code, uid, name);
      setLink({ familyId, childId: uid });
      // `linked` flips true → the connected state renders below.
      // Push existing local history so the parent sees past practice too.
      void backfillSessions(familyId, uid, await historyStore.list());
    } catch (e) {
      setError(t(e instanceof InvalidCodeError ? 'connect.invalid' : 'connect.error'));
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <IconButton
      name="arrow-back"
      accessibilityLabel={t('common.back')}
      onPress={() => router.back()}
    />
  );

  if (linked) {
    return (
      <ScreenContainer scroll header={<Header title={t('connect.title')} left={back} />}>
        <View style={styles.body}>
          <Ionicons name="link" size={64} color={colors.correct} />
          <Text style={styles.heading}>{t('connect.connectedTitle')}</Text>
          <Text style={styles.intro}>{t('connect.connectedBody')}</Text>
          <View style={styles.action}>
            <Button
              label={t('connect.disconnect')}
              icon="unlink-outline"
              variant="ghost"
              onPress={() => setLink(null)}
              fullWidth
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll header={<Header title={t('connect.title')} left={back} />}>
      <View style={styles.form}>
        <Text style={styles.heading}>{t('connect.heading')}</Text>
        <Text style={styles.intro}>{t('connect.intro')}</Text>
        <TextInput
          style={styles.nameInput}
          placeholder={t('connect.namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={24}
          editable={!busy}
        />
        <TextInput
          style={styles.input}
          placeholder={t('connect.placeholder')}
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
          label={t('connect.connect')}
          onPress={connect}
          loading={busy}
          disabled={name.trim().length === 0 || code.trim().length < 4}
          fullWidth
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.lg, gap: spacing.md },
  body: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
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
    maxWidth: 320,
  },
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
    color: operationColors.addition.accent,
  },
  error: {
    fontSize: typography.size.caption,
    color: colors.wrong,
    textAlign: 'center',
  },
  action: { alignSelf: 'stretch', marginTop: spacing.lg },
});
