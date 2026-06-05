import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { OperationCard } from '../../domain';
import {
  Header,
  IconButton,
  Pill,
  ScreenContainer,
} from '../../ui';
import { spacing } from '../../../constants/design';
import { usePurchases } from '../../../hooks';
import { isOperationUnlocked } from '../../../lib/entitlement';
import { tapFeedback } from '../../../lib/feedback';
import type { Operation } from '../../../types';

/** Topic cards shown by the OperationsPanel, in display order. */
const OPERATIONS: Operation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'mix',
];

/**
 * OperationsPanel — the math-operations topic landing screen.
 * Lists the five operation cards (addition/subtraction/multiplication/
 * division/mix) plus a History shortcut, and pushes the kid into the
 * per-operation settings flow on tap. Reachable from `MainPanel` → Operations.
 */
export function OperationsPanel() {
  const router = useRouter();
  const { t } = useTranslation();
  const { owned, devSetOwned } = usePurchases();

  return (
    <ScreenContainer scroll>
      <Header
        title={t('topics.operations')}
        left={
          <IconButton
            name="arrow-back"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
          />
        }
      />

      <View style={styles.grid}>
        {OPERATIONS.map((operation) => {
          const locked = !isOperationUnlocked(operation, owned);
          const label = t(`operations.${operation}`);
          return (
            <OperationCard
              key={operation}
              operation={operation}
              label={label}
              description={t(`operationsDesc.${operation}`)}
              locked={locked}
              accessibilityLabel={
                locked ? t('unlock.lockedCard', { operation: label }) : label
              }
              onPress={() => {
                tapFeedback();
                if (locked) {
                  router.push({ pathname: '/unlock', params: { operation } });
                } else {
                  router.push(`/settings/${operation}`);
                }
              }}
            />
          );
        })}
      </View>

      <View style={styles.footer}>
        <Pill
          label={t('home.history')}
          icon="time-outline"
          onPress={() => router.push('/history')}
        />
        {__DEV__ ? (
          <Pill
            label={owned ? 'DEV: owned ✓' : 'DEV: locked'}
            icon="bug-outline"
            onPress={() => devSetOwned(!owned)}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md, marginTop: spacing.lg },
  footer: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.md },
});
