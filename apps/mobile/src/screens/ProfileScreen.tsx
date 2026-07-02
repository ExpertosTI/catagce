import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { RenaceFooter } from '../components/RenaceFooter';
import { useAuth } from '../context/AuthContext';
import { APP_META } from '../config';
import { colors, spacing, typography } from '../theme';

export function ProfileScreen() {
  const { session, signOut } = useAuth();

  return (
    <View style={styles.screen}>
      <AppHeader title="Mi cuenta" subtitle={session?.company.name} />
      <View style={styles.body}>
        <Text style={styles.name}>{session?.name}</Text>
        <Text style={styles.email}>{session?.email}</Text>
        <Text style={styles.role}>{session?.type === 'staff' ? 'Administrador' : 'Cliente'}</Text>
        <Text style={styles.meta}>{APP_META.city}</Text>
        <Pressable style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Cerrar sesión</Text>
        </Pressable>
      </View>
      <RenaceFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, flex: 1 },
  name: { ...typography.title },
  email: { ...typography.body, marginTop: spacing.xs },
  role: { color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
  meta: { ...typography.caption, marginTop: spacing.xs },
  button: {
    marginTop: spacing.xl,
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.danger, fontWeight: '700' },
});
