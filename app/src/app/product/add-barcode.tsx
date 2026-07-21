/*
 * SECTION: Add barcode to existing product
 * WHAT: Type or scan a barcode onto a product that was created without one.
 * HOW: 1) optional CameraView scan 2) or Field type 3) RPC set_product_barcode 4) back
 * INPUT: route productId; authenticated session
 * OUTPUT: products.barcode set; navigate back to product page
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Field } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../lib/theme';

export default function AddBarcodeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'type' | 'scan'>('type');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const scanLock = useRef(false);

  async function save(barcode: string) {
    const trimmed = barcode.trim();
    if (!productId || !trimmed) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('set_product_barcode', {
        p_product_id: productId,
        p_barcode: trimmed,
      });
      if (error) throw error;
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('common.error'), friendlyBarcodeError(msg, t));
      scanLock.current = false;
    } finally {
      setBusy(false);
    }
  }

  function onScanned(data: string) {
    if (scanLock.current || busy) return;
    scanLock.current = true;
    setCode(data);
    void save(data);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>{t('product.addBarcodeHint')}</Text>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, mode === 'type' && styles.modeChipActive]}
          onPress={() => setMode('type')}
        >
          <Text style={[styles.modeText, mode === 'type' && styles.modeTextActive]}>
            {t('product.barcodeType')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, mode === 'scan' && styles.modeChipActive]}
          onPress={() => setMode('scan')}
        >
          <Text style={[styles.modeText, mode === 'scan' && styles.modeTextActive]}>
            {t('product.barcodeScan')}
          </Text>
        </Pressable>
      </View>

      {mode === 'type' ? (
        <View style={styles.typeBlock}>
          <Field
            label={t('product.barcode')}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoFocus
          />
          <Button
            title={t('product.saveBarcode')}
            onPress={() => save(code)}
            loading={busy}
            disabled={!code.trim()}
          />
        </View>
      ) : !permission?.granted ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>{t('addFood.cameraPermission')}</Text>
          <Button title={t('addFood.grantPermission')} onPress={requestPermission} />
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={({ data }) => onScanned(data)}
          />
          <View style={styles.scanHintWrap}>
            <Text style={styles.scanHint}>{t('addFood.scanHint')}</Text>
          </View>
          {busy ? <Text style={styles.saving}>{t('common.loading')}</Text> : null}
        </View>
      )}
    </View>
  );
}

function friendlyBarcodeError(raw: string, t: (k: string) => string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('already set')) return t('product.barcodeAlreadySet');
  if (lower.includes('already used')) return t('product.barcodeTaken');
  if (lower.includes('invalid')) return t('product.barcodeInvalid');
  return raw;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.l },
  hint: { fontSize: 15, color: colors.muted, lineHeight: 21, marginBottom: spacing.l },
  modeRow: { flexDirection: 'row', gap: spacing.s, marginBottom: spacing.l },
  modeChip: {
    flex: 1,
    paddingVertical: spacing.m,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  modeChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  modeText: { fontWeight: '700', color: colors.muted },
  modeTextActive: { color: colors.primaryDark },
  typeBlock: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.m },
  centerText: { color: colors.muted, textAlign: 'center', marginBottom: spacing.m },
  cameraWrap: {
    flex: 1,
    borderRadius: radius.l,
    overflow: 'hidden',
    backgroundColor: '#000',
    minHeight: 280,
  },
  scanHintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.m,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  scanHint: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  saving: {
    position: 'absolute',
    top: spacing.m,
    alignSelf: 'center',
    color: '#fff',
    fontWeight: '700',
  },
});
