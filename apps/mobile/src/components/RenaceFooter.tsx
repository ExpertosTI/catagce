import React from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { APP_META } from '../config';

export function RenaceFooter() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>Desarrollado por </Text>
      <Pressable onPress={() => Linking.openURL(APP_META.developerUrl)}>
        <Text style={styles.link}>{APP_META.developer}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  text: {
    ...typography.caption,
  },
  link: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
});
