/*
 * SECTION: Reports (day / week)
 * WHAT: Day meal breakdown by selected macro; week bar chart with historical goals.
 * HOW: Swipe zones:
 *   - Day/Week switcher → toggle mode
 *   - Totals + diary (day) or chart + average (week) → cycle macros
 *   - Elsewhere (incl. date nav) → prev/next day or week
 * INPUT: diary_entries + goal_revisions for selected day or week
 * OUTPUT: Scrollable report UI; navigation to diary with ?date=
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

import { Card, Loading, SectionTitle } from '../../components/ui';
import {
  fetchGoalRevisionsUpTo,
  goalValue,
  resolveGoalForDate,
  type GoalSnapshot,
} from '../../lib/goalRevisions';
import { MACRO_COMPACT_WIDTH, MACRO_KEYS, macroDisplayLabel, type MacroKey } from '../../lib/macroLabels';
import { addDays, fmt, MAIN_SLOTS, SNACK_AFTER, slotLabelKey, sumEntries, toDateString } from '../../lib/nutrition';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../lib/theme';
import type { DiaryEntry, MacroTotals } from '../../lib/types';

const GHOST_BAR_HEIGHT = 10;
const CHART_TRACK_HEIGHT = 120;

/** Horizontal pan: swipe left → +1, swipe right → -1. Vertical scroll still wins. */
function horizontalSwipe(onSwipe: (direction: 1 | -1) => void) {
  return Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-20, 20])
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX <= -40) onSwipe(1);
      else if (e.translationX >= 40) onSwipe(-1);
    });
}

function cycleMacroKey(cur: MacroKey, direction: 1 | -1): MacroKey {
  const idx = MACRO_KEYS.indexOf(cur);
  return MACRO_KEYS[(idx + direction + MACRO_KEYS.length) % MACRO_KEYS.length];
}

export default function Reports() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [anchor, setAnchor] = useState(toDateString(new Date()));
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);
  const [revisions, setRevisions] = useState<GoalSnapshot[]>([]);

  const weekStart = useMemo(() => {
    const d = new Date(anchor + 'T12:00:00');
    const day = (d.getDay() + 6) % 7;
    return addDays(anchor, -day);
  }, [anchor]);

  const load = useCallback(async () => {
    setEntries(null);
    const from = mode === 'day' ? anchor : weekStart;
    const to = mode === 'day' ? anchor : addDays(weekStart, 6);
    const [entryRes, revs] = await Promise.all([
      supabase.from('diary_entries').select('*').gte('date', from).lte('date', to),
      fetchGoalRevisionsUpTo(to),
    ]);
    setEntries((entryRes.data as DiaryEntry[]) ?? []);
    setRevisions(revs);
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

  const toggleMode = useCallback(() => {
    setMode((m) => (m === 'day' ? 'week' : 'day'));
  }, []);

  const modeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-24, 24])
        .failOffsetY([-20, 20])
        .runOnJS(true)
        .onEnd((e) => {
          if (Math.abs(e.translationX) >= 40) toggleMode();
        }),
    [toggleMode]
  );

  const dateGesture = useMemo(() => horizontalSwipe(shift), [shift]);

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
      <GestureDetector gesture={modeGesture}>
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
      </GestureDetector>

      {/* Date/week shift: nav + empty areas. Nested macro zones block this. */}
      <GestureDetector gesture={dateGesture}>
        <View style={styles.dateSwipeArea}>
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
            <DayReport entries={entries} dateGesture={dateGesture} />
          ) : (
            <WeekReport
              entries={entries}
              weekStart={weekStart}
              revisions={revisions}
              dateGesture={dateGesture}
            />
          )}
        </View>
      </GestureDetector>
    </ScrollView>
  );
}

/*
 * SECTION: Day report body
 * WHAT: Totals + meal list for one macro.
 * HOW: Swipe on 4 columns or diary list → cycle macros; date swipe is parent zone.
 * INPUT: entries for anchor day
 * OUTPUT: Selected macro meal values
 */
function DayReport({
  entries,
  dateGesture,
}: {
  entries: DiaryEntry[];
  dateGesture: ReturnType<typeof horizontalSwipe>;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<MacroKey>('kcal');
  const totals = sumEntries(entries);
  const slots = MAIN_SLOTS.flatMap((m) => [m, SNACK_AFTER[m]]);
  const unit = selected === 'kcal' ? t('common.kcal') : 'g';

  const cycleMacro = useCallback((direction: 1 | -1) => {
    setSelected((cur) => cycleMacroKey(cur, direction));
  }, []);

  const totalsMacroGesture = useMemo(
    () => horizontalSwipe(cycleMacro).blocksExternalGesture(dateGesture),
    [cycleMacro, dateGesture]
  );
  const diaryMacroGesture = useMemo(
    () => horizontalSwipe(cycleMacro).blocksExternalGesture(dateGesture),
    [cycleMacro, dateGesture]
  );

  if (entries.length === 0) {
    return <Text style={styles.empty}>{t('reports.noData')}</Text>;
  }

  return (
    <>
      <GestureDetector gesture={totalsMacroGesture}>
        <View>
          <Card>
            <TotalsRow totals={totals} selected={selected} onSelect={setSelected} />
          </Card>
        </View>
      </GestureDetector>
      <GestureDetector gesture={diaryMacroGesture}>
        <View>
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
                    {fmt(st[selected])} {unit}
                  </Text>
                </View>
              );
            })}
          </Card>
        </View>
      </GestureDetector>
    </>
  );
}

/*
 * SECTION: Week report chart
 * WHAT: Macro bars, ghost empty days, historical goal line/ticks, avg vs goal.
 * HOW: Swipe chart or average row → cycle macros; parent zone shifts weeks.
 * INPUT: week entries, weekStart, goal revisions
 * OUTPUT: Chart + average totals row
 */
function WeekReport({
  entries,
  weekStart,
  revisions,
  dateGesture,
}: {
  entries: DiaryEntry[];
  weekStart: string;
  revisions: GoalSnapshot[];
  dateGesture: ReturnType<typeof horizontalSwipe>;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useSession();
  const [chartMacro, setChartMacro] = useState<MacroKey>('kcal');

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const perDay = useMemo(
    () => days.map((d) => sumEntries(entries.filter((e) => e.date === d))),
    [days, entries]
  );
  const values = perDay.map((p) => p[chartMacro]);

  const dayGoals = useMemo(
    () => days.map((d) => goalValue(resolveGoalForDate(revisions, d), chartMacro)),
    [days, revisions, chartMacro]
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
  const unit = chartMacro === 'kcal' ? t('common.kcal') : 'g';
  const avgVal = avg[chartMacro];
  const avgGoal =
    uniformGoal ??
    (() => {
      const gs = dayGoals.filter((g): g is number => g != null && g > 0);
      return gs.length ? gs.reduce((a, b) => a + b, 0) / gs.length : null;
    })();

  const cycleMacro = useCallback((direction: 1 | -1) => {
    setChartMacro((cur) => cycleMacroKey(cur, direction));
  }, []);

  const chartMacroGesture = useMemo(
    () => horizontalSwipe(cycleMacro).blocksExternalGesture(dateGesture),
    [cycleMacro, dateGesture]
  );
  const avgMacroGesture = useMemo(
    () => horizontalSwipe(cycleMacro).blocksExternalGesture(dateGesture),
    [cycleMacro, dateGesture]
  );

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
      <GestureDetector gesture={chartMacroGesture}>
        <View>
          <Card>
            <Text style={styles.chartTitle}>
              {macroDisplayLabel(t, chartMacro, false)}
              {chartMacro !== 'kcal' ? ` (${unit})` : ''}
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
                      <View
                        style={[styles.bar, empty && styles.barGhost, { height: barH }]}
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
        </View>
      </GestureDetector>
      <GestureDetector gesture={avgMacroGesture}>
        <View>
          <SectionTitle>{t('reports.average')}</SectionTitle>
          <Card>
            <TotalsRow totals={avg} selected={chartMacro} onSelect={setChartMacro} />
          </Card>
        </View>
      </GestureDetector>
    </>
  );
}

function TotalsRow({
  totals,
  selected,
  onSelect,
}: {
  totals: MacroTotals;
  selected?: MacroKey;
  onSelect?: (key: MacroKey) => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const compact = width < MACRO_COMPACT_WIDTH;

  return (
    <View style={{ flexDirection: 'row' }}>
      {MACRO_KEYS.map((key) => {
        const active = selected === key;
        const content = (
          <>
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
          </>
        );
        if (onSelect) {
          return (
            <Pressable
              key={key}
              style={[styles.totalCell, active && styles.totalCellActive]}
              onPress={() => onSelect(key)}
            >
              {content}
            </Pressable>
          );
        }
        return (
          <View key={key} style={styles.totalCell}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  dateSwipeArea: { flexGrow: 1, minHeight: 280 },
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
