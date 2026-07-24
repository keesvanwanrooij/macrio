/*
 * SECTION: Goal macro editor (unified % model)
 * WHAT: Shared onboarding/Settings control for daily kcal + macros.
 * HOW:
 *   1) lockedPercents = source of truth for sliders (default 50/20/30 C/P/F)
 *   2) Edit kcal → keep % → rescale all grams (bars stay)
 *   3) Edit one gram → other grams stay; kcal = P×4+C×4+F×9; recompute %
 *   4) Move slider or edit % box → ring C→P→F→C; kcal fixed; grams follow %
 *   5) Grey hint under row: kcal · g/kg (no %; % has its own input)
 * INPUT: GoalFields, weightKg (for g/kg hints), onChange; optional percentResetKey / hideKcalField
 * OUTPUT: updated GoalFields (Settings flushes on leave / panel switch; onboarding on Start)
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';

import { Field } from './ui';
import {
  DEFAULT_MACRO_PERCENTS,
  applyPercentRingChange,
  gPerKg,
  goalsFromPercents,
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

export type GoalMacroEditorHandle = {
  /** Apply a kcal edit while keeping the locked % split (Settings shared kcal box). */
  setKcalRaw: (raw: string) => void;
};

type Props = {
  value: GoalFields;
  onChange: (next: GoalFields) => void;
  weightKg: number;
  /**
   * Bump when the body calculator finishes.
   * Forces locked % back to default 50/20/30 (ignores previous slider split).
   */
  percentResetKey?: number;
  /** Parent owns the Calorieën field (Settings / onboarding); hide the duplicate here. */
  hideKcalField?: boolean;
};

type PercentMacro = 'protein' | 'carbs' | 'fat';

const MACRO_ROWS: { key: PercentMacro; labelKey: string }[] = [
  { key: 'carbs', labelKey: 'settings.goalCarbs' },
  { key: 'protein', labelKey: 'settings.goalProtein' },
  { key: 'fat', labelKey: 'settings.goalFat' },
];

export const GoalMacroEditor = forwardRef<GoalMacroEditorHandle, Props>(function GoalMacroEditor(
  {
    value,
    onChange,
    weightKg,
    percentResetKey = 0,
    hideKcalField = false,
  },
  ref
) {
  const { t } = useTranslation();
  const hasWeight = weightKg > 0;
  const valueRef = useRef(value);
  // Fingerprint of the last fields *we* pushed via onChange (ignore those in the sync effect)
  const lastOwnEditRef = useRef<string | null>(null);
  const lastResetKeyRef = useRef(percentResetKey);

  const [lockedPercents, setLockedPercents] = useState<MacroPercents>(DEFAULT_MACRO_PERCENTS);
  const [dragPercent, setDragPercent] = useState<Partial<Record<PercentMacro, number>>>({});
  /** Raw % text while typing (avoids fighting the ring on every keystroke mid-edit). */
  const [percentDraft, setPercentDraft] = useState<Partial<Record<PercentMacro, string>>>({});

  const kcal = parseNum(value.kcal);
  const protein = parseNum(value.protein);
  const carbs = parseNum(value.carbs);
  const fat = parseNum(value.fat);

  function fieldsFingerprint(fields: GoalFields): string {
    return `${fields.kcal}|${fields.protein}|${fields.carbs}|${fields.fat}`;
  }

  // Body calculator finished → always snap bars to 50/20/30 (product rule)
  useEffect(() => {
    if (percentResetKey === lastResetKeyRef.current) return;
    lastResetKeyRef.current = percentResetKey;
    setLockedPercents(DEFAULT_MACRO_PERCENTS);
    setDragPercent({});
    setPercentDraft({});
  }, [percentResetKey]);

  /*
   * Sync locked % when parent replaces goals (profile load / draft swap),
   * but never override a fresh calculator reset (handled above).
   */
  useEffect(() => {
    valueRef.current = value;
    const fp = fieldsFingerprint(value);
    if (lastOwnEditRef.current === fp) return;

    // Calculator just reset: keep DEFAULT even if grams briefly lag
    if (percentResetKey !== lastResetKeyRef.current) {
      lastOwnEditRef.current = fp;
      return;
    }
    // After calculator reset key is applied, prefer DEFAULT when grams match default split
    if (kcal > 0 && (protein > 0 || carbs > 0 || fat > 0)) {
      const fromGrams = percentsFromGrams(kcal, protein, carbs, fat);
      setLockedPercents(isReliablePercentSplit(fromGrams) ? fromGrams : DEFAULT_MACRO_PERCENTS);
    } else if (!(kcal > 0)) {
      setLockedPercents(DEFAULT_MACRO_PERCENTS);
    }
    lastOwnEditRef.current = fp;
  }, [value.kcal, value.protein, value.carbs, value.fat, kcal, protein, carbs, fat, percentResetKey]);

  const activePercents: MacroPercents = lockedPercents;

  const scaleMax = Math.max(
    percentScaleMax(activePercents),
    dragPercent.protein ?? 0,
    dragPercent.carbs ?? 0,
    dragPercent.fat ?? 0
  );

  function commitFields(next: GoalFields) {
    lastOwnEditRef.current = fieldsFingerprint(next);
    valueRef.current = next;
    onChange(next);
  }

  /** Keep typed kcal raw; fill grams from % (or zeros when kcal empty/0). */
  function fieldsFromLockedPercents(kcalValue: number, percents: MacroPercents, kcalRaw: string): GoalFields {
    if (!(kcalValue > 0)) {
      return { kcal: kcalRaw, protein: '0', carbs: '0', fat: '0' };
    }
    return { ...goalsFromPercents(kcalValue, percents), kcal: kcalRaw };
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
      const split = lockedPercents;
      if (trimmed !== '' && Number.isFinite(n) && n > 0) {
        commitFields(fieldsFromLockedPercents(n, split, raw));
        return;
      }
      // Empty or 0 kcal → gram fields 0; sliders keep locked %
      commitFields({ kcal: raw, protein: '0', carbs: '0', fat: '0' });
      return;
    }

    // Edit one gram → other two grams stay; kcal = sum; recompute locked %
    if (key === 'protein' || key === 'carbs' || key === 'fat') {
      const cur = valueRef.current;
      const n = trimmed === '' ? 0 : Number(String(raw).replace(',', '.'));
      if (trimmed !== '' && (!Number.isFinite(n) || n < 0)) return;

      const p = key === 'protein' ? n : parseNum(cur.protein);
      const c = key === 'carbs' ? n : parseNum(cur.carbs);
      const f = key === 'fat' ? n : parseNum(cur.fat);
      const nextKcal = Math.round(macroGramsToKcal(p, c, f));

      const next: GoalFields = {
        kcal: nextKcal > 0 ? String(nextKcal) : trimmed === '' ? cur.kcal : String(nextKcal),
        protein: key === 'protein' ? raw : String(Math.round(p)),
        carbs: key === 'carbs' ? raw : String(Math.round(c)),
        fat: key === 'fat' ? raw : String(Math.round(f)),
      };
      if (nextKcal > 0) {
        setLockedPercents(percentsFromGrams(nextKcal, p, c, f));
      }
      commitFields(next);
    }
  }

  useImperativeHandle(ref, () => ({
    setKcalRaw: (raw: string) => setField('kcal', raw),
  }));

  function percentDisplay(macro: PercentMacro): number {
    if (dragPercent[macro] != null) return dragPercent[macro]!;
    return Math.min(scaleMax, Math.max(0, activePercents[macro]));
  }

  function onPercentChange(macro: PercentMacro, pct: number) {
    const base = lockedPercents;
    const ring = applyPercentRingChange(base, macro, pct);
    setLockedPercents(ring);
    setDragPercent((prev) => ({ ...prev, [macro]: pct }));
    if (kcal > 0) {
      commitFields(fieldsFromLockedPercents(kcal, ring, value.kcal));
    }
  }

  function onPercentComplete(macro: PercentMacro, pct: number) {
    setDragPercent((prev) => {
      const n = { ...prev };
      delete n[macro];
      return n;
    });
    const base = lockedPercents;
    const ring = applyPercentRingChange(base, macro, pct);
    setLockedPercents(ring);
    if (kcal > 0) {
      commitFields(fieldsFromLockedPercents(kcal, ring, value.kcal));
    }
  }

  function resetToDefaultPercents() {
    setLockedPercents(DEFAULT_MACRO_PERCENTS);
    setDragPercent({});
    setPercentDraft({});
    if (kcal > 0) {
      commitFields(fieldsFromLockedPercents(kcal, DEFAULT_MACRO_PERCENTS, value.kcal));
    }
  }

  // Hide reset when bars already match default 50/20/30 (rounded; float drift from grams)
  const isDefaultSplit =
    Math.round(activePercents.carbs) === DEFAULT_MACRO_PERCENTS.carbs &&
    Math.round(activePercents.protein) === DEFAULT_MACRO_PERCENTS.protein &&
    Math.round(activePercents.fat) === DEFAULT_MACRO_PERCENTS.fat;

  function onPercentTextChange(macro: PercentMacro, raw: string) {
    setPercentDraft((prev) => ({ ...prev, [macro]: raw }));
    if (raw.trim() === '') return;
    const n = Number(String(raw).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return;
    onPercentComplete(macro, n);
  }

  function macroRow(macro: PercentMacro, labelKey: string) {
    const grams = parseNum(value[macro]);
    const kcalPart = gramsToKcal(macro, grams);
    const pctShown = percentDisplay(macro);
    const pctText = percentDraft[macro] ?? String(Math.round(pctShown));
    const perKg = hasWeight && grams > 0 ? gPerKg(grams, weightKg) : null;

    return (
      <View key={macro} style={styles.macroBlock}>
        <View style={styles.macroHeader}>
          <Text style={styles.macroLabel} numberOfLines={1}>
            {t(labelKey)}
          </Text>
          <View style={styles.macroInputs}>
            <TextInput
              value={pctText}
              onChangeText={(v) => onPercentTextChange(macro, v)}
              onBlur={() =>
                setPercentDraft((prev) => {
                  const next = { ...prev };
                  delete next[macro];
                  return next;
                })
              }
              keyboardType="numeric"
              placeholderTextColor={colors.faint}
              style={styles.macroInput}
              accessibilityLabel={t('goalsCalc.percentInputLabel')}
            />
            <Text style={styles.inputUnit}>%</Text>
            <TextInput
              value={value[macro]}
              onChangeText={(v) => setField(macro, v)}
              keyboardType="numeric"
              placeholderTextColor={colors.faint}
              style={styles.macroInput}
              accessibilityLabel={t(labelKey)}
            />
            <Text style={styles.inputUnit}>g</Text>
          </View>
        </View>
        <Text style={styles.kcalHint} numberOfLines={1}>
          {t('goalsCalc.macroKcal', { kcal: Math.round(kcalPart) })}
          {perKg != null ? ` · ${t('goalsCalc.perKg', { value: perKg.toFixed(1) })}` : ''}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={scaleMax}
          step={1}
          value={pctShown}
          onValueChange={(v) => {
            setPercentDraft((prev) => {
              if (prev[macro] == null) return prev;
              const next = { ...prev };
              delete next[macro];
              return next;
            });
            onPercentChange(macro, v);
          }}
          onSlidingComplete={(v) => onPercentComplete(macro, v)}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primaryDark}
          accessibilityLabel={t(labelKey)}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {!hideKcalField ? (
        <Field
          label={t('settings.goalKcal')}
          value={value.kcal}
          onChangeText={(v) => setField('kcal', v)}
          keyboardType="numeric"
        />
      ) : null}
      {MACRO_ROWS.map((row) => macroRow(row.key, row.labelKey))}
      {!isDefaultSplit ? (
        <Text style={styles.resetLink} onPress={resetToDefaultPercents}>
          {t('settings.resetMacrosDefault')}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.s },
  macroBlock: { marginBottom: spacing.xs },
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
  macroInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroInput: {
    width: 64,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    minHeight: 34,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
    color: colors.text,
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginRight: 2,
  },
  // Tight stack: label row → kcal·g/kg → slider
  kcalHint: { fontSize: 11, color: colors.faint, marginTop: 0, marginBottom: 0, lineHeight: 14 },
  slider: { width: '100%', height: 22, marginTop: 0 },
  resetLink: {
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 14,
    marginTop: spacing.xs,
    marginBottom: spacing.s,
  },
});
