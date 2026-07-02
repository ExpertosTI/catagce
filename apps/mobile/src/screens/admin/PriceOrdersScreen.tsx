import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppHeader } from '../../components/AppHeader';
import { RenaceFooter } from '../../components/RenaceFooter';
import { StatusBadge } from '../../components/StatusBadge';
import { apiRequest } from '../../api/client';
import { colors, spacing, typography } from '../../theme';
import { AdminOrdersStackParamList } from '../../navigation/types';

type OrderRow = {
  id: string;
  reference: string;
  status: string;
  clientName: string;
  createdAt: string;
};

type Props = NativeStackScreenProps<AdminOrdersStackParamList, 'PriceOrdersList'>;

export function PriceOrdersScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<OrderRow[]>('/mobile/orders');
      setOrders(data.filter((o) => o.status === 'pending_pricing' || o.status === 'priced'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.screen}>
      <AppHeader title="Adjudicar precios" subtitle="Por cliente y por pedido" />
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('PriceOrderDetail', { orderId: item.id })}
          >
            <View style={styles.top}>
              <Text style={styles.ref}>{item.reference}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.client}>{item.clientName}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('es-DO')}</Text>
          </Pressable>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No hay pedidos pendientes</Text> : null}
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
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { ...typography.subtitle, flex: 1 },
  client: { marginTop: spacing.xs, fontWeight: '600' },
  date: { ...typography.caption, marginTop: spacing.xs },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
