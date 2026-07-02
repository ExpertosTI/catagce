import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';
import { APP_META } from '../config';

type Props = {
  title: string;
  subtitle?: string;
};

export function AppHeader({ title, subtitle }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={typography.caption}>{APP_META.company} · {APP_META.city}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: '#fff',
    marginTop: spacing.xs,
  },
  subtitle: {
    color: '#dbeafe',
    marginTop: spacing.xs,
    fontSize: 14,
  },
});
