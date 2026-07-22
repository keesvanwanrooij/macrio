/*
 * SECTION: Multi-add review
 * WHAT: Review selected foods (grams editable), pick meal, then insert all diary rows.
 * HOW: 1) load versions 2) last logged grams or 100 g 3) user edits + meal ▽ 4) batch insert
 * INPUT: route versionIds (comma-separated), slot, date; session
 * OUTPUT: diary_entries; dismiss back to diary
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Loading } from '../components/ui';
import { FALLBACK_LOG_GRAMS, lastGramsByVersionIds } from '../lib/lastLoggedGrams';
import { fmt, macrosForGrams, parseNum, slotLabelKey, SNACK_AFTER, versionName } from '../lib/nutrition';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../lib/theme';
import type { ProductVersion } from '../lib/types';

type ReviewItem = {
  version: ProductVersion;
  gramsText: string;
};

/** Concrete snack slot when user picks “Tussendoortje”. */
function resolveSnackSlot(current: number): number {
  if (current === 1 || current === 3 || current === 5) return current;
  if (current === 0 || current === 2 || current === 4) return SNACK_AFTER[current];
  return 3;
}

const MEAL_OPTIONS: { kind: 'main' | 'snack'; slot?: number }[] = [
  { kind: 'main', slot: 0 },
  { kind: 'main', slot: 2 },
  { kind: 'main', slot: 4 },
  { kind: 'snack' },
];

export default function LogMulti() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const params = useLocalSearchParams<{
    versionIds?: string;
    slot?: string;
    date?: string;
  }>();

  const versionIds = useMemo(
    () =>
      (params.versionIds ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [params.versionIds]
  );

  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [mealSlot, setMealSlot] = useState(Number(params.slot ?? 0));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (versionIds.length === 0) {
      setItems([]);
      return;
    }
    (async () => {
      const [{ data: versions }, lastGrams] = await Promise.all([
        supabase.from('product_versions').select('*').in('id', versionIds),
        lastGramsByVersionIds(versionIds),
      ]);
      const byId = new Map((versions ?? []).map((v) => [v.id, v as ProductVersion]));
      // Keep selection order from the comma list
      const next: ReviewItem[] = [];
      for (const id of versionIds) {
        const v = byId.get(id);
        if (!v) continue;
        const g = lastGrams.get(id) ?? FALLBACK_LOG_GRAMS;
        next.push({ version: v, gramsText: String(g) });
      }
      setItems(next);
    })();
  }, [versionIds]);

  function setGrams(index: number, text: string) {
    setItems((prev) => {
      if (!prev) return prev;
      return prev.map((it, i) => (i === index ? { ...it, gramsText: text } : it));
    });
  }

  function removeAt(index: number) {
    setItems((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  function pickMeal(option: (typeof MEAL_OPTIONS)[number]) {
    if (option.kind === 'snack') {
      setMealSlot(resolveSnackSlot(mealSlot));
    } else if (option.slot != null) {
      setMealSlot(option.slot);
    }
    setPickerOpen(false);
  }

  async function saveAll() {
    if (!session || !items || items.length === 0) return;
    const rows = items
      .map((it) => {
        const grams = parseNum(it.gramsText);
        if (!(grams > 0)) return null;
        const macros = macrosForGrams(it.version, grams);
        return {
          user_id: session.user.id,
          date: params.date,
          meal_slot: mealSlot,
          product_version_id: it.version.id,
          custom_name: versionName(it.version, i18n.language),
          grams,
          kcal: macros.kcal,
          carbs: macros.carbs,
          protein: macros.protein,
          fat: macros.fat,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);

    if (rows.length === 0) {
      Alert.alert(t('common.error'), t('addFood.multiNeedGrams'));
      return;
    }

    setBusy(true);
    const { error } = await supabase.from('diary_entries').insert(rows);
    setBusy(false);
    if (error) {
      Alert.alert(t('common.error'), error.message);
      return;
    }
    // Close review + add-food modal → diary
    if (typeof router.dismissAll === 'function') {
      router.dismissAll();
    } else {
      router.replace('/(tabs)');
    }
  }

  if (items === null) return <Loading />;

  const count = items.length;
  const mealName = t(slotLabelKey(mealSlot));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {count === 0 ? (
          <Text style={styles.empty}>{t('addFood.multiEmpty')}</Text>
        ) : (
          items.map((it, index) => {
            const grams = parseNum(it.gramsText);
            const macros = grams > 0 ? macrosForGrams(it.version, grams) : null;
            return (
              <View key={it.version.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.name} numberOfLines={2}>
                    {versionName(it.version, i18n.language)}
                  </Text>
                  <Pressable onPress={() => removeAt(index)} hitSlop={8}>
                    <Text style={styles.remove}>✕</Text>
                  </Pressable>
                </View>
                <View style={styles.gramsRow}>
                  <Text style={styles.gramsLabel}>{t('portion.grams')}</Text>
                  <TextInput
                    style={styles.gramsInput}
                    value={it.gramsText}
                    onChangeText={(text) => setGrams(index, text)}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.gramsUnit}>g</Text>
                </View>
                {macros ? (
                  <Text style={styles.macroLine}>
                    {fmt(macros.kcal)} {t('common.kcal')} · {t('macros.carbsShort')} {fmt(macros.carbs)} ·{' '}
                    {t('macros.proteinShort')} {fmt(macros.protein)} · {t('macros.fatShort')} {fmt(macros.fat)}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.ctaRow}>
          <Pressable
            style={[styles.ctaMain, busy && { opacity: 0.6 }]}
            onPress={saveAll}
            disabled={busy || count === 0}
          >
            {busy ? (
              <Text style={styles.ctaMainText}>…</Text>
            ) : (
              <Text style={styles.ctaMainText} numberOfLines={1}>
                {t('addFood.addNToMeal', { count, meal: mealName })}
              </Text>
            )}
          </Pressable>
          <Pressable
            style={styles.ctaChevron}
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('addFood.changeMeal')}
          >
            <Text style={styles.ctaChevronText}>▽</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('addFood.pickMeal')}</Text>
            {MEAL_OPTIONS.map((opt) => {
              const label =
                opt.kind === 'snack'
                  ? t('meals.snack')
                  : t(slotLabelKey(opt.slot ?? 0));
              const active =
                opt.kind === 'snack'
                  ? mealSlot === 1 || mealSlot === 3 || mealSlot === 5
                  : mealSlot === opt.slot;
              return (
                <Pressable
                  key={label}
                  style={[styles.modalRow, active && styles.modalRowActive]}
                  onPress={() => pickMeal(opt)}
                >
                  <Text style={[styles.modalRowText, active && styles.modalRowTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.l, paddingBottom: spacing.xxl },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    marginBottom: spacing.m,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  remove: { fontSize: 18, color: colors.faint, paddingHorizontal: 4 },
  gramsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.m, gap: spacing.s },
  gramsLabel: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  gramsInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.bg,
  },
  gramsUnit: { fontSize: 14, color: colors.muted, fontWeight: '700' },
  macroLine: { marginTop: spacing.s, fontSize: 12, color: colors.faint },
  footer: {
    padding: spacing.l,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  ctaRow: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.s },
  ctaMain: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.m,
    paddingVertical: 14,
    paddingHorizontal: spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaMainText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  ctaChevron: {
    width: 52,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaChevronText: { fontSize: 16, color: colors.muted, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.l,
    borderTopRightRadius: radius.l,
    padding: spacing.l,
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.muted,
    marginBottom: spacing.m,
    textAlign: 'center',
  },
  modalRow: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    borderRadius: radius.m,
  },
  modalRowActive: { backgroundColor: colors.primarySoft },
  modalRowText: { fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'center' },
  modalRowTextActive: { fontWeight: '800', color: colors.primaryDark },
});
