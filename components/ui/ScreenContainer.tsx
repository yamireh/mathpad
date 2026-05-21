import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../../constants/design';

export interface ScreenContainerProps {
  children: ReactNode;
  /** Wrap content in a ScrollView. */
  scroll?: boolean;
  /** Apply standard screen padding. */
  padded?: boolean;
  /** Safe-area edges to inset; defaults to all. */
  edges?: readonly Edge[];
  /** Extra style for the content container. */
  contentStyle?: ViewStyle;
}

/** Standard screen wrapper — safe-area inset, app background, optional scroll. */
export function ScreenContainer({
  children,
  scroll = false,
  padded = true,
  edges,
  contentStyle,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            padded && styles.padded,
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padded && styles.padded, contentStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padded: { padding: spacing.xl },
});
