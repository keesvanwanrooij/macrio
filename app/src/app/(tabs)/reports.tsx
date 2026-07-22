/*
 * SECTION: Reports (day / week)
 * WHAT: Day meal breakdown by selected macro; week bar chart with historical goals.
 * HOW: Tap macro totals to select (focus); bottom "Toon alles" stacks all four macros.
 *      ‹ › or swipe L/R shifts day/week; tap week bar → diary.
 * INPUT: diary_entries + goal_revisions for selected day or week
 * OUTPUT: Scrollable report UI; navigation to diary with ?date=
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

import { Button, Card, Loading, SectionTitle } from '../../components/ui';
import { ProgressBar } from '../../components/ProgressBar';
import {
  fetchGoalRevisionsUpTo,
  goalValue,
  resolveGoalForDate,
  type GoalSnapshot,
} from '../../lib/goalRevisions';
import { MACRO_COMPACT_WIDTH, MACRO_KEYS, macroDisplayLabel, type MacroKey } from '../../lib/macroLabels';
import { mealScaleFromDayGoal, snackMacroTotal, isSnackSlot, DEFAULT_GOAL_KCAL, DEFAULT_GOAL_WEIGHT_KG } from '../../lib/mealGoalShare';
import { macrosFromKcal } from '../../lib/goalCalculator';
import { addDays, fmt, MAIN_SLOTS, SNACK_AFTER, slotLabelKey, sumEntries, toDateString } from '../../lib/nutrition';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../lib/theme';
import type { DiaryEntry, MacroTotals, Profile } from '../../lib/types';

const GHOST_BAR_HEIGHT = 10;
const CHART_TRACK_HEIGHT = 120;

/*
 * SECTION: Day goal for one macro
 * WHAT: Revision → profile → default 2000 kcal macros.
 * INPUT: date, revisions, macro, optional profile
 * OUTPUT: { dayGoal, goalIsDefault }
 */
function dayGoalForMacro(
  date: string,
  revisions: GoalSnapshot[],
  macro: MacroKey,
  profile: Profile | null | undefined
): { dayGoal: number; goalIsDefault: boolean } {
  const fromRev = goalValue(resolveGoalForDate(revisions, date), macro);
  if (fromRev != null && fromRev > 0) {
    return { dayGoal: fromRev, goalIsDefault: false };
  }
  if (profile) {
    const fromProfile = goalValue(
      {
        effective_date: date,
        goal_kcal: profile.goal_kcal,
        goal_carbs: profile.goal_carbs,
        goal_protein: profile.goal_protein,
        goal_fat: profile.goal_fat,
      },
      macro
    );
    if (fromProfile != null && fromProfile > 0) {
      return { dayGoal: fromProfile, goalIsDefault: false };
    }
  }
  const weight =
    profile?.weight_kg != null && Number(profile.weight_kg) > 0
      ? Number(profile.weight_kg)
      : DEFAULT_GOAL_WEIGHT_KG;
  const macrosCalc = macrosFromKcal(DEFAULT_GOAL_KCAL, weight, profile?.weight_goal ?? 'maintain');
  const defaults = {
    kcal: DEFAULT_GOAL_KCAL,
    carbs: macrosCalc?.carbs ?? 225,
    protein: macrosCalc?.protein ?? 112,
    fat: macrosCalc?.fat ?? 63,
  };
  return { dayGoal: defaults[macro], goalIsDefault: true };
}

export default function Reports() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [anchor, setAnchor] = useState(toDateString(new Date()));
  const [selectedMacro, setSelectedMacro] = useState<MacroKey>('kcal');
  /** false = one macro (focus); true = all four stacked (user opts into busier scroll). */
  const [showAll, setShowAll] = useState(false);
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
              showAll={showAll}
            />
          ) : (
            <WeekReport
              entries={entries}
              weekStart={weekStart}
              revisions={revisions}
              selected={selectedMacro}
              onSelect={setSelectedMacro}
              showAll={showAll}
            />
          )}
        </View>
      </GestureDetector>

      {/* Bottom: opt into all macros, or return to single-macro focus */}
      <View style={styles.showAllWrap}>
        <Button
          title={t(showAll ? 'reports.showFocus' : 'reports.showAll')}
          variant="secondary"
          onPress={() => setShowAll((v) => !v)}
        />
      </View>
    </ScrollView>
  );
}

/*
 * SECTION: Day report body
 * WHAT: Totals + day progress + meal/snack bars (one macro, or all four when showAll).
 * HOW: Day goal from revisions/profile, else default 2000 kcal macros.
 *      Meal goal = (dayGoal − snacks) / 3, or dayGoal/3 if snacks ate the budget.
 *      Meal tracks share max(mealGoal, largest meal/snack) so lengths are comparable.
 * INPUT: date, entries, revisions, selected macro, showAll
 * OUTPUT: Day UI with mains always shown; snacks only when logged
 */
function DayReport({
  date,
  entries,
  revisions,
  selected,
  onSelect,
  showAll,
}: {
  date: string;
  entries: DiaryEntry[];
  revisions: GoalSnapshot[];
  selected: MacroKey;
  onSelect: (key: MacroKey) => void;
  showAll: boolean;
}) {
  const { t } = useTranslation();
  const { profile } = useSession();
  const totals = sumEntries(entries);
  const macros = showAll ? MACRO_KEYS : [selected];

  const selectedGoal = useMemo(
    () => dayGoalForMacro(date, revisions, selected, profile).dayGoal,
    [date, revisions, selected, profile]
  );
  const selectedOver = selectedGoal > 0 && totals[selected] > selectedGoal;

  if (entries.length === 0) {
    return <Text style={styles.empty}>{t('reports.noData')}</Text>;
  }

  return (
    <>
      <Card>
        <TotalsRow
          totals={totals}
          selected={selected}
          onSelect={onSelect}
          selectedOver={selectedOver}
        />
      </Card>
      {macros.map((macro) => (
        <DayMacroBlock
          key={macro}
          date={date}
          entries={entries}
          revisions={revisions}
          macro={macro}
          showHeading={showAll}
        />
      ))}
    </>
  );
}

/*
 * SECTION: One macro’s day progress + meals
 * WHAT: Progress card + meal list for a single macro key.
 * HOW: Same share rules as before; optional SectionTitle when showing all.
 * INPUT: date, entries, revisions, macro, showHeading
 * OUTPUT: Progress + meal cards
 */
function DayMacroBlock({
  date,
  entries,
  revisions,
  macro,
  showHeading,
}: {
  date: string;
  entries: DiaryEntry[];
  revisions: GoalSnapshot[];
  macro: MacroKey;
  showHeading: boolean;
}) {
  const { t } = useTranslation();
  const { profile } = useSession();
  const unit = macro === 'kcal' ? t('common.kcal') : 'g';

  const { dayGoal, goalIsDefault } = useMemo(
    () => dayGoalForMacro(date, revisions, macro, profile),
    [revisions, date, macro, profile]
  );

  const snackTotal = useMemo(() => snackMacroTotal(entries, macro), [entries, macro]);

  const mealGoal = useMemo(
    () => mealScaleFromDayGoal(dayGoal, snackTotal),
    [dayGoal, snackTotal]
  );

  const snackSlotsWithFood = useMemo(() => {
    const present = new Set(entries.map((e) => Number(e.meal_slot)));
    return MAIN_SLOTS.map((m) => SNACK_AFTER[m]).filter((s) => present.has(s));
  }, [entries]);

  const mealRows = useMemo(() => {
    const mains = MAIN_SLOTS.map((slot) => ({
      slot,
      consumed: sumEntries(entries.filter((e) => Number(e.meal_slot) === slot))[macro],
    }));
    const snacks = snackSlotsWithFood.map((slot) => ({
      slot,
      consumed: sumEntries(entries.filter((e) => Number(e.meal_slot) === slot))[macro],
    }));
    return [...mains, ...snacks];
  }, [entries, macro, snackSlotsWithFood]);

  const mealTrackMax = useMemo(() => {
    const peak = mealRows.reduce((m, row) => Math.max(m, row.consumed), 0);
    return Math.max(mealGoal, peak);
  }, [mealRows, mealGoal]);

  const totals = sumEntries(entries);
  const consumed = totals[macro];
  const dayOver = dayGoal > 0 && consumed > dayGoal;

  function slotLabel(slot: number): string {
    if (isSnackSlot(slot)) {
      return t('reports.snackLabel');
    }
    return t(slotLabelKey(slot));
  }

  return (
    <View style={showHeading ? styles.macroBlock : undefined}>
      {showHeading ? (
        <SectionTitle>{macroDisplayLabel(t, macro, false)}</SectionTitle>
      ) : null}

      <Card style={styles.dayProgressCard}>
        <View style={styles.dayTotalRow}>
          <Text style={styles.dayTotalHint}>{t('reports.dayTotal')}</Text>
          <Text style={styles.mealValue}>
            {fmt(consumed)} / {fmt(dayGoal)} {unit}
          </Text>
        </View>
        <ProgressBar
          consumed={consumed}
          goal={dayGoal}
          highlight
          overTone="strong"
        />
      </Card>

      {!showHeading ? <SectionTitle>{t('diary.title')}</SectionTitle> : null}

      <Card style={showHeading ? styles.mealsCardAfterTotal : undefined}>
        <Text style={styles.mealGoalHint}>
          {goalIsDefault
            ? t('reports.setGoalInSettings')
            : t('reports.goalPerMeal', { amount: fmt(mealGoal), unit })}
        </Text>
        {mealRows.map(({ slot, consumed: slotConsumed }) => (
          <View key={slot} style={styles.mealBlock}>
            <View style={styles.mealRow}>
              <Text style={styles.mealName}>{slotLabel(slot)}</Text>
              <Text style={styles.mealValue}>
                {fmt(slotConsumed)} {unit}
              </Text>
            </View>
            <ProgressBar
              consumed={slotConsumed}
              goal={mealGoal}
              trackMax={mealTrackMax}
              overTone="soft"
              showMarker={false}
              over={dayOver && mealGoal > 0 && slotConsumed > mealGoal}
            />
          </View>
        ))}
      </Card>
    </View>
  );
}

/*
 * SECTION: Week report chart
 * WHAT: Macro bars (one or all four), ghost empty days, historical goal line/ticks.
 * HOW: Tap totals to change focus macro; showAll stacks a chart per macro.
 * INPUT: week entries, weekStart, goal revisions, selected, showAll
 * OUTPUT: Chart(s) + average totals row
 */
function WeekReport({
  entries,
  weekStart,
  revisions,
  selected,
  onSelect,
  showAll,
}: {
  entries: DiaryEntry[];
  weekStart: string;
  revisions: GoalSnapshot[];
  selected: MacroKey;
  onSelect: (key: MacroKey) => void;
  showAll: boolean;
}) {
  const { t } = useTranslation();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const perDay = useMemo(
    () => days.map((d) => sumEntries(entries.filter((e) => e.date === d))),
    [days, entries]
  );

  const daysWithData = perDay.filter((p) => p.kcal > 0).length || 1;
  const avg: MacroTotals = {
    kcal: perDay.reduce((s, p) => s + p.kcal, 0) / daysWithData,
    carbs: perDay.reduce((s, p) => s + p.carbs, 0) / daysWithData,
    protein: perDay.reduce((s, p) => s + p.protein, 0) / daysWithData,
    fat: perDay.reduce((s, p) => s + p.fat, 0) / daysWithData,
  };

  const macros = showAll ? MACRO_KEYS : [selected];

  // Soft-red selector when weekly average of the focused macro is over its avg goal
  const selectedOver = useMemo(() => {
    const dayGoals = days.map((d) => goalValue(resolveGoalForDate(revisions, d), selected));
    const defined = dayGoals.filter((g): g is number => g != null && g > 0);
    if (defined.length === 0) return false;
    const uniform =
      dayGoals.every((g) => g == null || g === defined[0]) && defined.every((g) => g === defined[0]);
    const avgGoal = uniform
      ? defined[0]
      : defined.reduce((a, b) => a + b, 0) / defined.length;
    return avg[selected] > avgGoal;
  }, [days, revisions, selected, avg[selected]]);

  return (
    <>
      {macros.map((macro) => (
        <WeekMacroChart
          key={macro}
          macro={macro}
          days={days}
          perDay={perDay}
          revisions={revisions}
        />
      ))}
      <SectionTitle>{t('reports.average')}</SectionTitle>
      <Card>
        <TotalsRow
          totals={avg}
          selected={selected}
          onSelect={onSelect}
          selectedOver={selectedOver}
        />
      </Card>
    </>
  );
}

/*
 * SECTION: One week macro chart
 * WHAT: Bars for seven days of one macro + avg line vs goal.
 * INPUT: macro key, days, per-day totals, revisions
 * OUTPUT: Chart card
 */
function WeekMacroChart({
  macro,
  days,
  perDay,
  revisions,
}: {
  macro: MacroKey;
  days: string[];
  perDay: MacroTotals[];
  revisions: GoalSnapshot[];
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useSession();

  const values = perDay.map((p) => p[macro]);

  const dayGoals = useMemo(
    () => days.map((d) => goalValue(resolveGoalForDate(revisions, d), macro)),
    [days, revisions, macro]
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

  const locale = i18n.language === 'nl' ? 'nl-NL' : 'en-GB';
  const unit = macro === 'kcal' ? t('common.kcal') : 'g';
  const daysWithData = perDay.filter((p) => p.kcal > 0).length || 1;
  const avgVal = perDay.reduce((s, p) => s + p[macro], 0) / daysWithData;
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
    <Card style={styles.weekChartCard}>
      <Text style={styles.chartTitle}>
        {macroDisplayLabel(t, macro, false)}
        {macro !== 'kcal' ? ` (${unit})` : ''}
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
          const goalForBar =
            dayGoal != null && dayGoal > 0 ? dayGoal : uniformGoal != null && uniformGoal > 0 ? uniformGoal : null;
          const barOver = !empty && goalForBar != null && v > goalForBar;
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
                <View
                  style={[
                    styles.bar,
                    empty && styles.barGhost,
                    barOver && styles.barOver,
                    { height: barH },
                  ]}
                />
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
  );
}

function TotalsRow({
  totals,
  selected,
  onSelect,
  selectedOver = false,
}: {
  totals: MacroTotals;
  selected: MacroKey;
  onSelect: (key: MacroKey) => void;
  /** Day focus: soft-red highlight when the selected macro is over its day goal. */
  selectedOver?: boolean;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const compact = width < MACRO_COMPACT_WIDTH;

  return (
    <View style={{ flexDirection: 'row' }}>
      {MACRO_KEYS.map((key) => {
        const active = selected === key;
        const activeOver = active && selectedOver;
        return (
          <Pressable
            key={key}
            style={[
              styles.totalCell,
              active && (activeOver ? styles.totalCellActiveOver : styles.totalCellActive),
            ]}
            onPress={() => onSelect(key)}
          >
            <Text
              style={[
                styles.totalValue,
                active && { color: activeOver ? colors.danger : colors.primaryDark },
              ]}
            >
              {fmt(totals[key])}
              {key === 'kcal' ? '' : ' g'}
            </Text>
            <Text
              style={[
                styles.totalLabel,
                active && (activeOver ? styles.totalLabelActiveOver : styles.totalLabelActive),
              ]}
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
  showAllWrap: { marginTop: spacing.l, marginBottom: spacing.xl },
  macroBlock: { marginTop: spacing.m },
  weekChartCard: { marginBottom: spacing.m },
  dayProgressCard: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.l,
    marginTop: spacing.s,
  },
  /** Extra gap under day total when stacking all macros (Toon alles). */
  mealsCardAfterTotal: {
    marginTop: spacing.m,
  },
  dayTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
    gap: spacing.s,
  },
  /** Same type as “Doel per maaltijd”, no extra bottom margin (row already spaced). */
  dayTotalHint: {
    fontSize: 12,
    color: colors.faint,
  },
  mealGoalHint: {
    fontSize: 12,
    color: colors.faint,
    marginBottom: spacing.s,
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
  /** Soft coral when that day’s value is over its goal. */
  barOver: { backgroundColor: colors.dangerMuted },
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
  totalCellActiveOver: { backgroundColor: colors.dangerSoft },
  totalValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  totalLabel: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: '600' },
  totalLabelActive: { color: colors.primaryDark, fontWeight: '800' },
  totalLabelActiveOver: { color: colors.danger, fontWeight: '800' },
});
