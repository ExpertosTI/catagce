import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { InvoiceHeader } from '../../components/InvoiceHeader';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  formatDate, formatUsd, invoiceBalance, invoiceTypeLabel, num,
} from '../../utils/money';
import { invoiceColors } from '../../theme/invoices';
import { InvoicesStackParamList } from '../../navigation/types';

type InvoiceDetail = {
  id: string;
  reference: string;
  invoiceType: string;
  status: string;
  subtotal: string | null;
  taxAmount: string | null;
  totalAmount: string;
  paidAmount: string | null;
  issuedAt: string | null;
  dueDate: string | null;
  notes: string | null;
  client?: { name: string; code?: string };
  clientName?: string;
  items: {
    id: string;
    name?: string;
    sku?: string;
    productName?: string;
    productSku?: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }[];
  payments: {
    id: string;
    amount: string;
    method: string;
    paidAt: string;
    reference?: string;
  }[];
};

type Props = NativeStackScreenProps<InvoicesStackParamList, 'InvoiceDetail'>;

export function InvoiceDetailScreen({ route, navigation }: Props) {
  const { session } = useAuth();
  const isAdmin = session?.type === 'staff';
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = isAdmin
      ? `/invoices/${route.params.invoiceId}`
      : `/portal/invoices/${route.params.invoiceId}`;
    apiRequest<InvoiceDetail>(path)
      .then(setInvoice)
      .finally(() => setLoading(false));
  }, [isAdmin, route.params.invoiceId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={invoiceColors.header} size="large" />
      </View>
    );
  }

  if (!invoice) {
    return <Text style={styles.error}>Factura no encontrada</Text>;
  }

  const clientName = invoice.client?.name ?? invoice.clientName ?? session?.name ?? '—';
  const balance = invoiceBalance(invoice.totalAmount, invoice.paidAmount);

  return (
    <View style={styles.screen}>
      <InvoiceHeader title={invoice.reference} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Volver</Text>
        </Pressable>

        <Text style={styles.clientName}>{clientName.toUpperCase()}</Text>
        <Text style={styles.type}>{invoiceTypeLabel(invoice.invoiceType)}</Text>
        <Text style={styles.date}>Fecha: {formatDate(invoice.issuedAt)}</Text>
        {invoice.dueDate ? <Text style={styles.date}>Vence: {formatDate(invoice.dueDate)}</Text> : null}

        <View style={styles.totalsBox}>
          <Row label="Bruto" value={formatUsd(invoice.subtotal ?? invoice.totalAmount)} />
          <Row label="ITBIS" value={formatUsd(invoice.taxAmount)} />
          <Row label="Total" value={formatUsd(invoice.totalAmount)} bold />
          <Row label="Pagado" value={formatUsd(invoice.paidAmount)} />
          <Row label="Balance" value={formatUsd(balance)} danger bold />
        </View>

        <Text style={styles.section}>Detalle</Text>
        {invoice.items.map((item) => {
          const name = item.name ?? item.productName ?? '—';
          const sku = item.sku ?? item.productSku ?? '';
          return (
          <View key={item.id} style={styles.line}>
            <Text style={styles.lineName}>{name}</Text>
            <Text style={styles.lineMeta}>{sku} · {item.quantity} × {formatUsd(item.unitPrice)}</Text>
            <Text style={styles.lineTotal}>{formatUsd(item.lineTotal)}</Text>
          </View>
          );
        })}

        {invoice.payments.length > 0 ? (
          <>
            <Text style={styles.section}>Pagos</Text>
            {invoice.payments.map((p) => (
              <View key={p.id} style={styles.line}>
                <Text style={styles.lineName}>{formatUsd(p.amount)}</Text>
                <Text style={styles.lineMeta}>{formatDate(p.paidAt)} · {p.method}</Text>
              </View>
            ))}
          </>
        ) : null}

        {invoice.notes ? <Text style={styles.notes}>{invoice.notes}</Text> : null}
      </ScrollView>
    </View>
  );
}

function Row({
  label, value, bold, danger,
}: { label: string; value: string; bold?: boolean; danger?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold, danger && styles.danger]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  back: { marginBottom: 12 },
  backText: { color: invoiceColors.header, fontWeight: '600', fontSize: 15 },
  clientName: { color: invoiceColors.clientName, fontWeight: '800', fontSize: 14 },
  type: { marginTop: 6, fontWeight: '600', color: '#0f172a' },
  date: { marginTop: 4, color: '#475569', fontSize: 14 },
  totalsBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: invoiceColors.border,
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: '#475569', fontSize: 14 },
  rowValue: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
  bold: { fontWeight: '800' },
  danger: { color: invoiceColors.danger },
  section: { marginTop: 18, marginBottom: 8, fontWeight: '800', fontSize: 16, color: '#0f172a' },
  line: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: invoiceColors.border,
    padding: 12,
    marginBottom: 8,
  },
  lineName: { fontWeight: '700', color: '#0f172a' },
  lineMeta: { color: '#64748b', fontSize: 13, marginTop: 4 },
  lineTotal: { color: invoiceColors.reference, fontWeight: '700', marginTop: 6 },
  notes: { marginTop: 12, color: '#64748b', fontStyle: 'italic' },
  error: { padding: 20, color: invoiceColors.danger },
});
