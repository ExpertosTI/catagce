import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatRd, formatUsd } from '../utils/money';
import { invoiceColors } from '../theme/invoices';

type Props = {
  count: number;
  totalUsd: number;
  balanceUsd: number;
};

export function InvoiceSummaryFooter({ count, totalUsd, balanceUsd }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.badge}>Facturas totales: {count}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Total:</Text>
        <Text style={styles.value}>{formatRd(totalUsd)} | {formatUsd(totalUsd)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Balance:</Text>
        <Text style={[styles.value, styles.balance]}>{formatRd(balanceUsd)} | {formatUsd(balanceUsd)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: invoiceColors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  balance: {
    color: invoiceColors.danger,
    fontWeight: '800',
  },
});
