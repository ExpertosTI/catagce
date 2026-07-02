import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { AppHeader } from '../../components/AppHeader';
import { RenaceFooter } from '../../components/RenaceFooter';
import { apiRequest, getToken } from '../../api/client';
import { API_BASE } from '../../config';
import { colors, spacing, typography } from '../../theme';

export function UploadCatalogScreen() {
  const [title, setTitle] = useState('Catálogo General Home');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      setFile(result.assets[0]);
      if (!title || title === 'Catálogo General Home') {
        setTitle(result.assets[0].name.replace(/\.pdf$/i, ''));
      }
    }
  }

  async function upload() {
    if (!file) {
      Alert.alert('Selecciona un PDF', 'El catálogo debe ser un archivo PDF.');
      return;
    }
    setUploading(true);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append('title', title.trim());
      form.append('file', {
        uri: file.uri,
        name: file.name,
        type: 'application/pdf',
      } as unknown as Blob);

      const res = await fetch(`${API_BASE}/mobile/catalog/pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Error al subir');
      }

      Alert.alert('Listo', 'Catálogo PDF actualizado. Los clientes lo verán de inmediato.');
      setFile(null);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo subir el PDF');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Subir catálogo" subtitle="PDF sin precios — solo mercancía" />
      <View style={styles.body}>
        <Text style={styles.label}>Título del catálogo</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />

        <Pressable style={styles.pickBtn} onPress={pickPdf}>
          <Text style={styles.pickBtnText}>{file ? 'Cambiar PDF' : 'Elegir PDF'}</Text>
        </Pressable>
        {file ? <Text style={styles.fileName}>{file.name}</Text> : null}

        <Pressable style={styles.uploadBtn} onPress={upload} disabled={uploading}>
          {uploading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.uploadText}>Publicar catálogo</Text>}
        </Pressable>

        <Text style={styles.hint}>
          Al publicar, la versión anterior se desactiva. El inventario en la app se actualiza en tiempo real por separado.
        </Text>
      </View>
      <RenaceFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.md, flex: 1 },
  label: { ...typography.caption, marginBottom: spacing.xs },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  pickBtn: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  pickBtnText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  fileName: { ...typography.caption, marginTop: spacing.sm, textAlign: 'center' },
  uploadBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  uploadText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { ...typography.caption, marginTop: spacing.md, textAlign: 'center' },
});
