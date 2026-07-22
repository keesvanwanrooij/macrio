/*
 * SECTION: Reports (day / week)
 * WHAT: Day meal breakdown by selected macro; week bar chart with historical goals.
 * HOW: Tap macro totals to select; ‹ › or swipe L/R shifts day/week; tap week bar → diary.
 * INPUT: diary_entries + goal_revisions for selected day or week
 * OUTPUT: Scrollable report UI; navigation to diary with ?date=
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

import { Card, Loading, SectionTitle } from '../../components/ui';
import { ProgressBar } from '../../components/ProgressBar';
import {
  fetchGoalRevisionsUpTo,
  goalValue,
  resolveGoalForDate,
  type GoalSnapshot,
} from '../../lib/goalRevisions';
import { MACRO_COMPACT_WIDTH, MACRO_KEYS, macroDisplayLabel, type MacroKey } from '../../lib/macroLabels';
import { mealSlotGoal, isSnackSlot } from '../../lib/mealGoalShare';
import { addDays, fmt, MAIN_SLOTS, SNACK_AFTER, slotLabelKey, sumEntries, toDateString } from '../../lib/nutrition';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../lib/theme';
import type { DiaryEntry, MacroTotals } from '../../lib/types';

const GHOST_BAR_HEIGHT = 10;
const CHART_TRACK_HEIGHT = 120;

export default function Reports() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [anchor, setAnchor] = useState(toDateString(new Date()));
  const [selectedMacro, setSelectedMacro] = useState<MacroKey>('kcal');
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);
  const [revisions, setRevisions] = useState<GoalSnapshot[]>([]);

  const weekStart = useMemo(() => {
    const d = new Date(anchor + 'T12:00:00');
    const day = (d.getDay() + 6) % 7;
    return addDays(anchor, -day);
  }, [anchor]);

  const load = useCallback(async () => {
    const from = mode === 'day' ? anchor : weekStart;
    const to = mode === 'day' ? anchor : addDays(weekStart, 6);
    try {
      const [entryRes, revs] = await Promise.all([
        supabase.from('diary_entries').select('*').gte('date', from).lte('date', to),
        fetchGoalRevisionsUpTo(to),
      ]);
      setEntries((entryRes.data as DiaryEntry[]) ?? []);
      setRevisions(revs);
    } catch {
      setEntries([]);
      setRevisions([]);
    }
  }, [mode, anchor, weekStart]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const shift = useCallback(
    (direction: 1 | -1) => {
      setAnchor((a) => addDays(a, mode === 'day' ? direction : direction * 7));
    },
    [mode]
  );

  // One swipe meaning: prev/next day or week (same as ‹ ›)
  const dateGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-24, 24])
        .failOffsetY([-20, 20])
        .runOnJS(true)
        .onEnd((e) => {
          if (e.translationX <= -40) shift(1);
          else if (e.translationX >= 40) shift(-1);
        }),
    [shift]
  );

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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.l, flexGrow: 1 }}>
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

      <GestureDetector gesture={dateGesture}>
        <View style={styles.body}>
          <View style={styles.nav}>
            <Pressable hitSlop={12} onPress={() => shift(-1)}>
              <Text style={styles.navArrow}>‹</Text>
            </Pressable>
            <Text style={styles.navLabel}>{label()}</Text>
            <Pressable hitSlop={12} onPress={() => shift(1)}>
              <Text style={styles.navArrow}>›</Text>
            </Pressable>
          </View>

          {mode === 'day' ? (
            <DayReport
              date={anchor}
              entries={entries}
              revisions={revisions}
              selected={selectedMacro}
              onSelect={setSelectedMacro}
            />
          ) : (
            <WeekReport
              entries={entries}
              weekStart={weekStart}
              revisions={revisions}
              selected={selectedMacro}
              onSelect={setSelectedMacro}
            />
          )}
        </View>
      </GestureDetector>
    </ScrollView>
  );
}

/*
 * SECTION: Day report body
 * WHAT: Totals + full-width day progress card + meal list for selected macro.
 * HOW: Day goal from revisions (else profile). Meals: mains 2 parts, logged snacks 1.
 *      Day bar uses strong over color; meal bars use soft coral when over.
 * INPUT: date, entries, revisions, selected macro
 * OUTPUT: Calmer day UI with share hint under Dagboek
 */
function DayReport({
  date,
  entries,
  revisions,
  selected,
  onSelect,
}: {
  date: string;
  entries: DiaryEntry[];
  revisions: GoalSnapshot[];
  selected: MacroKey;
  onSelect: (key: MacroKey) => void;
}) {
  const { t } = useTranslation();
  const { profile } = useSession();
  const totals = sumEntries(entries);
  const slots = MAIN_SLOTS.flatMap((m) => [m, SNACK_AFTER[m]]);
  const unit = selected === 'kcal' ? t('common.kcal') : 'g';

  const dayGoal = useMemo(() => {
    const fromRev = goalValue(resolveGoalForDate(revisions, date), selected);
    if (fromRev != null && fromRev > 0) return fromRev;
    if (!profile) return null;
    return goalValue(
      {
        effective_date: date,
        goal_kcal: profile.goal_kcal,
        goal_carbs: profile.goal_carbs,
        goal_protein: profile.goal_protein,
        goal_fat: profile.goal_fat,
      },
      selected
    );
  }, [revisions, date, selected, profile]);

  const slotsWithFood = useMemo(() => {
    const present = new Set(entries.map((e) => Number(e.meal_slot)));
    return MAIN_SLOTS.flatMap((m) => [m, SNACK_AFTER[m]]).filter((s) => present.has(s));
  }, [entries]);

  const mealShareGoal =
    dayGoal != null ? mealSlotGoal(dayGoal, MAIN_SLOTS[0], slotsWithFood) : null;
  const firstSnackWithFood = slotsWithFood.find((s) => isSnackSlot(s));
  const snackShareGoal =
    dayGoal != null && firstSnackWithFood != null
      ? mealSlotGoal(dayGoal, firstSnackWithFood, slotsWithFood)
      : null;

  if (entries.length === 0) {
    return <Text style={styles.empty}>{t('reports.noData')}</Text>;
  }

  const consumed = totals[selected];

  return (
    <>
      <Card>
        <TotalsRow totals={totals} selected={selected} onSelect={onSelect} />
      </Card>

      {dayGoal != null && dayGoal > 0 ? (
        <Card style={styles.dayProgressCard}>
          <Text style={styles.dayProgressLabel}>
            {fmt(consumed)} / {fmt(dayGoal)} {unit}
          </Text>
          <ProgressBar ratio={consumed / dayGoal} highlight overTone="strong" />
        </Card>
      ) : null}

      <SectionTitle>{t('diary.title')}</SectionTitle>
      {mealShareGoal != null ? (
        <Text style={styles.mealGoalHint}>
          {snackShareGoal != null
            ? t('reports.goalPerMealWithSnacks', {
                meal: fmt(mealShareGoal),
                snack: fmt(snackShareGoal),
                unit,
              })
            : t('reports.goalPerMeal', { amount: fmt(mealShareGoal), unit })}
        </Text>
      ) : null}

      <Card>
        {slots.map((slot) => {
          const slotEntries = entries.filter((e) => Number(e.meal_slot) === slot);
          if (slotEntries.length === 0) return null;
          const st = sumEntries(slotEntries);
          const slotConsumed = st[selected];
          const slotGoal =
            dayGoal != null ? mealSlotGoal(dayGoal, slot, slotsWithFood) : null;
          return (
            <View key={slot} style={styles.mealBlock}>
              <View style={styles.mealRow}>
                <Text style={styles.mealName}>{t(slotLabelKey(slot))}</Text>
                <Text style={styles.mealValue}>
                  {fmt(slotConsumed)} {unit}
                </Text>
              </View>
              {slotGoal != null && slotGoal > 0 ? (
                <ProgressBar ratio={slotConsumed / slotGoal} overTone="soft" />
              ) : null}
            </View>
          );
        })}
      </Card>
    </>
  );
}

/*
 * SECTION: Week report chart
 * WHAT: Macro bars, ghost empty days, historical goal line/ticks, avg vs goal.
 * HOW: Tap totals to change macro; tap bar opens diary; parent swipe shifts week.
 * INPUT: week entries, weekStart, goal revisions, selected macro
 * OUTPUT: Chart + average totals row
 */
function WeekReport({
  entries,
  weekStart,
  revisions,
  selected,
  onSelect,
}: {
  entries: DiaryEntry[];
  weekStart: string;
  revisions: GoalSnapshot[];
  selected: MacroKey;
  onSelect: (key: MacroKey) => void;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useSession();

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const perDay = useMemo(
    () => days.map((d) => sumEntries(entries.filter((e) => e.date === d))),
    [days, entries]
  );
  const values = perDay.map((p) => p[selected]);

  const dayGoals = useMemo(
    () => days.map((d) => goalValue(resolveGoalForDate(revisions, d), selected)),
    [days, revisions, selected]
  );

  const goalsUniform = useMemo(() => {
    const defined = dayGoals.filter((g): g is number => g != null && g > 0);
    if (defined.length === 0) return true;
    const first = defined[0];
    return dayGoals.every((g) => g == null || g === first) && defined.every((g) => g === first);
  }, [dayGoals]);

  const uniformGoal = goalsUniform
    ? dayGoals.find((g) => g != null && g > 0) ?? null
    : null;

  const maxVal = Math.max(...values, ...dayGoals.map((g) => g ?? 0), 1);

  const daysWithData = perDay.filter((p) => p.kcal > 0).length || 1;
  const avg: MacroTotals = {
    kcal: perDay.reduce((s, p) => s + p.kcal, 0) / daysWithData,
    carbs: perDay.reduce((s, p) => s + p.carbs, 0) / daysWithData,
    protein: perDay.reduce((s, p) => s + p.protein, 0) / daysWithData,
    fat: perDay.reduce((s, p) => s + p.fat, 0) / daysWithData,
  };

  const locale = i18n.language === 'nl' ? 'nl-NL' : 'en-GB';
  const unit = selected === 'kcal' ? t('common.kcal') : 'g';
  const avgVal = avg[selected];
  const avgGoal =
    uniformGoal ??
    (() => {
      const gs = dayGoals.filter((g): g is number => g != null && g > 0);
      return gs.length ? gs.reduce((a, b) => a + b, 0) / gs.length : null;
    })();

  function openDiary(date: string) {
    router.push({ pathname: '/(tabs)', params: { date } });
  }

  function avgLine(): string {
    if (avgGoal == null) {
      return t('reports.avgOnly', { avg: fmt(avgVal), unit });
    }
    const countDown = profile?.count_direction === 'down';
    if (countDown) {
      const left = avgGoal - avgVal;
      if (left >= 0) {
        return t('reports.avgVsGoalLeft', {
          avg: fmt(avgVal),
          left: fmt(left),
          goal: fmt(avgGoal),
          unit,
        });
      }
      return t('reports.avgVsGoalOver', {
        avg: fmt(avgVal),
        over: fmt(-left),
        goal: fmt(avgGoal),
        unit,
      });
    }
    return t('reports.avgVsGoal', {
      avg: fmt(avgVal),
      goal: fmt(avgGoal),
      unit,
    });
  }

  const goalLineBottom =
    uniformGoal != null && uniformGoal > 0
      ? (uniformGoal / maxVal) * CHART_TRACK_HEIGHT
      : null;

  return (
    <>
      <Card>
        <Text style={styles.chartTitle}>
          {macroDisplayLabel(t, selected, false)}
          {selected !== 'kcal' ? ` (${unit})` : ''}
        </Text>
        <View style={styles.chart}>
          {goalLineBottom != null ? (
            <View
              pointerEvents="none"
              style={[styles.goalLine, { bottom: goalLineBottom + 16 }]}
            />
          ) : null}
          {days.map((d, i) => {
            const v = values[i];
            const empty = v <= 0;
            const barH = empty
              ? GHOST_BAR_HEIGHT
              : Math.max(2, Math.round((v / maxVal) * CHART_TRACK_HEIGHT));
            const dayGoal = dayGoals[i];
            const tickH =
              !goalsUniform && dayGoal != null && dayGoal > 0
                ? (dayGoal / maxVal) * CHART_TRACK_HEIGHT
                : null;

            return (
              <Pressable key={d} style={styles.chartCol} onPress={() => openDiary(d)}>
                <Text style={styles.barValue} numberOfLines={1}>
                  {!empty ? fmt(v) : ''}
                </Text>
                <View style={[styles.barTrack, { height: CHART_TRACK_HEIGHT }]}>
                  {tickH != null ? (
                    <View
                      pointerEvents="none"
                      style={[styles.goalTick, { bottom: tickH - 1 }]}
                    />
                  ) : null}
                  <View style={[styles.bar, empty && styles.barGhost, { height: barH }]} />
                </View>
                <Text style={styles.barLabel}>
                  {new Date(d + 'T12:00:00').toLocaleDateString(locale, { weekday: 'narrow' })}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.avgLine}>{avgLine()}</Text>
      </Card>
      <SectionTitle>{t('reports.average')}</SectionTitle>
      <Card>
        <TotalsRow totals={avg} selected={selected} onSelect={onSelect} />
      </Card>
    </>
  );
}

function TotalsRow({
  totals,
  selected,
  onSelect,
}: {
  totals: MacroTotals;
  selected: MacroKey;
  onSelect: (key: MacroKey) => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const compact = width < MACRO_COMPACT_WIDTH;

  return (
    <View style={{ flexDirection: 'row' }}>
      {MACRO_KEYS.map((key) => {
        const active = selected === key;
        return (
          <Pressable
            key={key}
            style={[styles.totalCell, active && styles.totalCellActive]}
            onPress={() => onSelect(key)}
          >
            <Text style={[styles.totalValue, active && { color: colors.primaryDark }]}>
              {fmt(totals[key])}
              {key === 'kcal' ? '' : ' g'}
            </Text>
            <Text
              style={[styles.totalLabel, active && styles.totalLabelActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {macroDisplayLabel(t, key, compact)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { flexGrow: 1, minHeight: 280 },
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
  dayProgressCard: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    marginTop: spacing.s,
  },
  dayProgressLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  mealGoalHint: {
    fontSize: 12,
    color: colors.faint,
    marginBottom: spacing.s,
    marginTop: -4,
  },
  mealBlock: {
    paddingVertical: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 6,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: { fontSize: 14, color: colors.text, fontWeight: '600' },
  mealValue: { fontSize: 14, color: colors.muted, fontWeight: '700' },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.muted,
    marginBottom: spacing.s,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chart: {
    flexDirection: 'row',
    height: 160,
    alignItems: 'flex-end',
    position: 'relative',
  },
  chartCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontSize: 9, color: colors.faint, marginBottom: 2, minHeight: 12 },
  barTrack: {
    width: 18,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  bar: { width: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  barGhost: { backgroundColor: colors.border, opacity: 0.9 },
  barLabel: { fontSize: 11, color: colors.muted, marginTop: 4 },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.warn,
    zIndex: 2,
  },
  goalTick: {
    position: 'absolute',
    left: -2,
    right: -2,
    height: 2,
    backgroundColor: colors.warn,
    borderRadius: 1,
    zIndex: 2,
  },
  avgLine: {
    marginTop: spacing.m,
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  totalCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderRadius: radius.s,
  },
  totalCellActive: { backgroundColor: colors.primarySoft },
  totalValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  totalLabel: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: '600' },
  totalLabelActive: { color: colors.primaryDark, fontWeight: '800' },
});
