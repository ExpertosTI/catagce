import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

const LABELS: Record<string, string> = {
  pending_pricing: 'Pendiente precio',
  priced: 'Precio asignado',
  confirmed: 'Confirmado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
};

const STYLES: Record<string, { bg: string; fg: string }> = {
  pending_pricing: { bg: colors.warningBg, fg: colors.warning },
  priced: { bg: '#dbeafe', fg: colors.primary },
  confirmed: { bg: colors.successBg, fg: colors.success },
  rejected: { bg: colors.dangerBg, fg: colors.danger },
  cancelled: { bg: '#f1f5f9', fg: colors.textMuted },
};

export function StatusBadge({ status }: { status: string }) {
  const palette = STYLES[status] ?? STYLES.cancelled;
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.fg }]}>{LABELS[status] ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
