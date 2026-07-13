import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Header,
  IconButton,
  ScreenContainer,
} from '../components/ui';
import { clockColors, colors, spacing, typography } from '../constants/design';
import type { ClockSession } from '../lib/clock';
import { clockHistoryStore } from '../lib/storage';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const when = (iso: string) => {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })}  ${d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  } catch {
    return '';
  }
};

function Row({ session }: { session: ClockSession }) {
  const { t } = useTranslation();
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.when}>{when(session.completedAt)}</Text>
          <Text style={styles.type}>
            {t(`clock.settings.type${cap(session.type)}`)}
          </Text>
          {session.corrected > 0 ? (
            <Text style={styles.corrected}>
              {t('clock.history.corrected', { count: session.corrected })}
            </Text>
          ) : null}
        </View>
        <Text style={styles.score}>
          {session.correct}/{session.total}
        </Text>
      </View>
    </Card>
  );
}

/** Clock's own local history — finished sessions, most recent first. */
export default function ClockHistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<ClockSession[] | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    clockHistoryStore.list().then(setSessions);
  }, []);

  const back = (
    <IconButton
      name="arrow-back"
      accessibilityLabel={t('common.back')}
      onPress={() => router.back()}
    />
  );

  if (!sessions) {
    return (
      <ScreenContainer>
        <Header title={t('clock.history.title')} left={back} />
      </ScreenContainer>
    );
  }

  if (sessions.length === 0) {
    return (
      <ScreenContainer>
        <Header title={t('clock.history.title')} left={back} />
        <EmptyState
          icon="time-outline"
          title={t('clock.history.empty')}
          hint={t('clock.history.emptyHint')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Header title={t('clock.history.title')} left={back} />
      <View style={styles.list}>
        {sessions.map((s) => (
          <Row key={s.id} session={s} />
        ))}
      </View>
      <View style={styles.clear}>
        <Button
          label={t('history.clearAll')}
          variant="secondary"
          onPress={() => setConfirming(true)}
        />
      </View>
      <ConfirmDialog
        visible={confirming}
        title={t('clock.history.clearTitle')}
        message={t('clock.history.clearMessage')}
        confirmLabel={t('history.clearConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={async () => {
          await clockHistoryStore.clear();
          setSessions([]);
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingVertical: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  left: { flexShrink: 1, gap: 2 },
  when: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  type: { fontSize: typography.size.caption, color: colors.textMuted },
  corrected: { fontSize: typography.size.caption, color: '#D97706' },
  score: {
    fontSize: typography.size.heading,
    fontWeight: '700',
    color: clockColors.hourHand,
    fontVariant: ['tabular-nums'],
  },
  clear: { alignItems: 'center', marginTop: spacing.md },
});
