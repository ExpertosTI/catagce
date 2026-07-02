import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, Pressable, RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { InvoiceHeader } from '../../components/InvoiceHeader';
import { InvoiceSummaryFooter } from '../../components/InvoiceSummaryFooter';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  formatDate, formatUsd, invoiceBalance, invoiceTypeLabel, num,
} from '../../utils/money';
import { invoiceColors } from '../../theme/invoices';
import { InvoicesStackParamList } from '../../navigation/types';

export type InvoiceRow = {
  id: string;
  reference: string;
  invoiceType: string;
  status: string;
  subtotal: string | null;
  taxAmount: string | null;
  totalAmount: string;
  paidAmount: string | null;
  issuedAt: string | null;
  clientName: string;
};

type Props = NativeStackScreenProps<InvoicesStackParamList, 'InvoicesList'>;

export function InvoicesScreen({ navigation }: Props) {
  const { session } = useAuth();
  const isAdmin = session?.type === 'staff';
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const path = isAdmin ? '/invoices' : '/portal/invoices';
      const data = await apiRequest<InvoiceRow[]>(path);
      setInvoices(data);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      inv.reference.toLowerCase().includes(q)
      || inv.clientName.toLowerCase().includes(q)
      || invoiceTypeLabel(inv.invoiceType).toLowerCase().includes(q),
    );
  }, [invoices, query]);

  const summary = useMemo(() => {
    const totalUsd = filtered.reduce((sum, inv) => sum + num(inv.totalAmount), 0);
    const balanceUsd = filtered.reduce(
      (sum, inv) => sum + invoiceBalance(inv.totalAmount, inv.paidAmount),
      0,
    );
    return { totalUsd, balanceUsd };
  }, [filtered]);

  return (
    <View style={styles.screen}>
      <InvoiceHeader title="Facturas" />
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Buscar"
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={invoiceColors.header} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const bruto = num(item.subtotal ?? item.totalAmount);
          const itbis = num(item.taxAmount);
          const total = num(item.totalAmount);

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.left}>
                  <Text style={styles.clientName}>{item.clientName.toUpperCase()}</Text>
                  <Text style={styles.reference}>{item.reference}</Text>
                  <Text style={styles.type}>{invoiceTypeLabel(item.invoiceType)}</Text>
                  <Text style={styles.date}>{formatDate(item.issuedAt)}</Text>
                </View>

                <View style={styles.middle}>
                  <Text style={styles.amountLine}>Bruto: {formatUsd(bruto)}</Text>
                  <Text style={styles.amountLine}>ITBIS: {formatUsd(itbis)}</Text>
                  <Text style={styles.amountLine}>Total: {formatUsd(total)}</Text>
                </View>

                <View style={styles.right}>
                  <Text style={styles.totalBig}>{formatUsd(total)}</Text>
                  <Pressable
                    style={styles.verBtn}
                    onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
                  >
                    <Text style={styles.verBtnText}>Ver</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!loading ? (
          <Text style={styles.empty}>No hay facturas</Text>
        ) : null}
      />

      <InvoiceSummaryFooter
        count={filtered.length}
        totalUsd={summary.totalUsd}
        balanceUsd={summary.balanceUsd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f1f5f9' },
  searchWrap: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f1f5f9' },
  search: {
    backgroundColor: invoiceColors.searchBg,
    borderWidth: 1,
    borderColor: invoiceColors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  list: { paddingHorizontal: 8, paddingBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: invoiceColors.border,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
  },
  left: { flex: 1.1, minWidth: 0 },
  middle: { flex: 1, justifyContent: 'center' },
  right: { width: 92, alignItems: 'flex-end', justifyContent: 'space-between' },
  clientName: {
    color: invoiceColors.clientName,
    fontWeight: '700',
    fontSize: 11,
    marginBottom: 4,
  },
  reference: {
    color: invoiceColors.reference,
    fontWeight: '700',
    fontSize: 13,
  },
  type: {
    fontSize: 11,
    color: '#0f172a',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: '#0f172a',
    marginTop: 2,
  },
  amountLine: {
    fontSize: 11,
    color: '#0f172a',
    marginBottom: 2,
  },
  totalBig: {
    color: invoiceColors.danger,
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'right',
  },
  verBtn: {
    borderWidth: 1.5,
    borderColor: invoiceColors.header,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 8,
  },
  verBtnText: {
    color: invoiceColors.header,
    fontWeight: '700',
    fontSize: 13,
  },
  empty: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 40,
    fontSize: 15,
  },
});
