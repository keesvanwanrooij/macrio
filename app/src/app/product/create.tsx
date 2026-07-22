/*
 * SECTION: Create product or suggest new version
 * WHAT: New product (+ optional barcode) or new version of an existing product.
 * HOW: form → photo upload → create_product_full | create_product_version
 *      (+ set_product_barcode when attaching a code to a product that had none)
 * INPUT: route barcode?, editProductId?, slot?, date?; session
 * OUTPUT: version id → log-entry (new) or back (edit)
 */
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { stateColor } from '../../components/AllergenBadges';
import { Button, Field } from '../../components/ui';
import { EU_ALLERGENS } from '../../lib/allergens';
import { digitsOnly, validateRetailBarcode, barcodeErrorKey } from '../../lib/barcode';
import { parseNum } from '../../lib/nutrition';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../lib/theme';
import type { AllergenState, ProductVersion } from '../../lib/types';

const CYCLE: AllergenState[] = ['unknown', 'contains', 'free'];

export default function CreateProduct() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    barcode?: string;
    name?: string;
    slot?: string;
    date?: string;
    editProductId?: string; // set → creates a new version of that product
  }>();
  const isNewVersion = !!params.editProductId;
  const lockedBarcode = params.barcode?.trim() || '';

  const [name, setName] = useState(params.name ?? '');
  const [brand, setBrand] = useState('');
  const [barcodeInput, setBarcodeInput] = useState(lockedBarcode);
  const [existingBarcode, setExistingBarcode] = useState<string | null>(null);
  const [kcal, setKcal] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [portionName, setPortionName] = useState('1 portie');
  const [portionGrams, setPortionGrams] = useState('100');
  const [allergens, setAllergens] = useState<Record<string, AllergenState>>({});
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [busy, setBusy] = useState(false);
  /** Keep local = private; default public (shared with community). */
  const [keepPrivate, setKeepPrivate] = useState(false);

  // Prefill when suggesting a new version of an existing product.
  useEffect(() => {
    if (!params.editProductId) return;
    (async () => {
      const [{ data }, { data: prod }] = await Promise.all([
        supabase
          .from('current_product_versions')
          .select('*')
          .eq('product_id', params.editProductId)
          .maybeSingle(),
        supabase.from('products').select('barcode').eq('id', params.editProductId).maybeSingle(),
      ]);
      if (data) {
        const v = data as ProductVersion;
        setName((i18n.language === 'nl' ? v.name_nl : v.name_en) ?? v.name_nl ?? v.name_en ?? '');
        setBrand(v.brand ?? '');
        setKcal(String(v.kcal_100g));
        setCarbs(String(v.carbs_100g));
        setProtein(String(v.protein_100g));
        setFat(String(v.fat_100g));
        setAllergens(v.allergens ?? {});
        if (v.portions[0]) {
          setPortionName(v.portions[0].name);
          setPortionGrams(String(v.portions[0].grams));
        }
      }
      const code = prod?.barcode?.trim() || null;
      setExistingBarcode(code);
      if (code) setBarcodeInput(code);
    })();
  }, [params.editProductId, i18n.language]);

  const canEditBarcode = !lockedBarcode && (!isNewVersion || !existingBarcode);

  async function attachBarcodeIfNeeded(productId: string, code: string) {
    const v = validateRetailBarcode(code);
    if (!v.ok) return;
    if (isNewVersion && existingBarcode) return;
    const { error } = await supabase.rpc('set_product_barcode', {
      p_product_id: productId,
      p_barcode: v.ean13,
    });
    if (error) throw error;
  }

  function cycleAllergen(key: string) {
    setAllergens((cur) => {
      const state = cur[key] ?? 'unknown';
      const next = CYCLE[(CYCLE.indexOf(state) + 1) % CYCLE.length];
      const copy = { ...cur };
      if (next === 'unknown') delete copy[key];
      else copy[key] = next;
      return copy;
    });
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setPhoto({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
    }
  }

  async function save() {
    setBusy(true);
    try {
      let photoUrl: string | null = null;
      if (photo) {
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error: upErr } = await supabase.storage
          .from('product-photos')
          .upload(path, decode(photo.base64), { contentType: 'image/jpeg' });
        if (!upErr) {
          photoUrl = supabase.storage.from('product-photos').getPublicUrl(path).data.publicUrl;
        }
      }

      const portions =
        parseNum(portionGrams) > 0 && portionName.trim()
          ? [{ name: portionName.trim(), grams: parseNum(portionGrams) }]
          : [];

      const common = {
        p_name_nl: i18n.language === 'nl' ? name.trim() : name.trim(),
        p_name_en: name.trim(),
        p_brand: brand.trim() || null,
        p_photo_url: photoUrl,
        p_kcal: parseNum(kcal),
        p_carbs: parseNum(carbs),
        p_protein: parseNum(protein),
        p_fat: parseNum(fat),
        p_allergens: allergens,
        p_portions: portions,
      };

      if (isNewVersion) {
        const { error } = await supabase.rpc('create_product_version', {
          p_product_id: params.editProductId,
          ...common,
        });
        if (error) throw error;
        // Attach barcode later if the product still has none
        if (canEditBarcode && barcodeInput.trim()) {
          const v = validateRetailBarcode(barcodeInput);
          if (!v.ok) {
            Alert.alert(t('common.error'), t(`product.${barcodeErrorKey(v.reason)}`));
            return;
          }
          await attachBarcodeIfNeeded(params.editProductId!, barcodeInput);
        }
        router.back();
        return;
      }

      const rawBarcode = (lockedBarcode || barcodeInput).trim();
      let barcodeForCreate: string | null = null;
      if (rawBarcode) {
        const v = validateRetailBarcode(rawBarcode);
        if (!v.ok) {
          Alert.alert(t('common.error'), t(`product.${barcodeErrorKey(v.reason)}`));
          return;
        }
        barcodeForCreate = v.ean13;
      }
      const { data, error } = await supabase.rpc('create_product_full', {
        p_barcode: barcodeForCreate,
        p_source: 'community',
        p_is_generic: false,
        ...common,
        p_visibility: keepPrivate ? 'private' : 'public',
      });
      if (error) throw error;
      const versionId = data as string;

      // Straight to the portion screen so creating = logging in one flow.
      router.replace({
        pathname: '/log-entry',
        params: { versionId, slot: params.slot ?? '0', date: params.date },
      });
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const valid = name.trim().length > 0 && parseNum(kcal) >= 0 && kcal.trim() !== '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.l, paddingBottom: spacing.xxl }}>
      {isNewVersion && <Text style={styles.editBanner}>{t('product.editTitle')}</Text>}

      {!isNewVersion ? (
        <View style={styles.shareBox}>
          <Text style={styles.shareCopy}>{t('product.sharedWithEveryone')}</Text>
          <Pressable
            style={styles.checkRow}
            onPress={() => setKeepPrivate((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: keepPrivate }}
          >
            <View style={[styles.checkbox, keepPrivate && styles.checkboxOn]}>
              {keepPrivate ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>{t('product.keepPrivate')}</Text>
          </Pressable>
        </View>
      ) : null}

      <Field label={`${t('product.name')} *`} value={name} onChangeText={setName} />
      <Field label={t('product.brand')} value={brand} onChangeText={setBrand} />

      {lockedBarcode ? (
        <Text style={styles.barcode}>
          {t('product.barcode')}: {lockedBarcode}
        </Text>
      ) : existingBarcode ? (
        <Text style={styles.barcode}>
          {t('product.barcode')}: {existingBarcode}
        </Text>
      ) : canEditBarcode ? (
        <View>
          <Field
            label={t('product.barcodeOptional')}
            value={barcodeInput}
            onChangeText={(text) => setBarcodeInput(digitsOnly(text).slice(0, 13))}
            keyboardType="number-pad"
            maxLength={13}
            placeholder={t('product.barcodePlaceholderShort')}
          />
          {isNewVersion ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/product/add-barcode',
                  params: { productId: params.editProductId! },
                })
              }
            >
              <Text style={styles.scanLink}>{t('product.barcodeScanInstead')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.section}>{t('product.per100g')} *</Text>
      <View style={styles.macroGrid}>
        <View style={styles.macroCell}>
          <Field label={t('macros.kcalShort')} value={kcal} onChangeText={setKcal} keyboardType="numeric" />
        </View>
        <View style={styles.macroCell}>
          <Field label={`${t('macros.carbsShort')} (g)`} value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
        </View>
        <View style={styles.macroCell}>
          <Field label={`${t('macros.proteinShort')} (g)`} value={protein} onChangeText={setProtein} keyboardType="numeric" />
        </View>
        <View style={styles.macroCell}>
          <Field label={`${t('macros.fatShort')} (g)`} value={fat} onChangeText={setFat} keyboardType="numeric" />
        </View>
      </View>

      <Text style={styles.section}>{t('product.portionLabel')}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.m }}>
        <View style={{ flex: 2 }}>
          <Field label={t('product.portionName')} value={portionName} onChangeText={setPortionName} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label={t('product.portionGrams')} value={portionGrams} onChangeText={setPortionGrams} keyboardType="decimal-pad" />
        </View>
      </View>

      <Text style={styles.section}>{t('product.photo')}</Text>
      {photo ? (
        <Pressable onPress={pickPhoto}>
          <Image source={{ uri: photo.uri }} style={styles.photo} />
        </Pressable>
      ) : (
        <Pressable style={styles.photoPlaceholder} onPress={pickPhoto}>
          <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>{t('product.addPhoto')}</Text>
        </Pressable>
      )}

      <Text style={styles.section}>{t('product.allergensLabel')}</Text>
      <Text style={styles.hint}>{t('product.allergenHint')}</Text>
      <View style={styles.allergenWrap}>
        {EU_ALLERGENS.map((key) => {
          const state = allergens[key] ?? 'unknown';
          const c = stateColor(state);
          return (
            <Pressable
              key={key}
              style={[styles.allergenChip, { backgroundColor: c.bg }]}
              onPress={() => cycleAllergen(key)}
            >
              <Text style={{ color: c.fg, fontWeight: '600', fontSize: 13 }}>{t(`allergens.${key}`)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: spacing.l }} />
      <Button
        title={isNewVersion ? t('product.saveVersion') : t('product.saveAndLog')}
        onPress={save}
        loading={busy}
        disabled={!valid}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  editBanner: {
    backgroundColor: colors.warnSoft,
    color: colors.warn,
    fontWeight: '700',
    padding: spacing.m,
    borderRadius: radius.m,
    marginBottom: spacing.l,
    overflow: 'hidden',
  },
  shareBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.l,
    gap: spacing.m,
  },
  shareCopy: { fontSize: 14, color: colors.primaryDark, lineHeight: 20, fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: 14 },
  checkLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '600' },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  hint: { fontSize: 12, color: colors.faint, marginBottom: spacing.s },
  barcode: { color: colors.muted, marginBottom: spacing.s, fontSize: 13 },
  scanLink: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
    marginTop: -spacing.s,
    marginBottom: spacing.m,
  },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m },
  macroCell: { flexBasis: '47%', flexGrow: 1 },
  photo: { width: 120, height: 120, borderRadius: radius.m },
  photoPlaceholder: {
    height: 80,
    borderRadius: radius.m,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  allergenWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  allergenChip: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
});
