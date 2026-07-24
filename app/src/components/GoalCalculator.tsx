/*
 * SECTION: Body-based daily goal calculator
 * WHAT: Mifflin form; fills kcal (keeps current macro % on calculate / auto-update).
 * HOW: Hard ≤0 under fields; soft unusual height/weight after blur; soft age <16 always (still calculates)
 *      → age from DOB → calculateDailyGoals → onCalculated (Settings owns auto-update)
 * INPUT: profile; controlled weight/height/DOB from parent (Settings/onboarding); onCalculated
 * OUTPUT: { goals: GoalCalcResult, body: BodyMetricsDraft } (caller keeps % or seeds defaults)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { NativeDatePicker } from './NativeDatePicker';
import { Button, Chip, Field } from './ui';
import { isoToDate, isIsoDate, DOB_PICKER_FALLBACK_ISO, DOB_PICKER_MIN_ISO, resolveDateFormat, todayIso } from '../lib/dates';
import {
  ACTIVITIES,
  DEFAULT_MACRO_PERCENTS,
  GENDERS,
  KCAL_FLOOR,
  WEIGHT_GOALS_EXTENDED,
  WEIGHT_GOALS_SIMPLE,
  ageFromDateOfBirth,
  bodyMetricHardError,
  calculateDailyGoals,
  activityTipKind,
  buildGoalCalcInput,
  heightFieldMessage,
  isActivityLevel,
  isExtendedWeightGoal,
  isGender,
  isWeightGoal,
  weightFieldMessage,
  ageFieldMessage,
  type ActivityLevel,
  type BodyMetricsDraft,
  type Gender,
  type GoalCalcResult,
  type MacroPercents,
  type WeightGoal,
} from '../lib/goalCalculator';
import { formatLocaleNumber } from '../lib/localeNumber';
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
   */
  hideWeightField?: boolean;
  /**
   * When true, height / DOB / age / gender live on Settings → Account.
   * Parent still passes heightText + dobText; gender comes from profile for Mifflin.
   */
  hideHeightAndDob?: boolean;
  /** Current macro % for the disclaimer (from Macro's / default 50/20/30). */
  macroPercents?: MacroPercents;
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
  /*
   * Auto-update is owned by Settings (single debounce path for open + closed Berekenen).
   * This prop only hides “Bereken doelen” and shows the needs-body hint.
   */
  autoUpdate?: boolean;
  /**
   * Fired when activity / weight-goal (/ gender when shown) chips change.
   * Parent drafts into bodyDraft so leave/tap-save cannot lose chip edits.
   */
  onCalcMetaChange?: (meta: {
    gender: Gender;
    activity_level: ActivityLevel;
    weight_goal: WeightGoal;
  }) => void;
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
  hideHeightAndDob = false,
  macroPercents,
  defaultOpen = false,
  showToggle = true,
  open: openProp,
  hideResultKcal = false,
  autoUpdate = false,
  onCalcMetaChange,
  onResultKcalChange,
  onCalculated,
}: Props) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = showToggle ? internalOpen : (openProp ?? true);
  const [gender, setGender] = useState<Gender>('male');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [weightGoal, setWeightGoal] = useState<WeightGoal>('maintain');
  /** “…” expands to 5 rates (fast ±500 + moderate ±300). Auto-opens when a fast goal is loaded. */
  const [weightGoalsExpanded, setWeightGoalsExpanded] = useState(false);
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

  // Controlled when parent passes the text prop (Settings Doelen / Account); else local draft
  const weight = weightText !== undefined ? (weightText ?? '') : weightLocal;
  const height = heightText !== undefined ? (heightText ?? '') : heightLocal;
  const dob = dobText !== undefined ? (dobText ?? '') : dobLocal;
  // Account owns gender when hidden: only use saved profile (no silent “male” default)
  const effectiveGender: Gender | null = hideHeightAndDob
    ? isGender(profile?.gender)
      ? profile.gender
      : null
    : gender;

  useEffect(() => {
    if (!profile) return;
    if (isGender(profile.gender)) setGender(profile.gender);
    if (isActivityLevel(profile.activity_level)) setActivity(profile.activity_level);
    if (isWeightGoal(profile.weight_goal)) {
      setWeightGoal(profile.weight_goal);
      if (isExtendedWeightGoal(profile.weight_goal)) setWeightGoalsExpanded(true);
    }
    if (dobText === undefined && profile.date_of_birth) setDobLocal(profile.date_of_birth);
    if (profile.goal_kcal != null && profile.goal_kcal > 0) {
      setKcalDraft(String(profile.goal_kcal));
    }
  }, [profile, dobText]);

  // Uncontrolled only: seed local weight/height from profile
  useEffect(() => {
    if (weightText !== undefined) return;
    if (profile?.weight_kg != null) setWeightLocal(String(profile.weight_kg));
  }, [weightText, profile?.weight_kg]);

  useEffect(() => {
    if (heightText !== undefined) return;
    if (profile?.height_cm != null) setHeightLocal(String(profile.height_cm));
  }, [heightText, profile?.height_cm]);

  function setWeight(next: string) {
    setWeightConfirmed(false);
    if (onWeightTextChange) onWeightTextChange(next);
    else setWeightLocal(next);
  }

  function setHeight(next: string) {
    setHeightConfirmed(false);
    if (onHeightTextChange) onHeightTextChange(next);
    else setHeightLocal(next);
  }

  function setDob(next: string) {
    if (onDobTextChange) onDobTextChange(next);
    else setDobLocal(next);
  }

  /** Push chip meta into parent bodyDraft (activity / weight goal / gender when shown). */
  function emitCalcMeta(next: {
    gender: Gender;
    activity_level: ActivityLevel;
    weight_goal: WeightGoal;
  }) {
    onCalcMetaChange?.(next);
  }

  function pickGenderForMeta(): Gender | null {
    if (effectiveGender) return effectiveGender;
    if (isGender(gender)) return gender;
    return null;
  }

  function selectWeightGoal(g: WeightGoal) {
    setWeightGoal(g);
    const gen = pickGenderForMeta();
    if (gen) emitCalcMeta({ gender: gen, activity_level: activity, weight_goal: g });
  }

  function selectActivity(a: ActivityLevel) {
    setActivity(a);
    const gen = pickGenderForMeta();
    if (gen) emitCalcMeta({ gender: gen, activity_level: a, weight_goal: weightGoal });
  }

  function selectGender(g: Gender) {
    setGender(g);
    emitCalcMeta({ gender: g, activity_level: activity, weight_goal: weightGoal });
  }

  /** Build Mifflin result + body draft, or null when hard-invalid / incomplete. Soft unusual still ok. */
  function tryBuildResult(): { goals: GoalCalcResult; body: BodyMetricsDraft } | null {
    const dateOfBirth = isIsoDate(dob) ? dob : null;
    const weightKg = parseNum(weight);
    const heightCm = parseNum(height);
    if (bodyMetricHardError(weight, weightKg) || bodyMetricHardError(height, heightCm)) return null;
    if (!effectiveGender || !dateOfBirth) return null;
    const input = buildGoalCalcInput({
      weightKg,
      heightCm,
      dateOfBirth,
      gender: effectiveGender,
      activity,
      weightGoal,
    });
    if (!input) return null;
    const result = calculateDailyGoals(input);
    if (!result) return null;
    return {
      goals: result,
      body: {
        date_of_birth: dateOfBirth,
        height_cm: heightCm,
        weight_kg: weightKg,
        gender: effectiveGender,
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
   * Auto-update lives in Settings only (one debounce for open + closed panel).
   * Keep local kcalDraft in sync when parent goals change via profile.
   */

  function onKcalDraftChange(raw: string) {
    setKcalDraft(raw);
    const n = Number(String(raw).replace(',', '.'));
    if (Number.isFinite(n) && n > 0) {
      onResultKcalChange?.(n);
    }
  }

  const dobValue = isIsoDate(dob) ? dob : DOB_PICKER_FALLBACK_ISO;
  const dateFormat = resolveDateFormat(profile?.date_format);
  // Stable Date identities: new Date() each render resets the iOS/Android spinner mid-scroll
  const dobMaximumDate = useMemo(() => isoToDate(todayIso()), []);
  const dobMinimumDate = useMemo(() => isoToDate(DOB_PICKER_MIN_ISO), []);
  const ageYearsDisplay = isIsoDate(dob) ? ageFromDateOfBirth(dob) : null;
  const weightKg = parseNum(weight);
  const heightCm = parseNum(height);

  const weightHard = bodyMetricHardError(weight, weightKg);
  const heightHard = bodyMetricHardError(height, heightCm);
  const ageMsg = ageFieldMessage(ageYearsDisplay);

  // Live Mifflin breakdown for the footer (null while hard-invalid / incomplete)
  const liveGoals = tryBuildResult()?.goals ?? null;
  const liveEnergy = liveGoals?.energy ?? null;
  const heightFilled = heightCm > 0 && !heightHard;
  const dobFilled = isIsoDate(dob) && ageYearsDisplay != null && ageYearsDisplay > 0;
  const needsBodyForCalc = !heightFilled || !dobFilled || (hideHeightAndDob && !effectiveGender);

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
          <View style={styles.rowTight}>
            {(weightGoalsExpanded ? WEIGHT_GOALS_EXTENDED : WEIGHT_GOALS_SIMPLE).map((g) => (
              <Chip
                key={g}
                label={
                  weightGoalsExpanded
                    ? t(`goalsCalc.weightGoalSymbol_${g}`)
                    : t(`goalsCalc.weightGoal_${g}`)
                }
                active={weightGoal === g}
                onPress={() => selectWeightGoal(g)}
              />
            ))}
          </View>
          <View style={styles.weightGoalHelp}>
            <Text style={styles.weightGoalHint}>{t(`goalsCalc.weightGoalHint_${weightGoal}`)}</Text>
            <Text
              style={styles.weightGoalsToggle}
              onPress={() => {
                // Stay expanded while a fast rate is selected (not in the simple 3)
                setWeightGoalsExpanded((v) => {
                  if (v && isExtendedWeightGoal(weightGoal)) return true;
                  return !v;
                });
              }}
              accessibilityRole="button"
            >
              {weightGoalsExpanded ? t('goalsCalc.weightGoalsLess') : t('goalsCalc.weightGoalsMore')}
            </Text>
          </View>

          <Text style={styles.label}>{t('goalsCalc.activity')}</Text>
          <View style={styles.row}>
            {ACTIVITIES.map((a) => (
              <Chip
                key={a}
                label={t(`goalsCalc.activity_${a}`)}
                active={activity === a}
                onPress={() => selectActivity(a)}
              />
            ))}
          </View>
          <Text style={styles.fieldHint}>{t(`goalsCalc.activityHint_${activity}`)}</Text>
          <Text style={styles.fieldTip}>
            {t(`goalsCalc.activityTip_${activityTipKind(weightGoal)}`)}
          </Text>

          {!hideHeightAndDob ? (
            <>
              <Text style={styles.label}>{t('goalsCalc.gender')}</Text>
              <View style={styles.row}>
                {GENDERS.map((g) => (
                  <Chip
                    key={g}
                    label={t(`goalsCalc.gender_${g}`)}
                    active={gender === g}
                    onPress={() => selectGender(g)}
                  />
                ))}
              </View>
            </>
          ) : null}

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
                    const msg = weightFieldMessage(weight, weightKg);
                    if (!msg) return null;
                    return (
                      <Text style={msg.severity === 'hard' ? styles.fieldHard : styles.fieldSoft}>
                        {t(msg.key)}
                      </Text>
                    );
                  })()
                : null}
            </>
          ) : null}
          {!hideHeightAndDob ? (
            <>
              <Field
                label={t('goalsCalc.height')}
                value={height}
                onChangeText={setHeight}
                onBlur={() => setHeightConfirmed(true)}
                keyboardType="numeric"
              />
              {heightConfirmed
                ? (() => {
                    const msg = heightFieldMessage(height, heightCm);
                    if (!msg) return null;
                    return (
                      <Text style={msg.severity === 'hard' ? styles.fieldHard : styles.fieldSoft}>
                        {t(msg.key)}
                      </Text>
                    );
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
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyLabel}>{t('goalsCalc.age')}</Text>
                <Text style={styles.readOnlyValue}>
                  {ageYearsDisplay != null && ageYearsDisplay >= 0 ? String(ageYearsDisplay) : ''}
                </Text>
              </View>
              {ageMsg ? (
                <Text style={ageMsg.severity === 'hard' ? styles.fieldHard : styles.fieldSoft}>
                  {t(ageMsg.key)}
                </Text>
              ) : null}
            </>
          ) : null}

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
                    factor: formatLocaleNumber(liveEnergy.activityFactor, {
                      maximumFractionDigits: 3,
                      minimumFractionDigits: 0,
                    }),
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
              {liveEnergy.hitFloor ? (
                <Text style={styles.floorWarning}>
                  {t('goalsCalc.kcalFloorWarning', { floor: KCAL_FLOOR })}
                </Text>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.disclaimer}>
            {t('goalsCalc.disclaimer', {
              carbs: Math.round((macroPercents ?? DEFAULT_MACRO_PERCENTS).carbs),
              protein: Math.round((macroPercents ?? DEFAULT_MACRO_PERCENTS).protein),
              fat: Math.round((macroPercents ?? DEFAULT_MACRO_PERCENTS).fat),
            })}
          </Text>
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
  rowTight: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xs },
  weightGoalHelp: {
    marginBottom: spacing.m,
    gap: 2,
  },
  weightGoalHint: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '400',
    lineHeight: 16,
  },
  // Link-style control (not a section label like Doel / Activiteit)
  weightGoalsToggle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primaryDark,
    lineHeight: 16,
    alignSelf: 'flex-start',
  },
  fieldHint: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
    marginTop: 0,
    marginBottom: spacing.s,
  },
  fieldTip: {
    fontSize: 12,
    color: colors.faint,
    lineHeight: 17,
    marginBottom: spacing.m,
  },
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
  // Age is derived from DOB: plain text, not a fake disabled input
  readOnlyField: { marginBottom: spacing.m },
  readOnlyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  readOnlyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  floorWarning: {
    fontSize: 12,
    color: colors.warn,
    lineHeight: 17,
    marginTop: spacing.xs,
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
