import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppHeader } from '../../components/AppHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { apiRequest } from '../../api/client';
import { colors, spacing, typography } from '../../theme';
import { AdminOrdersStackParamList } from '../../navigation/types';

type OrderDetail = {
  id: string;
  reference: string;
  status: string;
  clientName: string;
  items: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: string | null;
    unit: string;
  }[];
};

type Props = NativeStackScreenProps<AdminOrdersStackParamList, 'PriceOrderDetail'>;

export function PriceOrderDetailScreen({ route, navigation }: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<OrderDetail>(`/mobile/orders/${route.params.orderId}`)
      .then((data) => {
        setOrder(data);
        const initial: Record<string, string> = {};
        data.items.forEach((i) => {
          initial[i.id] = i.unitPrice ? String(i.unitPrice) : '';
        });
        setPrices(initial);
      })
      .finally(() => setLoading(false));
  }, [route.params.orderId]);

  async function save(confirm: boolean) {
    if (!order) return;
    const items = order.items.map((item) => {
      const unitPrice = Number(prices[item.id]);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Precio inválido para ${item.name}`);
      }
      return { id: item.id, unitPrice };
    });

    setSaving(true);
    try {
      await apiRequest(`/mobile/orders/${order.id}/prices`, {
        method: 'PATCH',
        body: { items, confirm },
      });
      Alert.alert(
        confirm ? 'Pedido confirmado' : 'Precios guardados',
        confirm ? 'El cliente verá los precios adjudicados.' : 'Puedes confirmar cuando estés listo.',
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudieron guardar los precios');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !order) {
    return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;
  }

  return (
    <View style={styles.screen}>
      <AppHeader title={order.reference} subtitle={order.clientName} />
      <ScrollView contentContainerStyle={styles.content}>
        <StatusBadge status={order.status} />
        {order.items.map((item) => (
          <View key={item.id} style={styles.line}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.sku}>{item.sku} · {item.quantity} {item.unit}</Text>
            <Text style={styles.label}>Precio unitario (RD$)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={prices[item.id] ?? ''}
              onChangeText={(v) => setPrices((prev) => ({ ...prev, [item.id]: v }))}
              placeholder="0.00"
            />
          </View>
        ))}

        <Pressable style={styles.saveBtn} onPress={() => save(false)} disabled={saving}>
          <Text style={styles.saveText}>Guardar precios</Text>
        </Pressable>
        <Pressable style={styles.confirmBtn} onPress={() => save(true)} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.confirmText}>Confirmar y notificar cliente</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  line: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { ...typography.subtitle, fontSize: 15 },
  sku: { ...typography.caption, marginBottom: spacing.sm },
  label: { ...typography.caption, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  saveBtn: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: colors.primary, fontWeight: '700' },
  confirmBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '700' },
});
