/*
 * SECTION: Log / edit diary portion
 * WHAT: Pick a named portion (with optional fractional count) or raw grams, then save macros.
 * HOW: 1) load version (+ entry if edit) 2) new log: prefer last logged grams for this version
 *      3) else first named portion / 100 g 4) macrosForGrams → insert/update diary_entries
 * INPUT: route versionId | entryId, meal slot, date; session
 * OUTPUT: diary row; navigate back
 *
 * Fractional counts: stepper uses 0.5 steps (½ pack); count field accepts 0.25 etc.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AllergenWarning } from '../components/AllergenBadges';
import { Button, Chip, Field, Loading } from '../components/ui';
import { FALLBACK_LOG_GRAMS, lastGramsByVersionIds } from '../lib/lastLoggedGrams';
import { fmt, macrosForGrams, parseNum, slotLabelKey, versionName } from '../lib/nutrition';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../lib/theme';
import type { DiaryEntry, ProductVersion } from '../lib/types';

/** Half-portion steps for packs (e.g. 0.5 × 600 g ovenschotel). Typed counts may be finer. */
const COUNT_STEP = 0.5;
const COUNT_MIN_TYPED = 0.01;

function roundCount(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtAmount(n: number): string {
  const digits = Math.abs(n % 1) < 1e-9 ? 0 : 1;
  return fmt(n, digits);
}

export default function LogEntry() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { session, profile } = useSession();
  const params = useLocalSearchParams<{
    versionId?: string;
    slot?: string;
    date?: string;
    entryId?: string;
  }>();

  const [version, setVersion] = useState<ProductVersion | null>(null);
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [portionIdx, setPortionIdx] = useState<number | null>(null); // null = raw grams
  const [count, setCount] = useState(1);
  const [countText, setCountText] = useState('1');
  const [gramsText, setGramsText] = useState(String(FALLBACK_LOG_GRAMS));
  const [busy, setBusy] = useState(false);

  function applyCount(n: number, fromStepper = false) {
    const min = fromStepper ? COUNT_STEP : COUNT_MIN_TYPED;
    const next = roundCount(Math.max(min, n));
    setCount(next);
    setCountText(String(next).replace('.', ','));
  }

  const isEdit = !!params.entryId;

  useEffect(() => {
    (async () => {
      let versionId = params.versionId;
      if (params.entryId) {
        const { data: e } = await supabase.from('diary_entries').select('*').eq('id', params.entryId).single();
        if (e) {
          setEntry(e as DiaryEntry);
          setGramsText(String(e.grams ?? FALLBACK_LOG_GRAMS));
          setPortionIdx(null);
          versionId = e.product_version_id ?? undefined;
        }
      }
      if (versionId) {
        const { data: v } = await supabase.from('product_versions').select('*').eq('id', versionId).single();
        if (v) {
          const pv = v as ProductVersion;
          setVersion(pv);
          // New log (not edit): restore last grams for this version (Recents / Search / Scan)
          if (!params.entryId) {
            const lastMap = await lastGramsByVersionIds([versionId]);
            const last = lastMap.get(versionId);
            if (last != null && last > 0) {
              // Prefer matching named portion when grams equal a defined portion
              const matchIdx = pv.portions.findIndex((p) => Math.abs(p.grams - last) < 0.05);
              if (matchIdx >= 0) {
                setPortionIdx(matchIdx);
                setCount(1);
                setCountText('1');
                setGramsText(String(pv.portions[matchIdx].grams));
              } else {
                setPortionIdx(null);
                setGramsText(String(last));
              }
            } else if (pv.portions.length > 0) {
              setPortionIdx(0);
              setGramsText(String(pv.portions[0].grams));
            } else {
              setPortionIdx(null);
              setGramsText(String(FALLBACK_LOG_GRAMS));
            }
          }
        }
      }
    })();
  }, [params.versionId, params.entryId]);

  const grams = useMemo(() => {
    if (portionIdx !== null && version && version.portions[portionIdx]) {
      return version.portions[portionIdx].grams * count;
    }
    return parseNum(gramsText);
  }, [portionIdx, count, gramsText, version]);

  const macros = useMemo(
    () => (version ? macrosForGrams(version, grams) : null),
    [version, grams]
  );

  async function save() {
    if (!session || !version || !macros || grams <= 0) return;
    setBusy(true);
    const name = versionName(version, i18n.language);
    if (isEdit && entry) {
      await supabase
        .from('diary_entries')
        .update({ grams, kcal: macros.kcal, carbs: macros.carbs, protein: macros.protein, fat: macros.fat })
        .eq('id', entry.id);
    } else {
      await supabase.from('diary_entries').insert({
        user_id: session.user.id,
        date: params.date,
        meal_slot: Number(params.slot ?? 0),
        product_version_id: version.id,
        custom_name: name,
        grams,
        kcal: macros.kcal,
        carbs: macros.carbs,
        protein: macros.protein,
        fat: macros.fat,
      });
    }
    setBusy(false);
    router.back();
  }

  async function removeEntry() {
    if (!entry) return;
    Alert.alert(t('diary.deleteEntry'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('diary_entries').delete().eq('id', entry.id);
          router.back();
        },
      },
    ]);
  }

  if (!version || !macros) return <Loading />;

  const mealLabel = t(slotLabelKey(Number(params.slot ?? entry?.meal_slot ?? 0)));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.l }}>
      <Text style={styles.name}>{versionName(version, i18n.language)}</Text>
      {version.brand ? <Text style={styles.brand}>{version.brand}</Text> : null}

      <AllergenWarning allergens={version.allergens} userAllergens={profile?.allergens ?? []} />

      <View style={styles.portionChips}>
        {version.portions.map((p, i) => (
          <Chip
            key={i}
            label={`${p.name} (${fmt(p.grams)} g)`}
            active={portionIdx === i}
            onPress={() => {
              setPortionIdx(i);
              applyCount(1);
            }}
          />
        ))}
        <Chip label={t('portion.grams')} active={portionIdx === null} onPress={() => setPortionIdx(null)} />
      </View>

      {portionIdx !== null ? (
        <View>
          <View style={styles.stepper}>
            {/* Step by half portions; type a finer fraction in the field below if needed */}
            <Pressable
              style={styles.stepBtn}
              onPress={() => applyCount(count - COUNT_STEP, true)}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </Pressable>
            <Text style={styles.stepValue}>{fmtAmount(count)}</Text>
            <Pressable style={styles.stepBtn} onPress={() => applyCount(count + COUNT_STEP, true)}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
            <Text style={styles.stepGrams}>= {fmtAmount(grams)} g</Text>
          </View>
          <Field
            label={t('portion.count')}
            value={countText}
            onChangeText={(s) => {
              setCountText(s);
              const n = parseNum(s);
              if (n >= COUNT_MIN_TYPED) setCount(roundCount(n));
            }}
            onBlur={() => {
              const n = parseNum(countText);
              applyCount(n > 0 ? n : COUNT_STEP);
            }}
            keyboardType="decimal-pad"
          />
        </View>
      ) : (
        <Field
          label={t('portion.grams')}
          value={gramsText}
          onChangeText={setGramsText}
          keyboardType="decimal-pad"
        />
      )}

      <View style={styles.macroPreview}>
        <Text style={styles.previewKcal}>
          {fmt(macros.kcal)} {t('common.kcal')}
        </Text>
        <Text style={styles.previewRest}>
          {t('macros.carbsShort')} {fmt(macros.carbs, 1)} · {t('macros.proteinShort')} {fmt(macros.protein, 1)} · {t('macros.fatShort')} {fmt(macros.fat, 1)}
        </Text>
      </View>

      <Button
        title={isEdit ? t('portion.saveChanges') : t('portion.addTo', { meal: mealLabel })}
        onPress={save}
        loading={busy}
        disabled={grams <= 0}
      />

      <Text style={styles.link} onPress={() => router.push({ pathname: '/product/[id]', params: { id: version.product_id } })}>
        {t('portion.viewProduct')}
      </Text>

      {isEdit && (
        <Text style={[styles.link, { color: colors.danger }]} onPress={removeEntry}>
          {t('common.delete')}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  name: { fontSize: 24, fontWeight: '900', color: colors.text },
  brand: { fontSize: 15, color: colors.muted, marginTop: 2 },
  portionChips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.l },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.l, marginBottom: spacing.m },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.m,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 24, color: colors.primaryDark, fontWeight: '700' },
  stepValue: { fontSize: 22, fontWeight: '800', color: colors.text, minWidth: 30, textAlign: 'center' },
  stepGrams: { fontSize: 15, color: colors.muted },
  macroPreview: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    alignItems: 'center',
    marginVertical: spacing.l,
  },
  previewKcal: { fontSize: 30, fontWeight: '900', color: colors.primaryDark },
  previewRest: { fontSize: 14, color: colors.muted, marginTop: 4 },
  link: { color: colors.primaryDark, fontWeight: '700', textAlign: 'center', marginTop: spacing.xl },
});
