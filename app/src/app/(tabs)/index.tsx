// Diary — the home screen. Date navigation, macro summary, meal sections
// (breakfast/lunch/dinner + snack slots between and after).
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MacroSummary } from '../../components/MacroSummary';
import { AllergenStateChip } from '../../components/AllergenBadges';
import { Loading } from '../../components/ui';
import { diaryAllergenHits } from '../../lib/allergens';
import { type MacroKey } from '../../lib/macroLabels';
import { addDays, fmt, MAIN_SLOTS, SNACK_AFTER, slotLabelKey, sumEntries, toDateString } from '../../lib/nutrition';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../lib/theme';
import type { AllergenState, DiaryEntry } from '../../lib/types';

/** Right-side / meal-total amount for the focused macro (1A: number + unit). */
function formatFocusedAmount(value: number, key: MacroKey): string {
  if (key === 'kcal') return fmt(value);
  return `${fmt(value)} g`;
}

export default function Diary() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const { profile, updateProfile } = useSession();
  const [date, setDate] = useState(toDateString(new Date()));
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  /** version_id → allergens map for product-linked rows (diary pills). */
  const [versionAllergens, setVersionAllergens] = useState<
    Record<string, Record<string, AllergenState>>
  >({});
  /** Which macro the focus header is on (drives meal row right values). */
  const [focusMacro, setFocusMacro] = useState<MacroKey>('kcal');

  // Reports (and others) can open a specific diary day via ?date=YYYY-MM-DD
  useEffect(() => {
    const raw = typeof params.date === 'string' ? params.date : Array.isArray(params.date) ? params.date[0] : '';
    if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      setDate(raw);
    }
  }, [params.date]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('date', date)
      .order('logged_at');
    const rows = (data as DiaryEntry[]) ?? [];
    setEntries(rows);

    // Load allergen maps for product versions (contains / may_contain → pills)
    const ids = [
      ...new Set(rows.map((e) => e.product_version_id).filter((id): id is string => !!id)),
    ];
    if (ids.length === 0) {
      setVersionAllergens({});
      return;
    }
    const { data: versions } = await supabase
      .from('product_versions')
      .select('id, allergens')
      .in('id', ids);
    const map: Record<string, Record<string, AllergenState>> = {};
    for (const v of versions ?? []) {
      map[v.id as string] = (v.allergens ?? {}) as Record<string, AllergenState>;
    }
    setVersionAllergens(map);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totals = useMemo(() => sumEntries(entries ?? []), [entries]);
  const focusMode = profile?.macro_display === 'focus';

  function dateLabel(): string {
    const today = toDateString(new Date());
    if (date === today) return t('diary.today');
    if (date === addDays(today, -1)) return t('diary.yesterday');
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  function confirmDelete(entry: DiaryEntry) {
    Alert.alert(t('diary.deleteEntry'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('diary_entries').delete().eq('id', entry.id);
          if (error) {
            Alert.alert(t('common.error'), error.message);
            return;
          }
          load();
        },
      },
    ]);
  }

  function renderEntry(entry: DiaryEntry) {
    // Overview: grams · KH · Eiwit · Vet under name, kcal on the right
    // Focus: grams only under name; right side = focused macro amount
    const meta = focusMode
      ? entry.grams
        ? `${fmt(entry.grams)} g`
        : null
      : `${fmt(Number(entry.grams ?? 0))} g · ${t('macros.carbsShort')} ${fmt(entry.carbs)} g · ${t('macros.proteinShort')} ${fmt(entry.protein)} g · ${t('macros.fatShort')} ${fmt(entry.fat)} g`;

    const rightValue = focusMode
      ? formatFocusedAmount(Number(entry[focusMacro] ?? 0), focusMacro)
      : fmt(entry.kcal);

    const allergenHits = diaryAllergenHits(
      entry,
      profile?.allergens ?? [],
      entry.product_version_id ? versionAllergens[entry.product_version_id] : null
    );

    return (
      <Pressable
        key={entry.id}
        style={styles.entryRow}
        onPress={() =>
          entry.product_version_id
            ? router.push({ pathname: '/log-entry', params: { entryId: entry.id } })
            : confirmDelete(entry)
        }
        onLongPress={() => confirmDelete(entry)}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.entryTop}>
            <View style={styles.entryMain}>
              <View style={styles.entryNameRow}>
                <Text style={styles.entryName} numberOfLines={1}>
                  {entry.custom_name ?? '…'}
                </Text>
                {allergenHits.map(({ key, state }) => (
                  <AllergenStateChip key={`${key}-${state}`} allergenKey={key} state={state} size="compact" />
                ))}
              </View>
              {meta ? <Text style={styles.entryMeta}>{meta}</Text> : null}
            </View>
            {focusMode ? (
              <Text style={styles.entryKcal}>{rightValue}</Text>
            ) : (
              <View style={styles.mealFooterKcalCol}>
                <Text style={styles.entryKcal}>{rightValue}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  function renderSlot(slot: number, isSnack: boolean) {
    const slotEntries = (entries ?? []).filter((e) => e.meal_slot === slot);
    const slotTotals = sumEntries(slotEntries);
    if (isSnack && slotEntries.length === 0) {
      return (
        <Pressable
          key={slot}
          style={styles.addSnack}
          onPress={() => router.push({ pathname: '/add-food', params: { slot: String(slot), date } })}
        >
          <Text style={styles.addSnackText}>{t('meals.addSnack')}</Text>
        </Pressable>
      );
    }

    const mealGrams = slotEntries.reduce((s, e) => s + Number(e.grams ?? 0), 0);

    return (
      <View key={slot} style={styles.mealCard}>
        <Text style={styles.mealTitle}>{t(slotLabelKey(slot))}</Text>
        {slotEntries.map(renderEntry)}

        {/* Meal sum sits under foods, above add-food, so the title stays readable */}
        {slotEntries.length > 0 ? (
          <View style={styles.mealFooter}>
            {focusMode ? (
              <View style={styles.mealFooterRow}>
                <Text style={styles.mealFooterLabel}>{t('meals.total')}</Text>
                <Text style={styles.mealFooterValue}>
                  {focusMacro === 'kcal'
                    ? `${fmt(slotTotals.kcal)} ${t('common.kcal')}`
                    : `${fmt(slotTotals[focusMacro])} g`}
                </Text>
              </View>
            ) : (
              <View style={styles.entryTop}>
                <View style={styles.entryMain}>
                  <Text style={styles.mealFooterLabel}>{t('meals.total')}</Text>
                  <Text style={styles.entryMeta}>
                    {`${fmt(mealGrams)} g · ${t('macros.carbsShort')} ${fmt(slotTotals.carbs)} g · ${t('macros.proteinShort')} ${fmt(slotTotals.protein)} g · ${t('macros.fatShort')} ${fmt(slotTotals.fat)} g`}
                  </Text>
                </View>
                <View style={styles.mealFooterKcalCol}>
                  <Text style={styles.entryKcal}>{fmt(slotTotals.kcal)}</Text>
                  <Text style={styles.mealFooterKcalHint}>{t('common.kcal')}</Text>
                </View>
              </View>
            )}
          </View>
        ) : null}

        <Pressable
          style={styles.addFood}
          onPress={() => router.push({ pathname: '/add-food', params: { slot: String(slot), date } })}
        >
          <Text style={styles.addFoodText}>{t('meals.addFood')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!profile) return <Loading />;

  return (
    <View style={styles.container}>
      <View style={styles.dateNav}>
        <Pressable hitSlop={12} onPress={() => setDate(addDays(date, -1))}>
          <Ionicons name="chevron-back" size={24} color={colors.muted} />
        </Pressable>
        <Pressable onPress={() => setDate(toDateString(new Date()))}>
          <Text style={styles.dateLabel}>{dateLabel()}</Text>
        </Pressable>
        <Pressable hitSlop={12} onPress={() => setDate(addDays(date, 1))}>
          <Ionicons name="chevron-forward" size={24} color={colors.muted} />
        </Pressable>
      </View>

      {entries === null ? (
        <Loading />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
        >
          <MacroSummary
            totals={totals}
            profile={profile}
            onFocusMacroChange={setFocusMacro}
            onToggleMode={() =>
              updateProfile({
                macro_display: profile.macro_display === 'focus' ? 'overview' : 'focus',
              })
            }
          />
          <View style={{ paddingHorizontal: spacing.l, paddingBottom: spacing.xxl }}>
            {MAIN_SLOTS.map((main) => (
              <React.Fragment key={main}>
                {renderSlot(main, false)}
                {renderSlot(SNACK_AFTER[main], true)}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.m,
  },
  dateLabel: { fontSize: 17, fontWeight: '800', color: colors.text },
  mealCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    marginBottom: spacing.s,
  },
  mealTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 2 },
  mealFooter: {
    marginTop: spacing.s,
    paddingTop: spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  mealFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealFooterLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  mealFooterValue: { fontSize: 13, fontWeight: '700', color: colors.muted },
  mealFooterKcalCol: { alignItems: 'flex-end', minWidth: 44 },
  mealFooterKcalHint: { fontSize: 11, color: colors.faint, marginTop: 1, fontWeight: '600' },
  entryRow: {
    paddingVertical: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  entryTop: { flexDirection: 'row', alignItems: 'center' },
  entryMain: { flex: 1, minWidth: 0, marginRight: spacing.s },
  entryNameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  entryName: { fontSize: 15, color: colors.text, fontWeight: '600', flexShrink: 1 },
  entryMeta: { fontSize: 12, color: colors.faint, marginTop: 1 },
  entryKcal: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  addFood: { marginTop: spacing.s },
  addFoodText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  addSnack: { paddingVertical: spacing.s, paddingLeft: spacing.s, marginBottom: spacing.s },
  addSnackText: { color: colors.faint, fontWeight: '600', fontSize: 13 },
});
