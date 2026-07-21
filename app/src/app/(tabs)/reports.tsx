// Reports: day breakdown per meal + week bar chart with averages.
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, Loading, SectionTitle } from '../../components/ui';
import { addDays, fmt, MAIN_SLOTS, SNACK_AFTER, slotLabelKey, sumEntries, toDateString } from '../../lib/nutrition';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../lib/theme';
import type { DiaryEntry } from '../../lib/types';

export default function Reports() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [anchor, setAnchor] = useState(toDateString(new Date())); // day, or any day in the week
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);

  const weekStart = useMemo(() => {
    const d = new Date(anchor + 'T12:00:00');
    const day = (d.getDay() + 6) % 7; // Monday = 0
    return addDays(anchor, -day);
  }, [anchor]);

  const load = useCallback(async () => {
    setEntries(null);
    const from = mode === 'day' ? anchor : weekStart;
    const to = mode === 'day' ? anchor : addDays(weekStart, 6);
    const { data } = await supabase
      .from('diary_entries')
      .select('*')
      .gte('date', from)
      .lte('date', to);
    setEntries((data as DiaryEntry[]) ?? []);
  }, [mode, anchor, weekStart]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function shift(direction: 1 | -1) {
    setAnchor(addDays(anchor, mode === 'day' ? direction : direction * 7));
  }

  function label(): string {
    const locale = i18n.language === 'nl' ? 'nl-NL' : 'en-GB';
    if (mode === 'day') {
      return new Date(anchor + 'T12:00:00').toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      });
    }
    const start = new Date(weekStart + 'T12:00:00');
    const end = new Date(addDays(weekStart, 6) + 'T12:00:00');
    return `${start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;
  }

  if (entries === null) return <Loading />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.l }}>
      <View style={styles.switcher}>
        {(['day', 'week'] as const).map((m) => (
          <Pressable
            key={m}
            style={[styles.switchBtn, mode === m && styles.switchActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.switchText, mode === m && styles.switchTextActive]}>{t(`reports.${m}`)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.nav}>
        <Pressable hitSlop={12} onPress={() => shift(-1)}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.navLabel}>{label()}</Text>
        <Pressable hitSlop={12} onPress={() => shift(1)}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      {entries.length === 0 ? (
        <Text style={styles.empty}>{t('reports.noData')}</Text>
      ) : mode === 'day' ? (
        <DayReport entries={entries} />
      ) : (
        <WeekReport entries={entries} weekStart={weekStart} />
      )}
    </ScrollView>
  );
}

function DayReport({ entries }: { entries: DiaryEntry[] }) {
  const { t } = useTranslation();
  const totals = sumEntries(entries);
  const slots = MAIN_SLOTS.flatMap((m) => [m, SNACK_AFTER[m]]);
  return (
    <>
      <Card>
        <TotalsRow totals={totals} />
      </Card>
      <SectionTitle>{t('diary.title')}</SectionTitle>
      <Card>
        {slots.map((slot) => {
          const slotEntries = entries.filter((e) => e.meal_slot === slot);
          if (slotEntries.length === 0) return null;
          const st = sumEntries(slotEntries);
          return (
            <View key={slot} style={styles.mealRow}>
              <Text style={styles.mealName}>{t(slotLabelKey(slot))}</Text>
              <Text style={styles.mealValue}>
                {fmt(st.kcal)} {t('common.kcal')}
              </Text>
            </View>
          );
        })}
      </Card>
    </>
  );
}

function WeekReport({ entries, weekStart }: { entries: DiaryEntry[]; weekStart: string }) {
  const { t, i18n } = useTranslation();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const perDay = days.map((d) => sumEntries(entries.filter((e) => e.date === d)));
  const maxKcal = Math.max(...perDay.map((p) => p.kcal), 1);
  const daysWithData = perDay.filter((p) => p.kcal > 0).length || 1;
  const avg = {
    kcal: perDay.reduce((s, p) => s + p.kcal, 0) / daysWithData,
    carbs: perDay.reduce((s, p) => s + p.carbs, 0) / daysWithData,
    protein: perDay.reduce((s, p) => s + p.protein, 0) / daysWithData,
    fat: perDay.reduce((s, p) => s + p.fat, 0) / daysWithData,
  };
  const locale = i18n.language === 'nl' ? 'nl-NL' : 'en-GB';

  return (
    <>
      <Card>
        <View style={styles.chart}>
          {days.map((d, i) => (
            <View key={d} style={styles.chartCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: `${Math.round((perDay[i].kcal / maxKcal) * 100)}%` as const },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>
                {new Date(d + 'T12:00:00').toLocaleDateString(locale, { weekday: 'narrow' })}
              </Text>
            </View>
          ))}
        </View>
      </Card>
      <SectionTitle>{t('reports.average')}</SectionTitle>
      <Card>
        <TotalsRow totals={avg} />
      </Card>
    </>
  );
}

function TotalsRow({ totals }: { totals: { kcal: number; carbs: number; protein: number; fat: number } }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row' }}>
      {(['kcal', 'carbs', 'protein', 'fat'] as const).map((key) => (
        <View key={key} style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.totalValue, key === 'kcal' && { color: colors.primaryDark }]}>
            {fmt(totals[key])}
            {key === 'kcal' ? '' : ' g'}
          </Text>
          <Text style={styles.totalLabel}>{t(`macros.${key}Short`)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing.m,
  },
  switchBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.s, alignItems: 'center' },
  switchActive: { backgroundColor: colors.primarySoft },
  switchText: { color: colors.muted, fontWeight: '600' },
  switchTextActive: { color: colors.primaryDark, fontWeight: '800' },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
    paddingHorizontal: spacing.s,
  },
  navArrow: { fontSize: 26, color: colors.muted, paddingHorizontal: spacing.m },
  navLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  empty: { color: colors.faint, textAlign: 'center', marginTop: spacing.xxl, fontSize: 15 },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  mealName: { fontSize: 14, color: colors.text, fontWeight: '600' },
  mealValue: { fontSize: 14, color: colors.muted, fontWeight: '700' },
  chart: { flexDirection: 'row', height: 140, alignItems: 'flex-end' },
  chartCol: { flex: 1, alignItems: 'center', height: '100%' },
  barTrack: { flex: 1, width: 18, justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: colors.primary, borderRadius: 4, minHeight: 2 },
  barLabel: { fontSize: 11, color: colors.muted, marginTop: 4 },
  totalValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  totalLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
