/*
 * SECTION: Goal macro editor (unified % model)
 * WHAT: Shared onboarding/Settings control for daily kcal + macros.
 * HOW:
 *   1) lockedPercents = source of truth for sliders (default 50/20/30 C/P/F)
 *   2) Edit kcal → keep % → rescale all grams (bars stay)
 *   3) Edit one gram → other grams stay; kcal = P×4+C×4+F×9; recompute %
 *   4) Move slider → ring C→P→F→C; kcal fixed; grams follow %
 * INPUT: GoalFields, weightKg (for g/kg hints), onChange
 * OUTPUT: updated GoalFields (parent persists on Save)
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';

import { Field } from './ui';
import {
  DEFAULT_MACRO_PERCENTS,
  applyPercentRingChange,
  gPerKg,
  gramsFromPercents,
  gramsToKcal,
  isReliablePercentSplit,
  macroGramsToKcal,
  percentScaleMax,
  percentsFromGrams,
  type GoalFieldKey,
  type GoalFields,
  type MacroPercents,
} from '../lib/goalCalculator';
import { parseNum } from '../lib/nutrition';
import { colors, radius, spacing } from '../lib/theme';

type Props = {
  value: GoalFields;
  onChange: (next: GoalFields) => void;
  weightKg: number;
};

type PercentMacro = 'protein' | 'carbs' | 'fat';

export function GoalMacroEditor({ value, onChange, weightKg }: Props) {
  const { t } = useTranslation();
  const hasWeight = weightKg > 0;
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const [lockedPercents, setLockedPercents] = useState<MacroPercents | null>(null);
  const [dragPercent, setDragPercent] = useState<Partial<Record<PercentMacro, number>>>({});

  const kcal = parseNum(value.kcal);
  const protein = parseNum(value.protein);
  const carbs = parseNum(value.carbs);
  const fat = parseNum(value.fat);

  // Seed locked % once from reliable grams, else default 50/20/30
  useEffect(() => {
    setLockedPercents((prev) => {
      if (prev) return prev;
      if (kcal > 0 && (protein > 0 || carbs > 0 || fat > 0)) {
        const fromGrams = percentsFromGrams(kcal, protein, carbs, fat);
        if (isReliablePercentSplit(fromGrams)) return fromGrams;
      }
      return DEFAULT_MACRO_PERCENTS;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once on mount
  }, []);

  const activePercents: MacroPercents = lockedPercents ?? DEFAULT_MACRO_PERCENTS;

  const scaleMax = Math.max(
    percentScaleMax(activePercents),
    dragPercent.protein ?? 0,
    dragPercent.carbs ?? 0,
    dragPercent.fat ?? 0
  );

  function commitFields(next: GoalFields) {
    valueRef.current = next;
    onChange(next);
  }

  function gramsFieldsFromPercents(kcalValue: number, percents: MacroPercents, kcalRaw: string): GoalFields {
    if (!(kcalValue > 0)) {
      return { kcal: kcalRaw, protein: '0', carbs: '0', fat: '0' };
    }
    const grams = gramsFromPercents(kcalValue, percents);
    return {
      kcal: kcalRaw,
      protein: String(grams.protein),
      carbs: String(grams.carbs),
      fat: String(grams.fat),
    };
  }

  function setField(key: GoalFieldKey, raw: string) {
    const trimmed = raw.trim();
    if (trimmed !== '') {
      const n = Number(String(trimmed).replace(',', '.'));
      if (Number.isFinite(n) && n < 0) return;
    }

    // Edit kcal → keep locked % → rescale grams (bars stay)
    if (key === 'kcal') {
      const n = trimmed === '' ? NaN : Number(String(trimmed).replace(',', '.'));
      const split = lockedPercents ?? DEFAULT_MACRO_PERCENTS;
      if (!lockedPercents) setLockedPercents(split);
      if (trimmed !== '' && Number.isFinite(n) && n > 0) {
        commitFields(gramsFieldsFromPercents(n, split, raw));
        return;
      }
      // Empty or 0 kcal → gram fields 0; sliders keep locked %
      commitFields({ kcal: raw, protein: '0', carbs: '0', fat: '0' });
      return;
    }

    // Edit one gram → other two grams stay; kcal = sum; recompute locked %
    if (key === 'protein' || key === 'carbs' || key === 'fat') {
      const cur = valueRef.current;
      if (trimmed === '') {
        // Empty → treat as 0 for math; leave field empty for typing; recompute kcal + %
        const p = key === 'protein' ? 0 : parseNum(cur.protein);
        const c = key === 'carbs' ? 0 : parseNum(cur.carbs);
        const f = key === 'fat' ? 0 : parseNum(cur.fat);
        const nextKcal = Math.round(macroGramsToKcal(p, c, f));
        const next: GoalFields = {
          kcal: nextKcal > 0 ? String(nextKcal) : cur.kcal,
          protein: key === 'protein' ? raw : cur.protein,
          carbs: key === 'carbs' ? raw : cur.carbs,
          fat: key === 'fat' ? raw : cur.fat,
        };
        if (nextKcal > 0) {
          setLockedPercents(percentsFromGrams(nextKcal, p, c, f));
        }
        commitFields(next);
        return;
      }
      const n = Number(String(raw).replace(',', '.'));
      if (!Number.isFinite(n) || n < 0) return;
      const p = key === 'protein' ? n : parseNum(cur.protein);
      const c = key === 'carbs' ? n : parseNum(cur.carbs);
      const f = key === 'fat' ? n : parseNum(cur.fat);
      const nextKcal = Math.round(macroGramsToKcal(p, c, f));
      const next: GoalFields = {
        kcal: String(nextKcal),
        protein: key === 'protein' ? raw : String(Math.round(p)),
        carbs: key === 'carbs' ? raw : String(Math.round(c)),
        fat: key === 'fat' ? raw : String(Math.round(f)),
      };
      // Keep typed raw in the edited box; round the other two for display consistency
      if (key === 'protein') next.protein = raw;
      if (key === 'carbs') next.carbs = raw;
      if (key === 'fat') next.fat = raw;
      if (nextKcal > 0) {
        setLockedPercents(percentsFromGrams(nextKcal, p, c, f));
      }
      commitFields(next);
    }
  }

  function percentDisplay(macro: PercentMacro): number {
    if (dragPercent[macro] != null) return dragPercent[macro]!;
    return Math.min(scaleMax, Math.max(0, activePercents[macro]));
  }

  function onPercentChange(macro: PercentMacro, pct: number) {
    const base = lockedPercents ?? activePercents;
    const ring = applyPercentRingChange(base, macro, pct);
    setLockedPercents(ring);
    setDragPercent((prev) => ({ ...prev, [macro]: pct }));
    if (kcal > 0) {
      commitFields(gramsFieldsFromPercents(kcal, ring, value.kcal));
    }
  }

  function onPercentComplete(macro: PercentMacro, pct: number) {
    setDragPercent((prev) => {
      const n = { ...prev };
      delete n[macro];
      return n;
    });
    const base = lockedPercents ?? activePercents;
    const ring = applyPercentRingChange(base, macro, pct);
    setLockedPercents(ring);
    if (kcal > 0) {
      commitFields(gramsFieldsFromPercents(kcal, ring, value.kcal));
    }
  }

  function macroHeader(macro: PercentMacro, labelKey: string) {
    const grams = parseNum(value[macro]);
    const kcalPart = gramsToKcal(macro, grams);
    const pct = activePercents[macro];
    const perKg = hasWeight && grams > 0 ? gPerKg(grams, weightKg) : null;

    return (
      <>
        <View style={styles.macroHeader}>
          <Text style={styles.macroLabel} numberOfLines={1}>
            {t(labelKey)}
          </Text>
          <TextInput
            value={value[macro]}
            onChangeText={(v) => setField(macro, v)}
            keyboardType="numeric"
            placeholderTextColor={colors.faint}
            style={styles.macroInput}
            accessibilityLabel={t(labelKey)}
          />
        </View>
        <Text style={styles.kcalHint}>
          {t('goalsCalc.macroKcal', { kcal: Math.round(kcalPart) })}
          {` · ${t('goalsCalc.percentOfKcal', { value: pct.toFixed(0) })}`}
          {perKg != null ? ` · ${t('goalsCalc.perKg', { value: perKg.toFixed(1) })}` : ''}
        </Text>
      </>
    );
  }

  return (
    <View style={styles.wrap}>
      <Field
        label={t('settings.goalKcal')}
        value={value.kcal}
        onChangeText={(v) => setField('kcal', v)}
        keyboardType="numeric"
      />

      <View style={styles.macroBlock}>
        {macroHeader('carbs', 'settings.goalCarbs')}
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={scaleMax}
          step={1}
          value={percentDisplay('carbs')}
          onValueChange={(v) => onPercentChange('carbs', v)}
          onSlidingComplete={(v) => onPercentComplete('carbs', v)}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primaryDark}
          accessibilityLabel={t('settings.goalCarbs')}
        />
      </View>

      <View style={styles.macroBlock}>
        {macroHeader('protein', 'settings.goalProtein')}
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={scaleMax}
          step={1}
          value={percentDisplay('protein')}
          onValueChange={(v) => onPercentChange('protein', v)}
          onSlidingComplete={(v) => onPercentComplete('protein', v)}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primaryDark}
          accessibilityLabel={t('settings.goalProtein')}
        />
      </View>

      <View style={styles.macroBlock}>
        {macroHeader('fat', 'settings.goalFat')}
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={scaleMax}
          step={1}
          value={percentDisplay('fat')}
          onValueChange={(v) => onPercentChange('fat', v)}
          onSlidingComplete={(v) => onPercentComplete('fat', v)}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primaryDark}
          accessibilityLabel={t('settings.goalFat')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.s },
  macroBlock: { marginBottom: spacing.m },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.m,
  },
  macroLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  macroInput: {
    width: 80,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s - 2,
    minHeight: 40,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 20,
    color: colors.text,
    textAlign: 'center',
  },
  // Compact: ~4–6 px between hint and slider; keep margin between macro blocks
  kcalHint: { fontSize: 11, color: colors.faint, marginTop: 2, marginBottom: 0 },
  slider: { width: '100%', height: 28, marginTop: 4 },
});
