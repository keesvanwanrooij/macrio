/*
 * SECTION: Onboarding (calm step-by-step, mirrors Settings topics)
 * WHAT: Body → daily needs → macros → allergens. Each step is skippable.
 * HOW: One topic per screen; progress dots; same helpers as Settings Account / Doelen.
 * INPUT: session profile (optional prefill)
 * OUTPUT: updateProfile + onboarded; optional goal_revisions row
 */
import React, { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalCalculator } from '../components/GoalCalculator';
import { GoalMacroEditor, type GoalMacroEditorHandle } from '../components/GoalMacroEditor';
import { NativeDatePicker } from '../components/NativeDatePicker';
import { Button, Chip, Field } from '../components/ui';
import { EU_ALLERGENS, noneChipListState } from '../lib/allergens';
import {
  DOB_PICKER_FALLBACK_ISO,
  DOB_PICKER_MIN_ISO,
  isIsoDate,
  isoToDate,
  resolveDateFormat,
  todayIso,
} from '../lib/dates';
import {
  GENDERS,
  ageFieldMessage,
  ageFromDateOfBirth,
  bodyMetricsToProfilePatch,
  EMPTY_GOAL_FIELDS,
  NULL_GOAL_NUMBERS,
  goalFieldsFromKcalInput,
  goalNumbersFromFields,
  goalsFieldsAllEmpty,
  goalsFieldsComplete,
  goalsFromKcalKeepingSplit,
  heightFieldMessage,
  isGender,
  macroPercentsFromGoalFields,
  weightFieldMessage,
  type BodyMetricsDraft,
  type Gender,
  type GoalFields,
} from '../lib/goalCalculator';
import { upsertTodayGoalRevision } from '../lib/goalRevisions';
import { formatLocaleMetric } from '../lib/localeNumber';
import { parseNum } from '../lib/nutrition';
import { useSession } from '../lib/session';
import { colors, spacing } from '../lib/theme';

type OnboardingStep = 'body' | 'needs' | 'macros' | 'allergens';

const STEPS: OnboardingStep[] = ['body', 'needs', 'macros', 'allergens'];

export default function Onboarding() {
  const { t } = useTranslation();
  const { profile, updateProfile } = useSession();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex] ?? 'body';

  const [selected, setSelected] = useState<string[]>([]);
  /** Start expanded so first-time users see Gluten…; Niets collapses the row. */
  const [allergenOptionsExpanded, setAllergenOptionsExpanded] = useState(true);
  const [goals, setGoals] = useState<GoalFields>(EMPTY_GOAL_FIELDS);
  const [bodyDraft, setBodyDraft] = useState<BodyMetricsDraft | null>(null);
  const [weightDraft, setWeightDraft] = useState<string | null>(null);
  const [heightDraft, setHeightDraft] = useState<string | null>(null);
  const [dobDraft, setDobDraft] = useState<string | null>(null);
  const [genderDraft, setGenderDraft] = useState<Gender | null>(null);
  const [busy, setBusy] = useState(false);
  const [weightFieldConfirmed, setWeightFieldConfirmed] = useState(false);
  const [heightConfirmed, setHeightConfirmed] = useState(false);
  const macroEditorRef = useRef<GoalMacroEditorHandle>(null);

  const weightStr =
    weightDraft ??
    (profile?.weight_kg != null && profile.weight_kg > 0
      ? formatLocaleMetric(profile.weight_kg)
      : '');
  const heightStr =
    heightDraft ??
    (profile?.height_cm != null && profile.height_cm > 0
      ? formatLocaleMetric(profile.height_cm, 1)
      : '');
  const dobStr = dobDraft ?? profile?.date_of_birth ?? '';
  const gender =
    genderDraft ?? (isGender(profile?.gender) ? profile.gender : null);
  const lichaamWeightKg = parseNum(weightStr);
  const lichaamHeightCm = parseNum(heightStr);
  const ageYears = isIsoDate(dobStr) ? ageFromDateOfBirth(dobStr) : null;
  const heightMsg = heightFieldMessage(heightStr, lichaamHeightCm);
  const ageMsg = ageFieldMessage(ageYears);
  const dateFormat = resolveDateFormat(profile?.date_format);
  const dobMaximumDate = useMemo(() => isoToDate(todayIso()), []);
  const dobMinimumDate = useMemo(() => isoToDate(DOB_PICKER_MIN_ISO), []);
  const disclaimerMacroPercents = macroPercentsFromGoalFields(goals);

  // Profile with body drafts so GoalCalculator Mifflin uses this step’s gender/height/DOB
  const calcProfile = profile
    ? {
        ...profile,
        gender: gender ?? profile.gender,
        height_cm: lichaamHeightCm > 0 ? lichaamHeightCm : profile.height_cm,
        date_of_birth: isIsoDate(dobStr) ? dobStr : profile.date_of_birth,
        weight_kg: lichaamWeightKg > 0 ? lichaamWeightKg : profile.weight_kg,
      }
    : profile;

  function toggle(key: string) {
    setAllergenOptionsExpanded(true);
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  function toggleAllergensNone() {
    const { noneActive } = noneChipListState(selected.length, allergenOptionsExpanded);
    if (noneActive) return;
    setSelected([]);
    setAllergenOptionsExpanded(false);
  }

  function expandAllergenOptions() {
    setAllergenOptionsExpanded(true);
  }

  const allergenNoneUi = noneChipListState(selected.length, allergenOptionsExpanded);

  function onSharedKcalChange(raw: string) {
    const next = goalFieldsFromKcalInput(raw, goals);
    if (!next) return;
    setGoals(next);
  }

  function goNext() {
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1);
  }

  function goBack() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  async function finish(withGoals: boolean, allergens: string[] = selected) {
    if (heightMsg?.severity === 'hard') {
      Alert.alert(t('common.error'), t('goalsCalc.invalid'));
      setStepIndex(STEPS.indexOf('body'));
      return;
    }
    let persistGoals = withGoals;
    if (withGoals) {
      if (goalsFieldsAllEmpty(goals)) {
        persistGoals = false;
      } else if (!goalsFieldsComplete(goals)) {
        Alert.alert(t('common.error'), t('goalsCalc.goalsIncomplete'));
        setStepIndex(STEPS.indexOf('needs'));
        return;
      }
    }
    setBusy(true);
    try {
      const goalPatch = persistGoals ? goalNumbersFromFields(goals) : NULL_GOAL_NUMBERS;
      const { error } = await updateProfile({
        allergens,
        ...goalPatch,
        ...(bodyDraft ? bodyMetricsToProfilePatch(bodyDraft) : {}),
        ...(lichaamWeightKg > 0 ? { weight_kg: lichaamWeightKg } : {}),
        ...(lichaamHeightCm > 0 ? { height_cm: lichaamHeightCm } : {}),
        ...(isIsoDate(dobStr) ? { date_of_birth: dobStr } : {}),
        ...(gender ? { gender } : {}),
        onboarded: true,
      });
      if (error) {
        const hint =
          error.toLowerCase().includes('date_of_birth') ||
          error.toLowerCase().includes('height_cm') ||
          error.toLowerCase().includes('schema cache')
            ? t('settings.bodyMetricsMigrationHint')
            : error;
        Alert.alert(t('common.error'), hint);
      } else if (persistGoals) {
        await upsertTodayGoalRevision(goalPatch);
      }
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const stepTitle =
    step === 'body'
      ? t('onboarding.bodyTitle')
      : step === 'needs'
        ? t('onboarding.needsTitle')
        : step === 'macros'
          ? t('onboarding.macrosTitle')
          : t('onboarding.allergensTitle');
  const stepSubtitle =
    step === 'body'
      ? t('onboarding.bodySubtitle')
      : step === 'needs'
        ? t('onboarding.needsSubtitle')
        : step === 'macros'
          ? t('onboarding.macrosSubtitle')
          : t('onboarding.allergensSubtitle');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress: calm “step x of n” + dots (not a busy dashboard) */}
        <Text style={styles.progressLabel}>
          {t('onboarding.stepOf', { current: stepIndex + 1, total: STEPS.length })}
        </Text>
        <View style={styles.dots} accessibilityRole="progressbar">
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[styles.dot, i === stepIndex && styles.dotActive, i < stepIndex && styles.dotDone]}
            />
          ))}
        </View>

        <Text style={styles.title}>{stepTitle}</Text>
        <Text style={styles.subtitle}>{stepSubtitle}</Text>

        {step === 'body' ? (
          <>
            <Text style={styles.fieldLabel}>{t('goalsCalc.gender')}</Text>
            <View style={styles.row}>
              {GENDERS.map((g) => (
                <Chip
                  key={g}
                  label={t(`goalsCalc.gender_${g}`)}
                  active={gender === g}
                  onPress={() => setGenderDraft(g)}
                />
              ))}
            </View>
            <Field
              label={t('goalsCalc.height')}
              value={heightStr}
              onChangeText={(v) => {
                setHeightConfirmed(false);
                setHeightDraft(v);
              }}
              onBlur={() => setHeightConfirmed(true)}
              keyboardType="decimal-pad"
            />
            {heightMsg?.severity === 'soft' ||
            (heightConfirmed && heightMsg?.severity === 'hard') ? (
              <Text style={heightMsg.severity === 'hard' ? styles.fieldHard : styles.fieldSoft}>
                {t(heightMsg.key)}
              </Text>
            ) : null}
            <NativeDatePicker
              label={t('goalsCalc.dateOfBirth')}
              value={isIsoDate(dobStr) ? dobStr : DOB_PICKER_FALLBACK_ISO}
              onChange={(iso) => setDobDraft(iso)}
              dateFormat={dateFormat}
              maximumDate={dobMaximumDate}
              minimumDate={dobMinimumDate}
            />
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>{t('goalsCalc.age')}</Text>
              <Text style={styles.readOnlyValue}>
                {ageYears != null && ageYears >= 0 ? String(ageYears) : ''}
              </Text>
            </View>
            {ageMsg ? (
              <Text style={ageMsg.severity === 'hard' ? styles.fieldHard : styles.fieldSoft}>
                {t(ageMsg.key)}
              </Text>
            ) : null}
            <Button title={t('common.next')} onPress={goNext} />
            <Text style={styles.skip} onPress={goNext}>
              {t('common.skip')}
            </Text>
          </>
        ) : null}

        {step === 'needs' ? (
          <>
            <Field
              label={t('goalsCalc.weight')}
              value={weightStr}
              onChangeText={(v) => {
                setWeightFieldConfirmed(false);
                setWeightDraft(v);
              }}
              onBlur={() => setWeightFieldConfirmed(true)}
              keyboardType="decimal-pad"
            />
            {weightFieldConfirmed
              ? (() => {
                  const msg = weightFieldMessage(weightStr, lichaamWeightKg);
                  if (!msg) return null;
                  return (
                    <Text style={msg.severity === 'hard' ? styles.fieldHard : styles.fieldSoft}>
                      {t(msg.key)}
                    </Text>
                  );
                })()
              : null}
            <Field
              label={t('settings.goalKcal')}
              value={goals.kcal}
              onChangeText={onSharedKcalChange}
              keyboardType="numeric"
            />
            <Text style={styles.hint}>{t('onboarding.needsCalcHint')}</Text>
            <GoalCalculator
              profile={calcProfile}
              weightText={weightStr}
              heightText={heightStr}
              onWeightTextChange={setWeightDraft}
              dobText={dobStr}
              hideWeightField
              hideHeightAndDob
              showToggle={false}
              open
              hideResultKcal
              macroPercents={disclaimerMacroPercents}
              onCalcMetaChange={(meta) => {
                setGenderDraft(meta.gender);
                setBodyDraft({
                  date_of_birth: isIsoDate(dobStr) ? dobStr : '',
                  height_cm: lichaamHeightCm,
                  weight_kg: lichaamWeightKg,
                  gender: meta.gender,
                  activity_level: meta.activity_level,
                  weight_goal: meta.weight_goal,
                });
              }}
              onCalculated={({ goals: calcGoals, body }) => {
                setGoals(goalsFromKcalKeepingSplit(calcGoals.kcal, goals));
                setBodyDraft(body);
                if (body.weight_kg > 0) setWeightDraft(formatLocaleMetric(body.weight_kg));
              }}
            />
            <Button title={t('common.next')} onPress={goNext} />
            <View style={styles.navRow}>
              <Text style={styles.back} onPress={goBack}>
                {t('common.back')}
              </Text>
              <Text style={styles.skipInline} onPress={goNext}>
                {t('common.skip')}
              </Text>
            </View>
          </>
        ) : null}

        {step === 'macros' ? (
          <>
            <Text style={styles.hint}>{t('onboarding.macrosHint')}</Text>
            <GoalMacroEditor
              ref={macroEditorRef}
              value={goals}
              onChange={setGoals}
              weightKg={lichaamWeightKg > 0 ? lichaamWeightKg : 0}
              hideKcalField
            />
            <Button title={t('common.next')} onPress={goNext} />
            <View style={styles.navRow}>
              <Text style={styles.back} onPress={goBack}>
                {t('common.back')}
              </Text>
              <Text style={styles.skipInline} onPress={goNext}>
                {t('common.skip')}
              </Text>
            </View>
          </>
        ) : null}

        {step === 'allergens' ? (
          <>
            <View style={styles.chips}>
              <Chip
                label={t('onboarding.allergensNothing')}
                active={allergenNoneUi.noneActive}
                onPress={toggleAllergensNone}
              />
              {allergenNoneUi.noneActive ? (
                <Chip
                  label={t('onboarding.allergensShowMore')}
                  active={false}
                  onPress={expandAllergenOptions}
                />
              ) : null}
              {allergenNoneUi.showOptions
                ? EU_ALLERGENS.map((key) => (
                    <Chip
                      key={key}
                      label={t(`allergens.${key}`)}
                      active={selected.includes(key)}
                      onPress={() => toggle(key)}
                    />
                  ))
                : null}
            </View>
            <Text style={styles.disclaimer}>{t('allergens.disclaimer')}</Text>
            <Button
              title={t('onboarding.start')}
              onPress={() => finish(true)}
              loading={busy}
            />
            <View style={styles.navRow}>
              <Text style={styles.back} onPress={goBack}>
                {t('common.back')}
              </Text>
              <Text style={styles.skipInline} onPress={() => finish(false, [])}>
                {t('onboarding.skipAllergens')}
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: spacing.s,
  },
  dots: { flexDirection: 'row', gap: 8, marginBottom: spacing.l },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primaryDark, width: 20 },
  dotDone: { backgroundColor: colors.primary },
  title: { fontSize: 26, fontWeight: '900', color: colors.text },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    marginTop: spacing.s,
    marginBottom: spacing.l,
    lineHeight: 21,
  },
  hint: { fontSize: 13, color: colors.muted, marginBottom: spacing.s, lineHeight: 18 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: spacing.s,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.m },
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
    lineHeight: 16,
    marginTop: -spacing.m + 2,
    marginBottom: spacing.m,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.l },
  disclaimer: { fontSize: 12, color: colors.faint, marginBottom: spacing.l, lineHeight: 17 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.l,
  },
  back: { color: colors.muted, fontWeight: '600', fontSize: 15 },
  skip: { textAlign: 'center', color: colors.muted, marginTop: spacing.l, fontWeight: '600' },
  skipInline: { color: colors.muted, fontWeight: '600', fontSize: 15 },
});
