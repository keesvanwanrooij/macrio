/*
 * SECTION: Diary macro summary header
 * WHAT: Overview (all 4 macros + progress) or focus (one big macro).
 * HOW: Overview: long-press → focus. Focus: tap = next macro; swipe L/R =
 *      next/prev; long-press → overview. Count up/down vs goals.
 * INPUT: totals, profile, onToggleMode (long-press toggles overview ↔ focus)
 * OUTPUT: Card UI
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

import { fmt } from '../lib/nutrition';
import { MACRO_COMPACT_WIDTH, macroDisplayLabel, type MacroKey } from '../lib/macroLabels';
import { colors, radius, spacing } from '../lib/theme';
import type { MacroTotals, Profile } from '../lib/types';
import { ProgressBar } from './ProgressBar'; // shared with reports day bars

const MACROS = ['kcal', 'carbs', 'protein', 'fat'] as const;

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

function display(
  profile: Profile,
  totals: MacroTotals,
  key: MacroKey
): { value: string; sub: string; consumed: number; goal: number | null } {
  const consumed = totals[key];
  const goal = goalFor(profile, key);
  const unit = key === 'kcal' ? '' : ' g';
  if (profile.count_direction === 'down' && goal != null) {
    return {
      value: fmt(Math.max(goal - consumed, 0)) + unit,
      sub: 'macros.remaining',
      consumed,
      goal,
    };
  }
  return {
    value: fmt(consumed) + unit,
    sub: goal != null ? `/ ${fmt(goal)}${unit}` : 'macros.consumed',
    consumed,
    goal,
  };
}

export function MacroSummary({
  totals,
  profile,
  onToggleMode,
}: {
  totals: MacroTotals;
  profile: Profile;
  onToggleMode: () => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const compactLabels = width < MACRO_COMPACT_WIDTH;
  const [focusIdx, setFocusIdx] = useState(0);

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

    const longPress = Gesture.LongPress()
      .minDuration(400)
      .runOnJS(true)
      .onEnd(() => {
        onToggleMode();
      });

    return Gesture.Exclusive(longPress, pan, tap);
  }, [goNext, goPrev, onToggleMode]);

  if (profile.macro_display === 'focus') {
    const key = MACROS[focusIdx];
    const d = display(profile, totals, key);
    return (
      <GestureDetector gesture={focusGesture}>
        <View style={styles.card}>
          <Text style={styles.focusLabel}>{macroDisplayLabel(t, key, false)}</Text>
          <Text style={styles.focusValue}>{d.value}</Text>
          <Text style={styles.focusSub}>{d.sub.startsWith('macros.') ? t(d.sub) : d.sub}</Text>
          {d.goal != null ? (
            <View style={styles.focusBarWrap}>
              <ProgressBar consumed={d.consumed} goal={d.goal} overTone="soft" />
            </View>
          ) : null}
          <View style={styles.dots}>
            {MACROS.map((m, i) => (
              <View key={m} style={[styles.dot, i === focusIdx && styles.dotActive]} />
            ))}
          </View>
        </View>
      </GestureDetector>
    );
  }

  // Overview: long-press only → focus (short press does nothing)
  return (
    <Pressable style={styles.card} onLongPress={onToggleMode} delayLongPress={400}>
      <View style={styles.grid}>
        {MACROS.map((key) => {
          const d = display(profile, totals, key);
          const isKcal = key === 'kcal';
          return (
            <View key={key} style={styles.cell}>
              <View style={styles.cellValueSlot}>
                <Text style={[styles.cellValue, isKcal && styles.cellValueKcal]} numberOfLines={1}>
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
              <View style={styles.cellSubSlot}>
                <Text style={styles.cellSub} numberOfLines={1}>
                  {d.sub.startsWith('macros.') ? t(d.sub) : d.sub}
                </Text>
              </View>
              <View style={styles.cellBarSlot}>
                {d.goal != null ? (
                  <ProgressBar consumed={d.consumed} goal={d.goal} overTone="soft" />
                ) : (
                  <View style={styles.barSpacer} />
                )}
              </View>
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
  cellValue: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  cellValueKcal: { fontWeight: '900', color: colors.primaryDark },
  cellLabel: { fontSize: 11, color: colors.muted, fontWeight: '700', textAlign: 'center' },
  cellLabelCompact: { fontSize: 10 },
  cellSub: { fontSize: 10, color: colors.faint, textAlign: 'center' },
  barSpacer: { height: 5 },
  focusLabel: { fontSize: 15, fontWeight: '700', color: colors.muted },
  focusValue: { fontSize: 48, fontWeight: '900', color: colors.primaryDark, marginTop: 4 },
  focusSub: { fontSize: 14, color: colors.faint, marginTop: 2 },
  focusBarWrap: { marginTop: spacing.m, width: '100%' },
  dots: { flexDirection: 'row', gap: 6, marginTop: spacing.m },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
});
