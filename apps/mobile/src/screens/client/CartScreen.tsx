import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { RenaceFooter } from '../../components/RenaceFooter';
import { useCart } from '../../context/CartContext';
import { apiRequest } from '../../api/client';
import { colors, spacing, typography } from '../../theme';

export function CartScreen() {
  const { items, setQuantity, removeItem, clear, totalUnits } = useCart();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitOrder() {
    if (!items.length) {
      Alert.alert('Pedido vacío', 'Agrega productos desde Inventario.');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/mobile/orders', {
        method: 'POST',
        body: {
          notes: notes.trim() || undefined,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      });
      clear();
      setNotes('');
      Alert.alert(
        'Pedido enviado',
        'Tu pedido fue recibido. El administrador adjudicará los precios según tu cuenta.',
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo enviar el pedido');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Mi pedido" subtitle={`${totalUnits} unidades · sin precios`} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <Text style={styles.note}>
            Los precios se asignan después según tu cliente y el pedido. No verás montos hasta que el admin los adjudique.
          </Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sku}>{item.sku}</Text>
            </View>
            <View style={styles.qtyWrap}>
              <Pressable style={styles.qtyBtn} onPress={() => setQuantity(item.productId, item.quantity - 1)}>
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qty}>{item.quantity}</Text>
              <Pressable style={styles.qtyBtn} onPress={() => setQuantity(item.productId, item.quantity + 1)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => removeItem(item.productId)}>
              <Text style={styles.remove}>Quitar</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Tu pedido está vacío</Text>}
        ListFooterComponent={items.length ? (
          <View style={styles.footer}>
            <Text style={styles.label}>Notas para el administrador</Text>
            <TextInput
              style={styles.input}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Ej. entrega urgente, referencia de contenedor..."
            />
            <Pressable style={styles.submit} onPress={submitOrder} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>Enviar pedido sin precio</Text>}
            </Pressable>
          </View>
        ) : null}
      />
      <RenaceFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  note: {
    ...typography.caption,
    backgroundColor: '#dbeafe',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    color: colors.primaryDark,
  },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMain: { marginBottom: spacing.sm },
  name: { ...typography.subtitle, fontSize: 15 },
  sku: { ...typography.caption },
  qtyWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  qty: { minWidth: 28, textAlign: 'center', fontWeight: '700', fontSize: 16 },
  remove: { color: colors.danger, marginTop: spacing.sm, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  footer: { marginTop: spacing.md },
  label: { ...typography.caption, marginBottom: spacing.xs },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
