import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Header, IconButton, ScreenContainer } from '../components/ui';
import { colors, operationColors, radius, spacing, typography } from '../constants/design';
import { useFamilyLink } from '../hooks';
import { ensureSignedInUid } from '../lib/firebase/auth';
import {
  claimSlot,
  CodeInUseError,
  InvalidCodeError,
} from '../lib/firebase/family';
import { backfillSessions } from '../lib/firebase/sync';
import { historyStore } from '../lib/storage';

/**
 * "Connect to a parent" — a grown-up enters the per-child join code (shown on
 * the parent's dashboard) to link this child device to a family slot. Reached
 * from the gated Grown-ups menu. Once linked, the device is locked to child mode
 * until a parent re-issues or removes the child (there is no child-side
 * disconnect). The kid's own display name is LOCAL ONLY — never written to
 * Firebase.
 */
export default function ConnectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { link, linked, setLink } = useFamilyLink();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameNotice, setNameNotice] = useState<string | null>(null);

  // Seed the local name field from the saved (local) display name once linked.
  useEffect(() => {
    if (link?.name) setName(link.name);
  }, [link?.name]);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const uid = await ensureSignedInUid();
      const { familyId, childId, name: childName } = await claimSlot(code, uid);
      // Seed the LOCAL display name from the parent's label; the kid can change
      // it locally, but it's never synced back to Firebase.
      setLink({ familyId, childId, name: childName });
      // Push existing local history so the parent sees past practice too.
      void backfillSessions(familyId, childId, await historyStore.list());
    } catch (e) {
      setError(
        t(
          e instanceof CodeInUseError
            ? 'connect.inUse'
            : e instanceof InvalidCodeError
              ? 'connect.invalid'
              : 'connect.error',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  // LOCAL-ONLY rename: update the persisted family link; no Firebase write.
  const saveName = () => {
    if (!link) return;
    setLink({ ...link, name: name.trim() });
    setNameNotice(t('connect.nameSaved'));
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
          <Ionicons name="checkmark-circle" size={64} color={colors.correct} />
          <Text style={styles.heading}>{t('connect.welcomeTitle')}</Text>
          <Text style={styles.intro}>{t('connect.welcomeBody')}</Text>

          <View style={styles.nameEdit}>
            <Text style={styles.fieldLabel}>{t('connect.nameLabel')}</Text>
            <TextInput
              style={styles.nameInput}
              placeholder={t('connect.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={(v) => {
                setName(v);
                setNameNotice(null);
              }}
              autoCapitalize="words"
              maxLength={24}
              editable={!busy}
            />
            {nameNotice ? <Text style={styles.notice}>{nameNotice}</Text> : null}
            <Button
              label={t('connect.changeName')}
              variant="ghost"
              onPress={saveName}
              disabled={!name.trim() || name.trim() === (link?.name ?? '')}
              fullWidth
            />
          </View>

          <View style={styles.action}>
            <Button
              label={t('connect.startPractice')}
              icon="play"
              onPress={() => router.replace('/')}
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
          style={[styles.input, code.length === 0 && styles.inputEmpty]}
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
          disabled={code.trim().length < 4}
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
  // While empty, drop the wide tracking so the placeholder text isn't spaced out.
  inputEmpty: { letterSpacing: 1, fontWeight: '500' },
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
  nameEdit: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
  fieldLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  action: { alignSelf: 'stretch', marginTop: spacing.lg },
});
