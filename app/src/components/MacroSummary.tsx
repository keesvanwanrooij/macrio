/*
 * SECTION: Diary macro summary header
 * WHAT: Overview (all 4 macros + progress) or focus (one big macro).
 * HOW: Overview: tap = show/hide goal numbers under bars (persisted).
 *      Focus: double-tap = same show/hide; tap/swipe = next macro; long-press → overview.
 *      Default: goals hidden until the user reveals them once (preference remembered).
 * INPUT: totals, profile, onToggleMode
 * OUTPUT: Card UI
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

import { fmt } from '../lib/nutrition';
import { MACRO_COMPACT_WIDTH, macroDisplayLabel, type MacroKey } from '../lib/macroLabels';
import { colors, radius, spacing } from '../lib/theme';
import type { MacroTotals, Profile } from '../lib/types';
import { ProgressBar } from './ProgressBar'; // shared with reports day bars

const MACROS = ['kcal', 'carbs', 'protein', 'fat'] as const;

/** Persist show/hide of diary goal amounts (overview under bars + focus “Doel:”). */
const SHOW_GOALS_KEY = '@macrio/diary_show_overview_goals';

function goalFor(profile: Profile, key: MacroKey): number | null {
  switch (key) {
    case 'kcal':
      return profile.goal_kcal;
    case 'carbs':
      return profile.goal_carbs;
    case 'protein':
      return profile.goal_protein;
    case 'fat':
      return profile.goal_fat;
  }
}

/** Bold number under a bar: kcal bare, macros with g. */
function formatGoalNumber(key: MacroKey, goal: number): string {
  if (key === 'kcal') return fmt(goal);
  return `${fmt(goal)}g`;
}

/** Focus line: "Doel: 2100" / "Goal: 140 g". */
function formatGoalAmount(key: MacroKey, goal: number): string {
  if (key === 'kcal') return fmt(goal);
  return `${fmt(goal)} g`;
}

/** Over goal when consumed is strictly above the target (same as progress bars). */
function isOverGoal(consumed: number, goal: number | null): boolean {
  return goal != null && goal > 0 && consumed > goal;
}

function display(
  profile: Profile,
  totals: MacroTotals,
  key: MacroKey
): { value: string; sub: string | null; consumed: number; goal: number | null } {
  const consumed = totals[key];
  const goal = goalFor(profile, key);
  const unit = key === 'kcal' ? '' : ' g';
  // Count down: big number is remaining; keep a short "left/over" label
  if (profile.count_direction === 'down' && goal != null) {
    return {
      value: fmt(Math.max(goal - consumed, 0)) + unit,
      sub: 'macros.remaining',
      consumed,
      goal,
    };
  }
  // Count up: eaten only (goals via tap-reveal under bars, or focus "Doel:")
  return {
    value: fmt(consumed) + unit,
    sub: null,
    consumed,
    goal,
  };
}

export function MacroSummary({
  totals,
  profile,
  onToggleMode,
  onFocusMacroChange,
}: {
  totals: MacroTotals;
  profile: Profile;
  onToggleMode: () => void;
  /** Diary meal list follows the focused macro (kcal / carbs / protein / fat). */
  onFocusMacroChange?: (key: MacroKey) => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const compactLabels = width < MACRO_COMPACT_WIDTH;
  const [focusIdx, setFocusIdx] = useState(0);
  // Hidden until AsyncStorage says the user previously revealed goals
  const [showGoals, setShowGoals] = useState(false);
  const [goalsReady, setGoalsReady] = useState(false);

  // Keep diary meal rows in sync with the focused macro
  useEffect(() => {
    onFocusMacroChange?.(MACROS[focusIdx]);
  }, [focusIdx, onFocusMacroChange]);

  // Restore last show/hide choice (missing key = hidden for first install)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SHOW_GOALS_KEY);
        if (!cancelled) setShowGoals(raw === '1');
      } finally {
        if (!cancelled) setGoalsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleShowGoals = useCallback(() => {
    setShowGoals((prev) => {
      const next = !prev;
      void AsyncStorage.setItem(SHOW_GOALS_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    setFocusIdx((i) => (i + 1) % MACROS.length);
  }, []);

  const goPrev = useCallback(() => {
    setFocusIdx((i) => (i + MACROS.length - 1) % MACROS.length);
  }, []);

  const focusGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-24, 24])
      .failOffsetY([-20, 20])
      .runOnJS(true)
      .onEnd((e) => {
        if (e.translationX <= -40) goNext();
        else if (e.translationX >= 40) goPrev();
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd(() => {
        goNext();
      });

    // Same preference as overview tap-reveal (does not steal single-tap macro cycle)
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .runOnJS(true)
      .onEnd(() => {
        if (goalsReady) toggleShowGoals();
      });

    const longPress = Gesture.LongPress()
      .minDuration(400)
      .runOnJS(true)
      .onEnd(() => {
        onToggleMode();
      });

    return Gesture.Exclusive(longPress, pan, doubleTap, tap);
  }, [goNext, goPrev, onToggleMode, goalsReady, toggleShowGoals]);

  if (profile.macro_display === 'focus') {
    const key = MACROS[focusIdx];
    const d = display(profile, totals, key);
    const over = isOverGoal(d.consumed, d.goal);
    return (
      <GestureDetector gesture={focusGesture}>
        <View style={styles.card}>
          <Text style={styles.focusLabel}>{macroDisplayLabel(t, key, false)}</Text>
          <Text style={[styles.focusValue, over && styles.valueOver]}>{d.value}</Text>
          {d.sub != null ? (
            <Text style={styles.focusSub}>
              {d.sub.startsWith('macros.') ? t(d.sub) : d.sub}
            </Text>
          ) : null}
          {d.goal != null ? (
            <View style={styles.focusBarWrap}>
              <ProgressBar
                consumed={d.consumed}
                goal={d.goal}
                overTone="soft"
                showMarker={showGoals}
              />
            </View>
          ) : null}
          <View style={styles.focusFooter}>
            <View style={styles.dots}>
              {MACROS.map((m, i) => (
                <View key={m} style={[styles.dot, i === focusIdx && styles.dotActive]} />
              ))}
            </View>
            {showGoals && d.goal != null ? (
              <Text style={styles.focusGoalFooter}>
                {t('macros.goalWithAmount', { amount: formatGoalAmount(key, d.goal) })}
              </Text>
            ) : null}
          </View>
        </View>
      </GestureDetector>
    );
  }

  // Overview: tap → toggle goal numbers; long-press → focus
  return (
    <Pressable
      style={styles.card}
      onPress={goalsReady ? toggleShowGoals : undefined}
      onLongPress={onToggleMode}
      delayLongPress={400}
    >
      <View style={styles.grid}>
        {MACROS.map((key) => {
          const d = display(profile, totals, key);
          const isKcal = key === 'kcal';
          // Overview: only kcal number goes red when over; other macros stay black
          const kcalOver = isKcal && isOverGoal(d.consumed, d.goal);
          return (
            <View key={key} style={styles.cell}>
              <View style={styles.cellValueSlot}>
                <Text
                  style={[
                    styles.cellValue,
                    isKcal && styles.cellValueKcal,
                    kcalOver && styles.valueOver,
                  ]}
                  numberOfLines={1}
                >
                  {d.value}
                </Text>
              </View>
              <View style={styles.cellLabelSlot}>
                <Text
                  style={[styles.cellLabel, compactLabels && styles.cellLabelCompact]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {macroDisplayLabel(t, key, compactLabels)}
                </Text>
              </View>
              {d.sub != null ? (
                <View style={styles.cellSubSlot}>
                  <Text style={styles.cellSub} numberOfLines={1}>
                    {d.sub.startsWith('macros.') ? t(d.sub) : d.sub}
                  </Text>
                </View>
              ) : null}
              <View style={styles.cellBarSlot}>
                {d.goal != null ? (
                  <ProgressBar
                    consumed={d.consumed}
                    goal={d.goal}
                    overTone="soft"
                    showMarker={showGoals}
                  />
                ) : (
                  <View style={styles.barSpacer} />
                )}
              </View>
              {showGoals ? (
                <View style={styles.cellGoalSlot}>
                  <Text style={styles.cellGoal} numberOfLines={1}>
                    {d.goal != null ? formatGoalNumber(key, d.goal) : '—'}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    marginHorizontal: spacing.l,
    marginBottom: spacing.m,
  },
  grid: { flexDirection: 'row', alignItems: 'flex-start' },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  // Fixed slots so progress bars line up across columns
  cellValueSlot: { height: 26, justifyContent: 'center', alignItems: 'center', width: '100%' },
  cellLabelSlot: { height: 18, justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: 2 },
  cellSubSlot: { height: 16, justifyContent: 'center', alignItems: 'center', width: '100%' },
  cellBarSlot: { width: '100%', marginTop: spacing.s },
  cellGoalSlot: { height: 16, justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: 4 },
  cellValue: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  cellValueKcal: { fontWeight: '900', color: colors.primaryDark },
  /** Strong red when consumed > goal (kcal in overview; any macro in focus). */
  valueOver: { color: colors.danger },
  cellLabel: { fontSize: 11, color: colors.muted, fontWeight: '700', textAlign: 'center' },
  cellLabelCompact: { fontSize: 10 },
  cellSub: { fontSize: 10, color: colors.faint, textAlign: 'center' },
  /** Revealed goal under each bar (bold black, no slash). */
  cellGoal: { fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center' },
  barSpacer: { height: 5 },
  focusLabel: { fontSize: 15, fontWeight: '700', color: colors.muted },
  focusValue: { fontSize: 48, fontWeight: '900', color: colors.primaryDark, marginTop: 4 },
  focusSub: { fontSize: 14, color: colors.faint, marginTop: 2 },
  focusBarWrap: { marginTop: spacing.m, width: '100%' },
  /** Dots left, Doel: … right on one line under the bar. */
  focusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.m,
    minHeight: 18,
  },
  focusGoalFooter: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
});
