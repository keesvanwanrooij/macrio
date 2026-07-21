// The diary header: overview mode (all 4 macros) or focus mode (one big, tap to cycle).
// Honors count up/down against optional goals.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fmt } from '../lib/nutrition';
import { colors, radius, spacing } from '../lib/theme';
import type { MacroTotals, Profile } from '../lib/types';

const MACROS = ['kcal', 'carbs', 'protein', 'fat'] as const;
type MacroKey = (typeof MACROS)[number];

function goalFor(profile: Profile, key: MacroKey): number | null {
  switch (key) {
    case 'kcal': return profile.goal_kcal;
    case 'carbs': return profile.goal_carbs;
    case 'protein': return profile.goal_protein;
    case 'fat': return profile.goal_fat;
  }
}

function display(profile: Profile, totals: MacroTotals, key: MacroKey): { value: string; sub: string } {
  const consumed = totals[key];
  const goal = goalFor(profile, key);
  const unit = key === 'kcal' ? '' : ' g';
  if (profile.count_direction === 'down' && goal != null) {
    return { value: fmt(Math.max(goal - consumed, 0)) + unit, sub: 'macros.remaining' };
  }
  return {
    value: fmt(consumed) + unit,
    sub: goal != null ? `/ ${fmt(goal)}${unit}` : 'macros.consumed',
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
  const [focusIdx, setFocusIdx] = useState(0);

  if (profile.macro_display === 'focus') {
    const key = MACROS[focusIdx];
    const d = display(profile, totals, key);
    return (
      <Pressable style={styles.card} onPress={() => setFocusIdx((focusIdx + 1) % MACROS.length)}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.focusLabel}>{t(`macros.${key}`)}</Text>
          <Pressable onPress={onToggleMode} hitSlop={12}>
            <Text style={styles.toggle}>⊞</Text>
          </Pressable>
        </View>
        <Text style={styles.focusValue}>{d.value}</Text>
        <Text style={styles.focusSub}>{d.sub.startsWith('macros.') ? t(d.sub) : d.sub}</Text>
        <View style={styles.dots}>
          {MACROS.map((m, i) => (
            <View key={m} style={[styles.dot, i === focusIdx && styles.dotActive]} />
          ))}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.card} onPress={onToggleMode}>
      <View style={styles.grid}>
        {MACROS.map((key) => {
          const d = display(profile, totals, key);
          return (
            <View key={key} style={styles.cell}>
              <Text style={[styles.cellValue, key === 'kcal' && { color: colors.primaryDark }]}>
                {d.value}
              </Text>
              <Text style={styles.cellLabel}>{t(`macros.${key}Short`)}</Text>
              <Text style={styles.cellSub}>{d.sub.startsWith('macros.') ? t(d.sub) : d.sub}</Text>
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
  grid: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center' },
  cellValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  cellLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cellSub: { fontSize: 10, color: colors.faint },
  focusLabel: { fontSize: 14, fontWeight: '700', color: colors.muted },
  focusValue: { fontSize: 44, fontWeight: '900', color: colors.primaryDark, marginTop: 4 },
  focusSub: { fontSize: 13, color: colors.faint },
  toggle: { fontSize: 20, color: colors.muted },
  dots: { flexDirection: 'row', gap: 6, marginTop: spacing.s },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
});
