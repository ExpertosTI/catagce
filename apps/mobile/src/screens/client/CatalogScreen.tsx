import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { AppHeader } from '../../components/AppHeader';
import { RenaceFooter } from '../../components/RenaceFooter';
import { apiRequest } from '../../api/client';
import { fileUrl } from '../../config';
import { colors, spacing, typography } from '../../theme';

type CatalogPdf = {
  id: string;
  title: string;
  fileUrl: string;
  version: number;
};

export function CatalogScreen() {
  const [pdf, setPdf] = useState<CatalogPdf | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<CatalogPdf | null>('/mobile/catalog/pdf');
      setPdf(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const uri = pdf ? fileUrl(pdf.fileUrl) : null;

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Catálogo"
        subtitle={pdf ? `${pdf.title} · v${pdf.version}` : 'Sin catálogo publicado'}
      />
      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.center} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : !uri ? (
          <View style={styles.empty}>
            <Text style={typography.subtitle}>Aún no hay catálogo PDF</Text>
            <Text style={styles.emptyText}>El administrador subirá el catálogo actualizado aquí.</Text>
          </View>
        ) : (
          <WebView
            source={{ uri }}
            style={styles.webview}
            startInLoadingState
            renderLoading={() => <ActivityIndicator color={colors.primary} style={styles.center} />}
          />
        )}
      </View>
      <RenaceFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  empty: { flex: 1, justifyContent: 'center', padding: spacing.lg, alignItems: 'center' },
  emptyText: { ...typography.caption, marginTop: spacing.sm, textAlign: 'center' },
  error: { color: colors.danger, padding: spacing.lg, textAlign: 'center' },
});
