import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppHeader } from '../../components/AppHeader';
import { RenaceFooter } from '../../components/RenaceFooter';
import { StatusBadge } from '../../components/StatusBadge';
import { apiRequest } from '../../api/client';
import { colors, spacing, typography } from '../../theme';
import { ClientOrdersStackParamList } from '../../navigation/types';

type OrderRow = {
  id: string;
  reference: string;
  status: string;
  totalAmount: string | null;
  createdAt: string;
};

type Props = NativeStackScreenProps<ClientOrdersStackParamList, 'OrdersList'>;

export function OrdersScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<OrderRow[]>('/mobile/orders');
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.screen}>
      <AppHeader title="Mis pedidos" subtitle="Estado y precios adjudicados" />
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
          >
            <View style={styles.rowTop}>
              <Text style={styles.ref}>{item.reference}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('es-DO')}</Text>
            {item.totalAmount && item.status !== 'pending_pricing' ? (
              <Text style={styles.total}>Total: RD$ {Number(item.totalAmount).toLocaleString('es-DO')}</Text>
            ) : (
              <Text style={styles.pending}>Precio pendiente de adjudicación</Text>
            )}
          </Pressable>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Aún no tienes pedidos</Text> : null}
      />
      <RenaceFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  ref: { ...typography.subtitle, flex: 1 },
  date: { ...typography.caption, marginTop: spacing.xs },
  total: { marginTop: spacing.sm, fontWeight: '700', color: colors.primary },
  pending: { marginTop: spacing.sm, color: colors.warning, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
