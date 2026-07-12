import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Header, IconButton, ScreenContainer } from '../components/ui';
import { colors, radius, shadows, spacing, typography } from '../constants/design';
import { useDeviceRole } from '../hooks';
import { tapFeedback } from '../lib/feedback';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** A tappable row in the grown-ups menu. */
function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
    >
      <Ionicons name={icon} size={22} color={colors.text} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

/**
 * "Grown-ups" menu, reached from the home gear after the parental gate. Holds
 * the parent/settings entries that don't belong in a kid's face. Choosing
 * "Parents" switches the device to parent mode and returns to the (now parent)
 * home.
 */
export default function GrownUpsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setRole } = useDeviceRole();
  return (
    <ScreenContainer>
      <Header
        title={t('grownUps.title')}
        left={
          <IconButton
            name="arrow-back"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
          />
        }
      />
      <View style={styles.menu}>
        <MenuRow
          icon="people-circle-outline"
          label={t('grownUps.parents')}
          onPress={() => {
            setRole('parent');
            router.dismissAll();
          }}
        />
        <MenuRow
          icon="help-buoy-outline"
          label={t('home.support')}
          onPress={() => router.push('/support')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  menu: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  rowLabel: {
    flex: 1,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
});
