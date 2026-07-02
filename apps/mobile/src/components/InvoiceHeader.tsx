import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { invoiceColors } from '../theme/invoices';

type Props = {
  title: string;
};

export function InvoiceHeader({ title }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: invoiceColors.header,
    paddingHorizontal: 16,
    paddingBottom: 14,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});
