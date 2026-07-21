/*
 * SECTION: Add or edit product barcode
 * WHAT: Type or scan a barcode onto a product (add when empty, or replace / clear).
 * HOW: 1) type Field or BarcodeScannerFrame (double-read) 2) validateRetailBarcode (check digit)
 *      3) set_product_barcode | update_product_barcode | clear_product_barcode
 * INPUT: route productId; optional mode=edit; optional currentBarcode
 * OUTPUT: products.barcode updated; navigate back
 */
import { useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BarcodeScannerFrame } from '../../components/BarcodeScannerFrame';
import { Button, Field } from '../../components/ui';
import {
  barcodeErrorKey,
  digitsOnly,
  validateRetailBarcode,
} from '../../lib/barcode';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../lib/theme';

export default function AddBarcodeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { productId, mode, currentBarcode } = useLocalSearchParams<{
    productId: string;
    mode?: string;
    currentBarcode?: string;
  }>();
  const isEdit = mode === 'edit';

  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<'type' | 'scan'>('type');
  const [code, setCode] = useState(currentBarcode?.trim() ?? '');
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? t('product.editBarcodeTitle') : t('product.addBarcodeTitle'),
    });
  }, [navigation, isEdit, t]);

  useEffect(() => {
    if (currentBarcode?.trim()) setCode(currentBarcode.trim());
  }, [currentBarcode]);

  const validation = useMemo(() => validateRetailBarcode(code), [code]);
  const showInlineError = digitsOnly(code).length > 0 && !validation.ok;

  async function save(barcode: string) {
    const v = validateRetailBarcode(barcode);
    if (!productId || !v.ok) {
      Alert.alert(
        t('common.error'),
        t(`product.${barcodeErrorKey(v.ok ? 'empty' : v.reason)}`)
      );
      return;
    }
    setBusy(true);
    try {
      const rpc = isEdit ? 'update_product_barcode' : 'set_product_barcode';
      const { error } = await supabase.rpc(rpc, {
        p_product_id: productId,
        p_barcode: v.ean13,
      });
      if (error) throw error;
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('common.error'), friendlyBarcodeError(msg, t));
    } finally {
      setBusy(false);
    }
  }

  function onCodeChange(text: string) {
    // Digits only; cap at 13 so users type EAN-13 / UPC-A, not logistics strings
    setCode(digitsOnly(text).slice(0, 13));
  }

  function confirmClear() {
    Alert.alert(t('product.deleteBarcodeTitle'), t('product.deleteBarcodeConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('product.deleteBarcode'),
        style: 'destructive',
        onPress: () => void clearBarcode(),
      },
    ]);
  }

  async function clearBarcode() {
    if (!productId) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('clear_product_barcode', {
        p_product_id: productId,
      });
      if (error) throw error;
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('common.error'), msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, scanMode === 'type' && styles.modeChipActive]}
          onPress={() => setScanMode('type')}
        >
          <Text style={[styles.modeText, scanMode === 'type' && styles.modeTextActive]}>
            {t('product.barcodeType')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, scanMode === 'scan' && styles.modeChipActive]}
          onPress={() => setScanMode('scan')}
        >
          <Text style={[styles.modeText, scanMode === 'scan' && styles.modeTextActive]}>
            {t('product.barcodeScan')}
          </Text>
        </Pressable>
      </View>

      {scanMode === 'type' ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.hint}>
            {isEdit ? t('product.editBarcodeHint') : t('product.addBarcodeHint')}
          </Text>

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>{t('product.barcodeHelpTitle')}</Text>
            <Text style={styles.helpLine}>{t('product.barcodeHelpEan13')}</Text>
            <Text style={styles.helpLine}>{t('product.barcodeHelpUpc')}</Text>
            <Text style={styles.helpLine}>{t('product.barcodeHelpGs1128')}</Text>
          </View>

          <Field
            label={t('product.barcode')}
            value={code}
            onChangeText={onCodeChange}
            keyboardType="number-pad"
            maxLength={13}
            autoFocus
            placeholder={t('product.barcodePlaceholderShort')}
          />
          {showInlineError && !validation.ok ? (
            <Text style={styles.inlineError}>{t(`product.${barcodeErrorKey(validation.reason)}`)}</Text>
          ) : validation.ok ? (
            <Text style={styles.inlineOk}>{t('product.barcodeLooksValid', { code: validation.ean13 })}</Text>
          ) : null}

          <Button
            title={t('product.saveBarcode')}
            onPress={() => save(code)}
            loading={busy}
            disabled={!validation.ok}
          />
          {isEdit ? (
            <>
              <View style={{ height: spacing.m }} />
              <Button
                title={t('product.deleteBarcode')}
                variant="ghost"
                onPress={confirmClear}
                disabled={busy}
              />
            </>
          ) : null}
        </ScrollView>
      ) : !permission?.granted ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>{t('addFood.cameraPermission')}</Text>
          <Button title={t('addFood.grantPermission')} onPress={requestPermission} />
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <BarcodeScannerFrame onConfirmed={(data) => void save(data)} enabled={!busy} />
          {busy ? <Text style={styles.saving}>{t('common.loading')}</Text> : null}
          {isEdit ? (
            <View style={styles.deleteOverlay}>
              <Button
                title={t('product.deleteBarcode')}
                variant="secondary"
                onPress={confirmClear}
                disabled={busy}
              />
            </View>
          ) : null}
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
  hint: { fontSize: 15, color: colors.muted, lineHeight: 21, marginBottom: spacing.m },
  helpBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.l,
    gap: spacing.s,
  },
  helpTitle: { fontWeight: '800', color: colors.text, fontSize: 14, marginBottom: 2 },
  helpLine: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  inlineError: { color: colors.danger, fontSize: 13, marginTop: -spacing.s, marginBottom: spacing.m },
  inlineOk: { color: colors.primaryDark, fontSize: 13, marginTop: -spacing.s, marginBottom: spacing.m },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.m },
  centerText: { color: colors.muted, textAlign: 'center', marginBottom: spacing.m },
  cameraWrap: {
    flex: 1,
    borderRadius: radius.l,
    overflow: 'hidden',
    backgroundColor: '#000',
    minHeight: 280,
  },
  saving: {
    position: 'absolute',
    top: spacing.m,
    alignSelf: 'center',
    color: '#fff',
    fontWeight: '700',
  },
  deleteOverlay: {
    position: 'absolute',
    left: spacing.m,
    right: spacing.m,
    bottom: spacing.m,
  },
});
