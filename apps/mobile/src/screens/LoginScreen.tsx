import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, spacing, typography } from '../theme';
import { RenaceFooter } from '../components/RenaceFooter';
import { useAuth } from '../context/AuthContext';
import { APP_META } from '../config';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'client' | 'staff'>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password, mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <Text style={styles.brand}>{APP_META.company}</Text>
        <Text style={styles.location}>{APP_META.city}</Text>
        <Text style={styles.tagline}>Facturas, catálogo e inventario</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, mode === 'client' && styles.tabActive]}
            onPress={() => setMode('client')}
          >
            <Text style={[styles.tabText, mode === 'client' && styles.tabTextActive]}>Cliente</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, mode === 'staff' && styles.tabActive]}
            onPress={() => setMode('staff')}
          >
            <Text style={[styles.tabText, mode === 'staff' && styles.tabTextActive]}>Admin</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder={mode === 'client' ? 'cliente@demo.com' : 'admin@generalhome.tech'}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </Pressable>

        <Text style={styles.hint}>
          {mode === 'client'
            ? 'Ver catálogo PDF, disponibilidad y pedir sin precios.'
            : 'Subir catálogo PDF y adjudicar precios por pedido.'}
        </Text>
      </View>

      <RenaceFooter />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
  brand: { fontSize: 28, fontWeight: '800', color: '#fff' },
  location: { color: '#bfdbfe', marginTop: spacing.xs },
  tagline: { color: '#dbeafe', marginTop: spacing.md, fontSize: 15 },
  card: {
    margin: spacing.md,
    marginTop: -spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  tabs: { flexDirection: 'row', marginBottom: spacing.md, gap: spacing.sm },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#dbeafe' },
  tabText: { ...typography.body, color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  label: { ...typography.caption, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, marginTop: spacing.sm },
  hint: { ...typography.caption, marginTop: spacing.md, textAlign: 'center' },
});
