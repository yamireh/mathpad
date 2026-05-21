import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { operatorSymbol } from '../../components/domain';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Header,
  IconButton,
  ScreenContainer,
} from '../../components/ui';
import {
  colors,
  operationColors,
  radius,
  spacing,
  typography,
} from '../../constants/design';
import { useHistory } from '../../hooks';
import type { SessionResult } from '../../types';

/** History — completed sessions, most recent first. */
export default function HistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { sessions, loading, clearAll } = useHistory();
  const [confirming, setConfirming] = useState(false);

  const back = (
    <IconButton
      name="arrow-back"
      accessibilityLabel={t('common.back')}
      onPress={() => router.back()}
    />
  );

  if (loading || !sessions) {
    return (
      <ScreenContainer>
        <Header title={t('history.title')} left={back} />
      </ScreenContainer>
    );
  }

  if (sessions.length === 0) {
    return (
      <ScreenContainer>
        <Header title={t('history.title')} left={back} />
        <EmptyState
          icon="time-outline"
          title={t('history.empty')}
          hint={t('history.emptyHint')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Header title={t('history.title')} left={back} />

      <View style={styles.list}>
        {sessions.map((session) => (
          <HistoryRow
            key={session.id}
            session={session}
            onPress={() => router.push(`/history/${session.id}`)}
          />
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
        title={t('history.clearTitle')}
        message={t('history.clearMessage')}
        confirmLabel={t('history.clearConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          void clearAll();
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    </ScreenContainer>
  );
}

/** One session entry. */
function HistoryRow({
  session,
  onPress,
}: {
  session: SessionResult;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const accent = operationColors[session.operation].accent;
  const when = new Date(session.completedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Card onPress={onPress} style={styles.row}>
      <View style={[styles.badge, { backgroundColor: accent }]}>
        {session.operation === 'mix' ? (
          <Ionicons name="shuffle" size={20} color="#FFFFFF" />
        ) : (
          <Text style={styles.badgeSymbol}>
            {operatorSymbol[session.operation]}
          </Text>
        )}
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>
          {t(`operations.${session.operation}`)}
        </Text>
        <Text style={styles.rowMeta}>
          {when} · {t('history.duration', {
            minutes: Math.max(1, Math.round(session.durationSeconds / 60)),
          })}
        </Text>
      </View>

      <View style={styles.scores}>
        <Text style={styles.scoreText}>
          {t('history.firstTry', {
            score: session.firstTryScore,
            total: session.totalQuestions,
          })}
        </Text>
        <Text style={[styles.scoreText, styles.scoreFinal]}>
          {t('history.final', {
            score: session.finalScore,
            total: session.totalQuestions,
          })}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSymbol: {
    fontSize: 24,
    fontWeight: typography.weight.medium,
    color: '#FFFFFF',
  },
  rowBody: { flex: 1, gap: spacing.xs },
  rowTitle: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  rowMeta: { fontSize: typography.size.caption, color: colors.textMuted },
  scores: { alignItems: 'flex-end', gap: spacing.xs },
  scoreText: { fontSize: typography.size.caption, color: colors.textMuted },
  scoreFinal: {
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  clear: { marginTop: spacing.xxl },
});
