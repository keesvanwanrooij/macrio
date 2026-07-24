/*
 * SECTION: Body-based daily goal calculator
 * WHAT: Mifflin form; fills kcal (+ macros 50/20/30 on explicit calculate).
 * HOW: Hard ≤0 under fields; soft unusual height/weight after blur; soft age <16 always (still calculates)
 *      → age from DOB → calculateDailyGoals → onCalculated / onAutoCalculated
 * INPUT: profile; controlled weight/height/DOB from parent (Settings/onboarding); onCalculated
 * OUTPUT: { goals: GoalCalcResult, body: BodyMetricsDraft } (caller decides what to persist)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { NativeDatePicker } from './NativeDatePicker';
import { Button, Chip, Field } from './ui';
import { isoToDate, isIsoDate, resolveDateFormat, todayIso } from '../lib/dates';
import {
  ACTIVITIES,
  GENDERS,
  WEIGHT_GOALS,
  ageFromDateOfBirth,
  bodyMetricHardError,
  bodyMetricHardI18nKey,
  calculateDailyGoals,
  isActivityLevel,
  isGender,
  isWeightGoal,
  softAgeYoung,
  softHeightUnusual,
  softWeightUnusual,
  type ActivityLevel,
  type BodyMetricHardError,
  type BodyMetricsDraft,
  type Gender,
  type GoalCalcResult,
  type WeightGoal,
} from '../lib/goalCalculator';
import { parseNum } from '../lib/nutrition';
import type { Profile } from '../lib/types';
import { colors, spacing } from '../lib/theme';

type Props = {
  /** Prefill from saved profile (Settings / returning users). */
  profile?: Profile | null;
  /** Controlled weight/height/DOB strings from the parent screen. */
  weightText?: string;
  heightText?: string;
  onWeightTextChange?: (value: string) => void;
  onHeightTextChange?: (value: string) => void;
  dobText?: string;
  onDobTextChange?: (value: string) => void;
  /**
   * When true, parent already shows weight above; hide the duplicate here.
   * Height + DOB + age still show in this form (set once inside Berekenen).
   */
  hideWeightField?: boolean;
  defaultOpen?: boolean;
  /** When false, parent owns the open toggle (Settings Berekenen chip). */
  showToggle?: boolean;
  /** Controlled open state when showToggle is false. */
  open?: boolean;
  /**
   * Parent owns the shared Calorieën field above the panel.
   * When true, hide the duplicate kcal answer under Bereken doelen.
   */
  hideResultKcal?: boolean;
  /**
   * When true, recalculate silently whenever inputs change (debounced).
   * Hides the Bereken doelen button (kcal already tracks inputs).
   */
  autoUpdate?: boolean;
  /** Fired by autoUpdate (not by the Bereken doelen button). */
  onAutoCalculated?: (payload: { goals: GoalCalcResult; body: BodyMetricsDraft }) => void;
  /** Called when user edits the kcal answer field under Bereken doelen. */
  onResultKcalChange?: (kcal: number) => void;
  onCalculated: (payload: { goals: GoalCalcResult; body: BodyMetricsDraft }) => void;
};

export function GoalCalculator({
  profile,
  weightText,
  heightText,
  onWeightTextChange,
  onHeightTextChange,
  dobText,
  onDobTextChange,
  hideWeightField = false,
  defaultOpen = false,
  showToggle = true,
  open: openProp,
  hideResultKcal = false,
  autoUpdate = false,
  onAutoCalculated,
  onResultKcalChange,
  onCalculated,
}: Props) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = showToggle ? internalOpen : (openProp ?? true);
  const [gender, setGender] = useState<Gender>('male');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [weightGoal, setWeightGoal] = useState<WeightGoal>('maintain');
  const [weightLocal, setWeightLocal] = useState('');
  const [heightLocal, setHeightLocal] = useState('');
  const [dobLocal, setDobLocal] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  /** Weight/height soft+hard messages only after blur (not mid-typing). Age soft shows whenever age < 16. */
  const [weightConfirmed, setWeightConfirmed] = useState(false);
  const [heightConfirmed, setHeightConfirmed] = useState(false);
  // Editable kcal answer under “Bereken doelen” (seeded from saved goals)
  const [kcalDraft, setKcalDraft] = useState(
    profile?.goal_kcal != null && profile.goal_kcal > 0 ? String(profile.goal_kcal) : ''
  );
  const onAutoCalculatedRef = useRef(onAutoCalculated);
  onAutoCalculatedRef.current = onAutoCalculated;

  // Controlled (parent) vs local draft
  const weightControlled = onWeightTextChange != null;
  const heightControlled = onHeightTextChange != null;
  const dobControlled = onDobTextChange != null;
  const weight = weightControlled ? (weightText ?? '') : weightLocal;
  const height = heightControlled ? (heightText ?? '') : heightLocal;
  const dob = dobControlled ? (dobText ?? '') : dobLocal;

  useEffect(() => {
    if (!profile) return;
    if (isGender(profile.gender)) setGender(profile.gender);
    if (isActivityLevel(profile.activity_level)) setActivity(profile.activity_level);
    if (isWeightGoal(profile.weight_goal)) setWeightGoal(profile.weight_goal);
    if (!dobControlled && profile.date_of_birth) setDobLocal(profile.date_of_birth);
    if (profile.goal_kcal != null && profile.goal_kcal > 0) {
      setKcalDraft(String(profile.goal_kcal));
    }
  }, [profile, dobControlled]);

  // Uncontrolled only: seed local weight/height from profile
  useEffect(() => {
    if (weightControlled) return;
    if (profile?.weight_kg != null) setWeightLocal(String(profile.weight_kg));
  }, [weightControlled, profile?.weight_kg]);

  useEffect(() => {
    if (heightControlled) return;
    if (profile?.height_cm != null) setHeightLocal(String(profile.height_cm));
  }, [heightControlled, profile?.height_cm]);

  function setWeight(next: string) {
    setWeightConfirmed(false);
    if (weightControlled) onWeightTextChange?.(next);
    else setWeightLocal(next);
  }

  function setHeight(next: string) {
    setHeightConfirmed(false);
    if (heightControlled) onHeightTextChange?.(next);
    else setHeightLocal(next);
  }

  function setDob(next: string) {
    if (dobControlled) onDobTextChange?.(next);
    else setDobLocal(next);
  }

  /** Build Mifflin result + body draft, or null when hard-invalid / incomplete. Soft unusual still ok. */
  function tryBuildResult(): { goals: GoalCalcResult; body: BodyMetricsDraft } | null {
    const dateOfBirth = isIsoDate(dob) ? dob : null;
    const ageYears = dateOfBirth ? ageFromDateOfBirth(dateOfBirth) : null;
    const weightKg = parseNum(weight);
    const heightCm = parseNum(height);
    if (bodyMetricHardError(weight, weightKg) || !(weightKg > 0)) return null;
    if (bodyMetricHardError(height, heightCm) || !(heightCm > 0)) return null;
    if (!dateOfBirth || ageYears == null || !(ageYears > 0)) return null;
    const result = calculateDailyGoals({ weightKg, heightCm, ageYears, gender, activity, weightGoal });
    if (!result) return null;
    return {
      goals: result,
      body: {
        date_of_birth: dateOfBirth,
        height_cm: heightCm,
        weight_kg: weightKg,
        gender,
        activity_level: activity,
        weight_goal: weightGoal,
      },
    };
  }

  function runCalculate() {
    // Confirm weight/height so any hard/soft messages appear under them
    setWeightConfirmed(true);
    setHeightConfirmed(true);
    const weightKg = parseNum(weight);
    const heightCm = parseNum(height);
    if (bodyMetricHardError(weight, weightKg) || bodyMetricHardError(height, heightCm)) {
      setFormError(t('goalsCalc.invalid'));
      return;
    }
    const built = tryBuildResult();
    if (!built) {
      setFormError(t('goalsCalc.invalid'));
      return;
    }
    setFormError(null);
    setKcalDraft(String(built.goals.kcal));
    onCalculated(built);
  }

  /*
   * Auto-update: push Mifflin when hard-valid inputs settle.
   * Soft unusual height/weight/age only show under fields; they do not block.
   */
  useEffect(() => {
    if (!autoUpdate || !open) return;
    const timer = setTimeout(() => {
      const built = tryBuildResult();
      if (!built) return;
      setFormError(null);
      setKcalDraft(String(built.goals.kcal));
      onAutoCalculatedRef.current?.(built);
    }, 350);
    return () => clearTimeout(timer);
    // Field list is intentional; callback is read via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoUpdate, open, gender, activity, weightGoal, weight, height, dob]);

  function onKcalDraftChange(raw: string) {
    setKcalDraft(raw);
    const n = Number(String(raw).replace(',', '.'));
    if (Number.isFinite(n) && n > 0) {
      onResultKcalChange?.(n);
    }
  }

  function hardMetricMessage(kind: 'weight' | 'height' | 'age', err: BodyMetricHardError | null): string | null {
    if (!err) return null;
    return t(bodyMetricHardI18nKey(kind, err));
  }

  const dobValue = isIsoDate(dob) ? dob : '2000-01-01';
  const dateFormat = resolveDateFormat(profile?.date_format);
  // Stable Date identities: new Date() each render resets the iOS/Android spinner mid-scroll
  const dobMaximumDate = useMemo(() => isoToDate(todayIso()), []);
  const dobMinimumDate = useMemo(() => isoToDate('1920-01-01'), []);
  const ageYearsDisplay = isIsoDate(dob) ? ageFromDateOfBirth(dob) : null;
  const weightKg = parseNum(weight);
  const heightCm = parseNum(height);

  const weightHard = bodyMetricHardError(weight, weightKg);
  const heightHard = bodyMetricHardError(height, heightCm);
  const ageHard: BodyMetricHardError | null =
    ageYearsDisplay == null
      ? null
      : ageYearsDisplay < 0
        ? 'negative'
        : !(ageYearsDisplay > 0)
          ? 'nonPositive'
          : null;

  const weightSoft = !weightHard && softWeightUnusual(weightKg);
  const heightSoft = !heightHard && softHeightUnusual(heightCm);
  const ageSoft = !ageHard && ageYearsDisplay != null && softAgeYoung(ageYearsDisplay);

  // Live Mifflin breakdown for the footer (null while hard-invalid / incomplete)
  const liveGoals = tryBuildResult()?.goals ?? null;
  const liveEnergy = liveGoals?.energy ?? null;
  const heightFilled = heightCm > 0 && !heightHard;
  const dobFilled = isIsoDate(dob) && ageYearsDisplay != null && ageYearsDisplay > 0;
  const needsBodyForCalc = !heightFilled || !dobFilled;

  function formatGoalDelta(delta: number): string {
    if (delta > 0) return `+ ${delta}`;
    if (delta < 0) return `− ${Math.abs(delta)}`;
    return '+ 0';
  }

  return (
    <View style={styles.wrap}>
      {showToggle ? (
        <Text style={styles.toggle} onPress={() => setInternalOpen((v) => !v)}>
          {open ? t('goalsCalc.hide') : t('goalsCalc.show')}
        </Text>
      ) : null}
      {open ? (
        <View style={styles.box}>
          <Text style={styles.label}>{t('goalsCalc.weightGoal')}</Text>
          <View style={styles.row}>
            {WEIGHT_GOALS.map((g) => (
              <Chip
                key={g}
                label={t(`goalsCalc.weightGoal_${g}`)}
                active={weightGoal === g}
                onPress={() => setWeightGoal(g)}
              />
            ))}
          </View>

          <Text style={styles.label}>{t('goalsCalc.activity')}</Text>
          <View style={styles.row}>
            {ACTIVITIES.map((a) => (
              <Chip
                key={a}
                label={t(`goalsCalc.activity_${a}`)}
                active={activity === a}
                onPress={() => setActivity(a)}
              />
            ))}
          </View>

          <Text style={styles.label}>{t('goalsCalc.gender')}</Text>
          <View style={styles.row}>
            {GENDERS.map((g) => (
              <Chip key={g} label={t(`goalsCalc.gender_${g}`)} active={gender === g} onPress={() => setGender(g)} />
            ))}
          </View>

          {!hideWeightField ? (
            <>
              <Field
                label={t('goalsCalc.weight')}
                value={weight}
                onChangeText={setWeight}
                onBlur={() => setWeightConfirmed(true)}
                keyboardType="numeric"
              />
              {weightConfirmed
                ? (() => {
                    const msg = hardMetricMessage('weight', weightHard);
                    if (msg) return <Text style={styles.fieldHard}>{msg}</Text>;
                    if (weightSoft) return <Text style={styles.fieldSoft}>{t('goalsCalc.softWeight')}</Text>;
                    return null;
                  })()
                : null}
            </>
          ) : null}
          <Field
            label={t('goalsCalc.height')}
            value={height}
            onChangeText={setHeight}
            onBlur={() => setHeightConfirmed(true)}
            keyboardType="numeric"
          />
          {heightConfirmed
            ? (() => {
                const msg = hardMetricMessage('height', heightHard);
                if (msg) return <Text style={styles.fieldHard}>{msg}</Text>;
                if (heightSoft) return <Text style={styles.fieldSoft}>{t('goalsCalc.softHeight')}</Text>;
                return null;
              })()
            : null}
          <NativeDatePicker
            label={t('goalsCalc.dateOfBirth')}
            value={dobValue}
            onChange={setDob}
            dateFormat={dateFormat}
            maximumDate={dobMaximumDate}
            minimumDate={dobMinimumDate}
          />
          <Field
            label={t('goalsCalc.age')}
            value={ageYearsDisplay != null && ageYearsDisplay >= 0 ? String(ageYearsDisplay) : ''}
            editable={false}
          />
          {(() => {
            const msg = hardMetricMessage('age', ageHard);
            if (msg) return <Text style={styles.fieldHard}>{msg}</Text>;
            // Soft age: always visible when under 16 (saved DOB or just picked)
            if (ageSoft) return <Text style={styles.fieldSoft}>{t('goalsCalc.softAge')}</Text>;
            return null;
          })()}

          {formError ? <Text style={styles.fieldHard}>{formError}</Text> : null}
          {!formError && autoUpdate && needsBodyForCalc ? (
            <Text style={styles.needsBodyHint}>{t('goalsCalc.autoUpdateNeedsBody')}</Text>
          ) : null}
          {liveEnergy != null && liveGoals != null ? (
            <View style={styles.energyBreakdown}>
              {/* Muted label + strong formula on the next line (keeps wording, fits phones) */}
              <View style={styles.energyRow}>
                <Text style={styles.energyLabel}>{t('goalsCalc.bmrLabel')}</Text>
                <Text style={styles.energyValue}>
                  {t('goalsCalc.bmrValue', { bmr: liveEnergy.bmr })}
                </Text>
              </View>
              <View style={styles.energyRow}>
                <Text style={styles.energyLabel}>{t('goalsCalc.tdeeLabel')}</Text>
                <Text style={styles.energyValue}>
                  {t('goalsCalc.tdeeValue', {
                    bmr: liveEnergy.bmr,
                    factor: liveEnergy.activityFactor,
                    tdee: liveEnergy.tdee,
                  })}
                </Text>
              </View>
              <View style={styles.energyRow}>
                <Text style={styles.energyLabel}>{t('goalsCalc.goalLabel')}</Text>
                <Text style={[styles.energyValue, styles.energyValueGoal]}>
                  {t('goalsCalc.goalValue', {
                    tdee: liveEnergy.tdee,
                    delta: formatGoalDelta(liveEnergy.goalDelta),
                    kcal: liveGoals.kcal,
                  })}
                </Text>
              </View>
            </View>
          ) : null}
          <Text style={styles.disclaimer}>{t('goalsCalc.disclaimer')}</Text>
          {!autoUpdate ? (
            <Button title={t('goalsCalc.calculate')} onPress={runCalculate} variant="secondary" />
          ) : null}
          {!hideResultKcal ? (
            <View style={styles.resultWrap}>
              <Field
                label={t('settings.goalKcal')}
                value={kcalDraft}
                onChangeText={onKcalDraftChange}
                keyboardType="numeric"
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.s },
  toggle: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: spacing.s,
  },
  box: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  label: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
    marginBottom: spacing.s,
    marginTop: spacing.xs,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.m },
  energyBreakdown: { marginBottom: spacing.m, gap: spacing.s },
  energyRow: { gap: 2 },
  energyLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
    lineHeight: 16,
  },
  energyValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '700',
    lineHeight: 20,
  },
  // Final recommended kcal stands out as the answer of the ladder
  energyValueGoal: {
    color: colors.primaryDark,
  },
  needsBodyHint: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: spacing.s,
  },
  // Pull up under Field’s margin so the message sits on the triggering input
  fieldHard: {
    fontSize: 12,
    color: colors.danger,
    lineHeight: 16,
    marginTop: -spacing.m + 2,
    marginBottom: spacing.m,
  },
  fieldSoft: {
    fontSize: 12,
    color: colors.warn,
    lineHeight: 17,
    marginTop: -spacing.m + 2,
    marginBottom: spacing.m,
  },
  disclaimer: { fontSize: 12, color: colors.faint, lineHeight: 17, marginBottom: spacing.m },
  resultWrap: { marginTop: spacing.m },
});
