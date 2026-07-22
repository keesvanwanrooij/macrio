// Add food modal: Scan | Search | Recents | Quick add.
import { useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { AllergenBadges } from '../components/AllergenBadges';
import { BarcodeScannerFrame } from '../components/BarcodeScannerFrame';
import { Button, Field } from '../components/ui';
import { lookupKeys, toEan13 } from '../lib/barcode';
import { fetchFromOpenFoodFacts } from '../lib/off';
import { fmt, parseNum, versionName } from '../lib/nutrition';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../lib/theme';
import type { ProductVersion } from '../lib/types';

type Tab = 'scan' | 'search' | 'recent' | 'quick';

export default function AddFood() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useSession();
  const params = useLocalSearchParams<{ slot: string; date: string }>();
  const slot = params.slot ?? '0';
  const date = params.date;

  const [tab, setTab] = useState<Tab>('scan');

  function openPortion(versionId: string) {
    router.replace({ pathname: '/log-entry', params: { versionId, slot, date } });
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(['scan', 'search', 'recent', 'quick'] as Tab[]).map((key) => (
          <Pressable key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{t(`addFood.${key}`)}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'scan' && <ScanTab onFound={openPortion} slot={slot} date={date} />}
      {tab === 'search' && <SearchTab onSelect={openPortion} userAllergens={profile?.allergens ?? []} slot={slot} date={date} />}
      {tab === 'recent' && <RecentsTab onSelect={openPortion} userAllergens={profile?.allergens ?? []} />}
      {tab === 'quick' && <QuickTab slot={slot} date={date} />}
    </View>
  );
}

// ---------- Scan ----------
function ScanTab({ onFound, slot, date }: { onFound: (versionId: string) => void; slot: string; date?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<'scanning' | 'looking' | 'notfound'>('scanning');
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const busyRef = useRef(false);

  const handleBarcode = useCallback(
    async (barcode: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setState('looking');
      // Canonical EAN-13 for display / create; lookup tries 12- and 13-digit forms.
      const canonical = toEan13(barcode) ?? barcode;
      const keys = lookupKeys(barcode);
      setLastBarcode(canonical);
      try {
        // 1. Our DB: prefer public community match over own private
        const { data: rows } = await supabase
          .from('current_product_versions')
          .select('*')
          .in('barcode', keys)
          .limit(10);
        const list = (rows as ProductVersion[] | null) ?? [];
        const data =
          list.find((r) => r.visibility === 'public') ??
          list[0] ??
          null;
        if (data) {
          onFound(data.id);
          return;
        }
        // 2. Live Open Food Facts import (ADR-003) with canonical 13-digit code
        const off = await fetchFromOpenFoodFacts(canonical);
        if (off) {
          const { data: versionId, error } = await supabase.rpc('create_product_full', {
            p_barcode: canonical,
            p_source: 'openfoodfacts',
            p_is_generic: false,
            p_name_nl: off.name,
            p_name_en: off.name,
            p_brand: off.brand,
            p_photo_url: off.photoUrl,
            p_kcal: off.kcal,
            p_carbs: off.carbs,
            p_protein: off.protein,
            p_fat: off.fat,
            p_allergens: off.allergens,
            p_portions: off.portions,
            p_visibility: 'public',
          });
          if (!error && versionId) {
            onFound(versionId as string);
            return;
          }
        }
        // 3. Not found anywhere → offer creation
        setState('notfound');
      } catch {
        setState('notfound');
      } finally {
        busyRef.current = false;
      }
    },
    [onFound]
  );

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>{t('addFood.cameraPermission')}</Text>
        <Button title={t('addFood.grantPermission')} onPress={requestPermission} />
      </View>
    );
  }

  if (state === 'looking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.centerText}>{t('addFood.checkingOff')}</Text>
      </View>
    );
  }

  if (state === 'notfound') {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundTitle}>{t('addFood.scanNotFound')}</Text>
        <Text style={styles.centerText}>{t('addFood.scanNotFoundBody')}</Text>
        <Button
          title={t('addFood.createProduct')}
          onPress={() =>
            router.replace({ pathname: '/product/create', params: { barcode: lastBarcode ?? '', slot, date } })
          }
        />
        <View style={{ height: spacing.m }} />
        <Button title={t('addFood.scanAgain')} variant="secondary" onPress={() => setState('scanning')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BarcodeScannerFrame onConfirmed={handleBarcode} enabled={state === 'scanning'} />
    </View>
  );
}

// ---------- Search ----------
function SearchTab({
  onSelect,
  userAllergens,
  slot,
  date,
}: {
  onSelect: (versionId: string) => void;
  userAllergens: string[];
  slot: string;
  date?: string;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductVersion[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc('search_products', { query: q });
      setResults((data as ProductVersion[]) ?? []);
      setSearched(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        style={styles.searchInput}
        placeholder={t('addFood.searchPlaceholder')}
        placeholderTextColor={colors.faint}
        value={query}
        onChangeText={setQuery}
        autoFocus
      />
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={styles.resultRow} onPress={() => onSelect(item.id)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName} numberOfLines={1}>
                {versionName(item, i18n.language)}
                {item.brand ? <Text style={styles.resultBrand}> · {item.brand}</Text> : null}
              </Text>
              <Text style={styles.resultMeta}>
                {fmt(item.kcal_100g)} {t('common.kcal')} / 100 g
              </Text>
              <AllergenBadges allergens={item.allergens} userAllergens={userAllergens} />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          searched ? (
            <View style={styles.center}>
              <Text style={styles.centerText}>{t('addFood.noResults')}</Text>
              <Button
                title={t('addFood.createProduct')}
                onPress={() =>
                  router.replace({ pathname: '/product/create', params: { name: query, slot, date } })
                }
              />
            </View>
          ) : null
        }
      />
    </View>
  );
}

// ---------- Recents (global across meals) ----------
/*
 * SECTION: Recents list
 * WHAT: Shows foods this user logged recently, for one-tap re-add.
 * HOW: 1) load own diary rows (newest first) 2) resolve product_versions
 *      3) dedupe by product_id, keeping the version from the newest log
 * INPUT: authenticated diary_entries (RLS = own rows only)
 * OUTPUT: up to 20 ProductVersion rows → onSelect(versionId)
 *
 * Why product_id (not version_id): if you later log v2 (e.g. gluten free),
 * your recents show v2. Another user who still prefers v1 keeps seeing v1.
 * Past diary rows are never rewritten (macro snapshots stay honest).
 */
function RecentsTab({
  onSelect,
  userAllergens,
}: {
  onSelect: (versionId: string) => void;
  userAllergens: string[];
}) {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<ProductVersion[] | null>(null);

  useEffect(() => {
    (async () => {
      // Pull enough rows that after per-product dedupe we still fill ~20 slots
      const { data: entries } = await supabase
        .from('diary_entries')
        .select('product_version_id, logged_at')
        .not('product_version_id', 'is', null)
        .order('logged_at', { ascending: false })
        .limit(150);

      const versionIdsOrdered: string[] = [];
      const versionIdSet = new Set<string>();
      for (const e of entries ?? []) {
        const id = e.product_version_id as string;
        if (!versionIdSet.has(id)) {
          versionIdSet.add(id);
          versionIdsOrdered.push(id);
        }
      }
      if (versionIdsOrdered.length === 0) {
        setItems([]);
        return;
      }

      const { data: versions } = await supabase
        .from('product_versions')
        .select('*')
        .in('id', versionIdsOrdered);
      const byVersionId = new Map((versions ?? []).map((v) => [v.id, v as ProductVersion]));

      // Walk diary order (newest first): first time we see a product_id wins
      const seenProducts = new Set<string>();
      const recentVersions: ProductVersion[] = [];
      for (const e of entries ?? []) {
        const versionId = e.product_version_id as string;
        const v = byVersionId.get(versionId);
        if (!v) continue;
        if (seenProducts.has(v.product_id)) continue;
        seenProducts.add(v.product_id);
        recentVersions.push(v);
        if (recentVersions.length >= 20) break;
      }
      setItems(recentVersions);
    })();
  }, []);

  if (items === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable style={styles.resultRow} onPress={() => onSelect(item.id)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.resultName} numberOfLines={1}>
              {versionName(item, i18n.language)}
              {item.brand ? <Text style={styles.resultBrand}> · {item.brand}</Text> : null}
            </Text>
            <Text style={styles.resultMeta}>
              {fmt(item.kcal_100g)} {t('common.kcal')} / 100 g
            </Text>
            <AllergenBadges allergens={item.allergens} userAllergens={userAllergens} />
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.centerText}>{t('addFood.noRecents')}</Text>
        </View>
      }
    />
  );
}

// ---------- Quick add (no product) ----------
function QuickTab({ slot, date }: { slot: string; date?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!session) return;
    setBusy(true);
    const { error } = await supabase.from('diary_entries').insert({
      user_id: session.user.id,
      date,
      meal_slot: Number(slot),
      custom_name: name.trim() || t('addFood.quick'),
      kcal: parseNum(kcal),
      carbs: parseNum(carbs),
      protein: parseNum(protein),
      fat: parseNum(fat),
    });
    setBusy(false);
    if (error) Alert.alert(t('common.error'), error.message);
    else router.back();
  }

  return (
    <View style={{ padding: spacing.l }}>
      <Text style={styles.quickHint}>{t('addFood.quickHint')}</Text>
      <Field label={t('addFood.quickName')} value={name} onChangeText={setName} />
      <Field label={t('macros.kcal')} value={kcal} onChangeText={setKcal} keyboardType="numeric" />
      <Field label={`${t('macros.carbs')} (g)`} value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
      <Field label={`${t('macros.protein')} (g)`} value={protein} onChangeText={setProtein} keyboardType="numeric" />
      <Field label={`${t('macros.fat')} (g)`} value={fat} onChangeText={setFat} keyboardType="numeric" />
      <Button title={t('common.add')} onPress={add} loading={busy} disabled={!parseNum(kcal)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', padding: spacing.s, gap: spacing.xs },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.m,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primarySoft },
  tabText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: colors.primaryDark, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.m },
  centerText: { color: colors.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
  notFoundTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    margin: spacing.l,
    marginTop: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  resultName: { fontSize: 15, fontWeight: '700', color: colors.text },
  resultBrand: { fontWeight: '400', color: colors.muted },
  resultMeta: { fontSize: 12, color: colors.faint, marginTop: 1 },
  quickHint: { color: colors.muted, marginBottom: spacing.l, fontSize: 14, lineHeight: 20 },
});
