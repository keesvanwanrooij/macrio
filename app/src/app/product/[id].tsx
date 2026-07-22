/*
 * SECTION: Product page
 * WHAT: Current version, allergens, version likes, suggest edit, report.
 * HOW: load versions + product meta; report uses a Modal (Android Alert max 3 buttons).
 * INPUT: route product id; session for likes/reports
 * OUTPUT: like/report rows; navigate to create / add-barcode (add or edit)
 */
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { AllergenStateChip } from '../../components/AllergenBadges';
import { Button, Card, Loading, SectionTitle } from '../../components/ui';
import { EU_ALLERGENS } from '../../lib/allergens';
import { fmt, versionName } from '../../lib/nutrition';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../lib/theme';
import type { AllergenState, ProductVersion } from '../../lib/types';

const REPORT_REASONS = ['wrong_macros', 'wrong_allergens', 'spam', 'duplicate', 'other'] as const;
type ReportReason = (typeof REPORT_REASONS)[number];
const REASON_KEYS: Record<ReportReason, string> = {
  wrong_macros: 'product.reportWrongMacros',
  wrong_allergens: 'product.reportWrongAllergens',
  spam: 'product.reportSpam',
  duplicate: 'product.reportDuplicate',
  other: 'product.reportOther',
};

export default function ProductPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { session, profile } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [versions, setVersions] = useState<ProductVersion[] | null>(null);
  const [current, setCurrent] = useState<ProductVersion | null>(null);
  const [source, setSource] = useState<string>('community');
  const [barcode, setBarcode] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [productCreatedBy, setProductCreatedBy] = useState<string | null>(null);
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: vs }, { data: prod }] = await Promise.all([
      supabase
        .from('product_versions')
        .select('*')
        .eq('product_id', id)
        .order('like_count', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('products').select('source, barcode, visibility, created_by').eq('id', id).single(),
    ]);
    const list = (vs as ProductVersion[]) ?? [];
    setVersions(list);
    setCurrent(list[0] ?? null);
    if (prod) {
      setSource(prod.source);
      setBarcode(prod.barcode);
      setVisibility((prod.visibility as 'public' | 'private') ?? 'public');
      setProductCreatedBy(prod.created_by ?? null);
    }
    if (session && list.length > 0) {
      const { data: likes } = await supabase
        .from('version_likes')
        .select('version_id')
        .eq('user_id', session.user.id)
        .in('version_id', list.map((v) => v.id));
      setMyLikes(new Set((likes ?? []).map((l) => l.version_id)));
    }
  }, [id, session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function toggleVisibility() {
    if (!session || productCreatedBy !== session.user.id || visibilityBusy) return;
    const next = visibility === 'public' ? 'private' : 'public';
    setVisibilityBusy(true);
    try {
      const { error } = await supabase.rpc('set_product_visibility', {
        p_product_id: id,
        p_visibility: next,
      });
      if (error) Alert.alert(t('common.error'), friendlyVisError(error.message, t));
      else setVisibility(next);
    } finally {
      setVisibilityBusy(false);
    }
  }

  async function toggleLike(version: ProductVersion) {
    if (!session) return;
    const liked = myLikes.has(version.id);
    // Optimistic UI
    const nextLikes = new Set(myLikes);
    if (liked) nextLikes.delete(version.id);
    else nextLikes.add(version.id);
    setMyLikes(nextLikes);
    if (liked) {
      await supabase.from('version_likes').delete().eq('user_id', session.user.id).eq('version_id', version.id);
    } else {
      await supabase.from('version_likes').insert({ user_id: session.user.id, version_id: version.id });
    }
    load();
  }

  async function submitReport(reason: ReportReason) {
    if (!session || !current || reportBusy) return;
    setReportBusy(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: session.user.id,
        version_id: current.id,
        reason,
      });
      setReportOpen(false);
      if (error) Alert.alert(t('common.error'), error.message);
      else Alert.alert(t('product.reportThanks'));
    } finally {
      setReportBusy(false);
    }
  }

  if (!current || versions === null) return <Loading />;

  const userAllergens = profile?.allergens ?? [];
  const sortedAllergens = [
    ...userAllergens.filter((k) => (EU_ALLERGENS as readonly string[]).includes(k)),
    ...EU_ALLERGENS.filter((k) => !userAllergens.includes(k)),
  ];
  const sourceKey =
    source === 'openfoodfacts' ? 'product.sourceOff' : source === 'seed' ? 'product.sourceSeed' : 'product.sourceCommunity';
  const isOwner = !!session && productCreatedBy === session.user.id;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: spacing.xxl }}>
        <View style={{ flexDirection: 'row', gap: spacing.l }}>
          {current.photo_url ? (
            <Image source={{ uri: current.photo_url }} style={styles.photo} />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{versionName(current, i18n.language)}</Text>
            {current.brand ? <Text style={styles.brand}>{current.brand}</Text> : null}
            <Text style={styles.source}>
              {t('product.source')}: {t(sourceKey)}
              {barcode ? ` · ${barcode}` : ''}
            </Text>
            <Text style={styles.visibilityBadge}>
              {visibility === 'private' ? t('product.visibilityPrivate') : t('product.visibilityPublic')}
            </Text>
            <View style={styles.actionRow}>
              {isOwner ? (
                <Pressable style={styles.addBarcodeBtn} onPress={toggleVisibility} disabled={visibilityBusy}>
                  <Text style={styles.addBarcodeText}>
                    {visibility === 'private' ? t('product.makePublic') : t('product.makePrivate')}
                  </Text>
                </Pressable>
              ) : null}
              {!barcode ? (
                <Pressable
                  style={styles.addBarcodeBtn}
                  onPress={() =>
                    router.push({ pathname: '/product/add-barcode', params: { productId: id } })
                  }
                >
                  <Text style={styles.addBarcodeText}>{t('product.addBarcode')}</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.addBarcodeBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/product/add-barcode',
                      params: { productId: id, mode: 'edit', currentBarcode: barcode },
                    })
                  }
                >
                  <Text style={styles.addBarcodeText}>{t('product.editBarcode')}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <SectionTitle>{t('product.per100g')}</SectionTitle>
        <Card>
          <View style={styles.macroRow}>
            <MacroCell label={t('macros.kcalShort')} value={fmt(current.kcal_100g)} highlight />
            <MacroCell label={t('macros.carbsShort')} value={`${fmt(current.carbs_100g, 1)} g`} />
            <MacroCell label={t('macros.proteinShort')} value={`${fmt(current.protein_100g, 1)} g`} />
            <MacroCell label={t('macros.fatShort')} value={`${fmt(current.fat_100g, 1)} g`} />
          </View>
          {current.portions.map((p, i) => (
            <Text key={i} style={styles.portionLine}>
              {t('product.perPortion', { name: `${p.name} (${fmt(p.grams)} g)` })}:{' '}
              {fmt((current.kcal_100g * p.grams) / 100)} {t('common.kcal')}
            </Text>
          ))}
        </Card>

        <SectionTitle>{t('settings.myAllergens')}</SectionTitle>
        <Card>
          <View style={styles.allergenInlineWrap}>
            {sortedAllergens.map((key) => {
              const state: AllergenState = current.allergens?.[key] ?? 'unknown';
              return (
                <AllergenStateChip key={key} allergenKey={key} state={state} size="compact" />
              );
            })}
          </View>
        </Card>

        <SectionTitle>
          {t('product.versions')} ({versions.length})
        </SectionTitle>
        <Card>
          {versions.map((v) => (
            <View key={v.id} style={styles.versionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.versionTitle}>
                  {t('product.version')} {v.version_number}
                  {v.id === current.id ? ' ✓' : ''}
                </Text>
                <Text style={styles.versionMeta}>
                  {fmt(v.kcal_100g)} {t('common.kcal')} · {t('macros.carbsShort')} {fmt(v.carbs_100g, 1)} · {t('macros.proteinShort')} {fmt(v.protein_100g, 1)} · {t('macros.fatShort')} {fmt(v.fat_100g, 1)}
                </Text>
              </View>
              <Pressable style={styles.likeBtn} onPress={() => toggleLike(v)}>
                <Text style={{ color: myLikes.has(v.id) ? colors.danger : colors.faint, fontSize: 16 }}>
                  {myLikes.has(v.id) ? '♥' : '♡'} {v.like_count}
                </Text>
              </Pressable>
            </View>
          ))}
        </Card>

        <View style={{ height: spacing.l }} />
        <Button
          title={t('product.suggestEdit')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/product/create', params: { editProductId: id } })}
        />
        <View style={{ height: spacing.s }} />
        <Button title={`⚑ ${t('product.report')}`} variant="ghost" onPress={() => setReportOpen(true)} />

        <Text style={styles.disclaimer}>ⓘ {t('allergens.disclaimer')}</Text>
      </ScrollView>

      {/* Android Alert only shows ~3 buttons; use a modal so Cancel + all reasons work */}
      <Modal
        visible={reportOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReportOpen(false)}
      >
        <Pressable style={styles.reportBackdrop} onPress={() => setReportOpen(false)}>
          <Pressable style={styles.reportSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.reportTitle}>{t('product.reportTitle')}</Text>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                style={styles.reportOption}
                disabled={reportBusy}
                onPress={() => submitReport(reason)}
              >
                <Text style={styles.reportOptionText}>{t(REASON_KEYS[reason])}</Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.reportOption, styles.reportCancel]}
              onPress={() => setReportOpen(false)}
              disabled={reportBusy}
            >
              <Text style={styles.reportCancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MacroCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[styles.macroValue, highlight && { color: colors.primaryDark }]}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function friendlyVisError(raw: string, t: (k: string) => string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('already used')) return t('product.barcodeTaken');
  if (lower.includes('not product owner')) return t('product.visibilityOwnerOnly');
  return raw;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  photo: { width: 84, height: 84, borderRadius: radius.m, backgroundColor: colors.border },
  name: { fontSize: 22, fontWeight: '900', color: colors.text },
  brand: { fontSize: 15, color: colors.muted, marginTop: 2 },
  source: { fontSize: 12, color: colors.faint, marginTop: 4 },
  visibilityBadge: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 6, marginBottom: 0 },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginTop: 4,
  },
  addBarcodeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.s,
    backgroundColor: '#F1F5F9',
  },
  addBarcodeText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  macroRow: { flexDirection: 'row', marginBottom: spacing.s },
  macroValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  macroLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  portionLine: { fontSize: 13, color: colors.muted, marginTop: 4 },
  allergenInlineWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    alignItems: 'center',
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  versionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  versionMeta: { fontSize: 12, color: colors.faint, marginTop: 1 },
  likeBtn: { padding: spacing.s },
  disclaimer: { fontSize: 12, color: colors.faint, marginTop: spacing.xl, lineHeight: 17, textAlign: 'center' },
  reportBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  reportSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.l,
    borderTopRightRadius: radius.l,
    padding: spacing.l,
    paddingBottom: spacing.xxl,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.m,
    textAlign: 'center',
  },
  reportOption: {
    paddingVertical: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  reportOptionText: { fontSize: 16, color: colors.text, textAlign: 'center', fontWeight: '600' },
  reportCancel: { borderBottomWidth: 0, marginTop: spacing.s },
  reportCancelText: { fontSize: 16, color: colors.muted, textAlign: 'center', fontWeight: '700' },
});
