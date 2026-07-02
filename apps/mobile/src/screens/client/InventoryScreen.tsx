import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Pressable, TextInput,
} from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { RenaceFooter } from '../../components/RenaceFooter';
import { apiRequest } from '../../api/client';
import { useCart } from '../../context/CartContext';
import { colors, spacing, typography } from '../../theme';

type InventoryItem = {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  available: boolean;
  availableQty: number;
};

type InventoryResponse = {
  updatedAt: string;
  items: InventoryItem[];
};

export function InventoryScreen({ showAddToCart = true }: { showAddToCart?: boolean }) {
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const { addItem } = useCart();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest<InventoryResponse>('/mobile/inventory');
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 5000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]);

  const filtered = (data?.items ?? []).filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
  });

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Inventario"
        subtitle={data ? `Actualizado ${new Date(data.updatedAt).toLocaleTimeString('es-DO')}` : 'Tiempo real'}
      />
      <TextInput
        style={styles.search}
        placeholder="Buscar por nombre o SKU..."
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.productId}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sku}>{item.sku}</Text>
              <View style={[styles.badge, item.available ? styles.available : styles.unavailable]}>
                <Text style={[styles.badgeText, item.available ? styles.availableText : styles.unavailableText]}>
                  {item.available ? `Disponible · ${item.availableQty} ${item.unit}` : 'No disponible'}
                </Text>
              </View>
            </View>
            {showAddToCart && item.available ? (
              <Pressable
                style={styles.addBtn}
                onPress={() => addItem({
                  productId: item.productId,
                  sku: item.sku,
                  name: item.name,
                  unit: item.unit,
                })}
              >
                <Text style={styles.addBtnText}>+</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Sin productos en inventario</Text> : null}
      />
      <RenaceFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  search: {
    margin: spacing.md,
    marginBottom: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMain: { flex: 1 },
  name: { ...typography.subtitle, fontSize: 15 },
  sku: { ...typography.caption, marginTop: 2 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  available: { backgroundColor: colors.successBg },
  unavailable: { backgroundColor: colors.dangerBg },
  badgeText: { fontSize: 12, fontWeight: '600' },
  availableText: { color: colors.success },
  unavailableText: { color: colors.danger },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: -2 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
