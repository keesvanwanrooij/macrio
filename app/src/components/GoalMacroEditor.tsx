/*
 * SECTION: Goal macro editor (kcal + g/kg sliders + grams)
 * WHAT: Shared onboarding/Settings control for daily kcal and P/C/F targets.
 * HOW: Cascade via applyGoalFieldChange; local drag g/kg so thumbs do not fight Math.floor;
 *      remount carbs slider only after P/F/kcal finish (not every drag tick).
 * INPUT: field strings, weightKg, weightGoal, onChange
 * OUTPUT: updated GoalFields (parent persists)
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';

import { Field } from './ui';
import {
  FAT_G_PER_KG_RANGE,
  PROTEIN_G_PER_KG_RANGE,
  applyGoalFieldChange,
  gPerKg,
  gramsToKcal,
  isKcalOutOfBalance,
  type GoalFieldKey,
  type GoalFields,
  type WeightGoal,
} from '../lib/goalCalculator';
import { parseNum } from '../lib/nutrition';
import { colors, radius, spacing } from '../lib/theme';

type Props = {
  value: GoalFields;
  onChange: (next: GoalFields) => void;
  weightKg: number;
  weightGoal?: WeightGoal;
};

type MacroKey = 'protein' | 'carbs' | 'fat';

const RAILS: Record<MacroKey, { min: number; max: number }> = {
  protein: PROTEIN_G_PER_KG_RANGE,
  fat: FAT_G_PER_KG_RANGE,
  carbs: { min: 2, max: 8 },
};

/** Slider → grams: round so the thumb does not snap back against floor(). */
function gramsFromSlider(gPerKgValue: number, weightKg: number): number {
  return Math.max(0, Math.round(gPerKgValue * weightKg));
}

export function GoalMacroEditor({ value, onChange, weightKg, weightGoal = 'maintain' }: Props) {
  const { t } = useTranslation();
  const hasWeight = weightKg > 0;
  // Keep latest fields for rapid slider ticks (avoid stale closure overwrites).
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  // While dragging, drive the thumb from this local g/kg (avoids controlled snap-back).
  const [dragGPerKg, setDragGPerKg] = useState<Partial<Record<MacroKey, number>>>({});
  // Remount carbs once after external cascade, not on every P/F tick (that caused glitch).
  const [carbsSliderEpoch, setCarbsSliderEpoch] = useState(0);

  function setField(key: GoalFieldKey, raw: string, syncCarbsSlider = false) {
    const trimmed = raw.trim();
    if (trimmed !== '') {
      const n = Number(String(trimmed).replace(',', '.'));
      if (Number.isFinite(n) && n <= 0) return;
    }
    const prevCarbs = valueRef.current.carbs;
    const next = applyGoalFieldChange(valueRef.current, key, raw, weightKg, weightGoal);
    valueRef.current = next;
    if (syncCarbsSlider && key !== 'carbs' && next.carbs !== prevCarbs) {
      setCarbsSliderEpoch((e) => e + 1);
    }
    onChange(next);
  }

  function gramsToSlider(macro: MacroKey): number {
    const grams = parseNum(value[macro]);
    const current = gPerKg(grams, weightKg);
    const rail = RAILS[macro];
    return Math.min(rail.max, Math.max(rail.min, current || rail.min));
  }

  function sliderDisplayValue(macro: MacroKey): number {
    const dragged = dragGPerKg[macro];
    if (dragged != null) return dragged;
    return gramsToSlider(macro);
  }

  function onSliderChange(macro: MacroKey, gPerKgValue: number) {
    setDragGPerKg((prev) => ({ ...prev, [macro]: gPerKgValue }));
    // Live update numbers + cascade; do not remount carbs mid-drag.
    setField(macro, String(gramsFromSlider(gPerKgValue, weightKg)), false);
  }

  function onSliderComplete(macro: MacroKey, gPerKgValue: number) {
    setDragGPerKg((prev) => {
      const next = { ...prev };
      delete next[macro];
      return next;
    });
    setField(macro, String(gramsFromSlider(gPerKgValue, weightKg)), false);
    // Sync carbs thumb once after P/F drag (numbers already cascaded during drag).
    if (macro === 'protein' || macro === 'fat') {
      setCarbsSliderEpoch((e) => e + 1);
    }
  }

  const protein = parseNum(value.protein);
  const carbs = parseNum(value.carbs);
  const fat = parseNum(value.fat);
  const kcal = parseNum(value.kcal);
  const balanceWarn =
    value.protein.trim() !== '' &&
    value.carbs.trim() !== '' &&
    value.fat.trim() !== '' &&
    isKcalOutOfBalance(kcal, protein, carbs, fat);

  function macroRow(macro: MacroKey, labelKey: string) {
    const grams = parseNum(value[macro]);
    const kcalPart = gramsToKcal(macro, grams);
    const perKg = hasWeight && grams > 0 ? gPerKg(grams, weightKg) : null;
    const rail = RAILS[macro];

    return (
      <View key={macro} style={styles.macroBlock}>
        <View style={styles.macroHeader}>
          <Text style={styles.macroLabel} numberOfLines={1}>
            {t(labelKey)}
          </Text>
          <TextInput
            value={value[macro]}
            onChangeText={(v) => setField(macro, v, macro !== 'carbs')}
            keyboardType="numeric"
            placeholderTextColor={colors.faint}
            style={styles.macroInput}
          />
        </View>
        <Text style={styles.kcalHint}>
          {t('goalsCalc.macroKcal', { kcal: Math.round(kcalPart) })}
          {perKg != null ? ` · ${perKg.toFixed(1)} g/kg` : ''}
        </Text>
        {hasWeight ? (
          <Slider
            key={macro === 'carbs' ? `carbs-${carbsSliderEpoch}` : macro}
            style={styles.slider}
            minimumValue={rail.min}
            maximumValue={rail.max}
            step={0.1}
            value={sliderDisplayValue(macro)}
            onValueChange={(v) => onSliderChange(macro, v)}
            onSlidingComplete={(v) => onSliderComplete(macro, v)}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primaryDark}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Field
        label={t('settings.goalKcal')}
        value={value.kcal}
        onChangeText={(v) => setField('kcal', v, true)}
        keyboardType="numeric"
      />
      <Text style={styles.hint}>{t('goalsCalc.kcalDrivesMacros')}</Text>
      {!hasWeight ? <Text style={styles.hint}>{t('goalsCalc.needWeightForSliders')}</Text> : null}

      {macroRow('protein', 'settings.goalProtein')}
      {macroRow('fat', 'settings.goalFat')}
      {macroRow('carbs', 'settings.goalCarbs')}

      {balanceWarn ? <Text style={styles.warn}>{t('goalsCalc.kcalBalanceWarn')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.s },
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.m,
    lineHeight: 16,
    marginTop: -spacing.s,
  },
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
  kcalHint: { fontSize: 11, color: colors.faint, marginTop: 4, marginBottom: 0 },
  slider: { width: '100%', height: 28, marginTop: 2 },
  warn: { fontSize: 13, color: colors.warn, marginTop: spacing.xs },
});
