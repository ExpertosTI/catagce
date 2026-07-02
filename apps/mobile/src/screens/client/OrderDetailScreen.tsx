import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppHeader } from '../../components/AppHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { apiRequest } from '../../api/client';
import { colors, spacing, typography } from '../../theme';
import { ClientOrdersStackParamList } from '../../navigation/types';

type OrderDetail = {
  id: string;
  reference: string;
  status: string;
  notes: string | null;
  totalAmount: string | null;
  items: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: string | null;
    lineTotal: string | null;
    unit: string;
  }[];
};

type Props = NativeStackScreenProps<ClientOrdersStackParamList, 'OrderDetail'>;

export function OrderDetailScreen({ route }: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<OrderDetail>(`/mobile/orders/${route.params.orderId}`)
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [route.params.orderId]);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;
  }

  if (!order) {
    return <Text style={styles.error}>Pedido no encontrado</Text>;
  }

  return (
    <View style={styles.screen}>
      <AppHeader title={order.reference} subtitle="Detalle del pedido" />
      <ScrollView contentContainerStyle={styles.content}>
        <StatusBadge status={order.status} />
        {order.notes ? <Text style={styles.notes}>{order.notes}</Text> : null}
        {order.items.map((item) => (
          <View key={item.id} style={styles.line}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.sku}>{item.sku}</Text>
            <Text style={styles.qty}>{item.quantity} {item.unit}</Text>
            {item.unitPrice ? (
              <Text style={styles.price}>
                RD$ {Number(item.unitPrice).toLocaleString('es-DO')} c/u · Total RD$ {Number(item.lineTotal).toLocaleString('es-DO')}
              </Text>
            ) : (
              <Text style={styles.noPrice}>Precio por adjudicar</Text>
            )}
          </View>
        ))}
        {order.totalAmount && order.status !== 'pending_pricing' ? (
          <Text style={styles.total}>Total: RD$ {Number(order.totalAmount).toLocaleString('es-DO')}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm },
  notes: { ...typography.body, marginTop: spacing.sm, fontStyle: 'italic' },
  line: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  name: { ...typography.subtitle, fontSize: 15 },
  sku: { ...typography.caption },
  qty: { marginTop: spacing.xs, fontWeight: '600' },
  price: { marginTop: spacing.xs, color: colors.primary, fontWeight: '600' },
  noPrice: { marginTop: spacing.xs, color: colors.warning, fontWeight: '600' },
  total: { marginTop: spacing.lg, fontSize: 18, fontWeight: '800', color: colors.primary },
  error: { padding: spacing.lg, color: colors.danger },
});
