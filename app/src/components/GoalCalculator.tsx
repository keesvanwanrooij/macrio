// Optional body-stat form that fills daily kcal/macro goal fields and persists metrics.
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { NativeDatePicker } from './NativeDatePicker';
import { Button, Chip, Field } from './ui';
import { isoToDate, resolveDateFormat, todayIso } from '../lib/dates';
import {
  ACTIVITIES,
  GENDERS,
  WEIGHT_GOALS,
  ageFromDateOfBirth,
  calculateDailyGoals,
  isActivityLevel,
  isGender,
  isWeightGoal,
  type ActivityLevel,
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
  defaultOpen?: boolean;
  onCalculated: (payload: { goals: GoalCalcResult; body: BodyMetricsDraft }) => void;
};

export function GoalCalculator({ profile, defaultOpen = false, onCalculated }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const [gender, setGender] = useState<Gender>('male');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [weightGoal, setWeightGoal] = useState<WeightGoal>('maintain');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if (isGender(profile.gender)) setGender(profile.gender);
    if (isActivityLevel(profile.activity_level)) setActivity(profile.activity_level);
    if (isWeightGoal(profile.weight_goal)) setWeightGoal(profile.weight_goal);
    if (profile.weight_kg != null) setWeight(String(profile.weight_kg));
    if (profile.height_cm != null) setHeight(String(profile.height_cm));
    if (profile.date_of_birth) setDob(profile.date_of_birth);
  }, [profile]);

  function runCalculate() {
    // DOB comes from the native picker as ISO YYYY-MM-DD
    const dateOfBirth = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : null;
    const ageYears = dateOfBirth ? ageFromDateOfBirth(dateOfBirth) : null;
    const weightKg = parseNum(weight);
    const heightCm = parseNum(height);

    const result =
      ageYears != null
        ? calculateDailyGoals({ weightKg, heightCm, ageYears, gender, activity, weightGoal })
        : null;

    if (!result || !dateOfBirth) {
      setError(true);
      return;
    }

    setError(false);
    onCalculated({
      goals: result,
      body: {
        date_of_birth: dateOfBirth,
        height_cm: heightCm,
        weight_kg: weightKg,
        gender,
        activity_level: activity,
        weight_goal: weightGoal,
      },
    });
  }

  const dobValue = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : '2000-01-01';
  const dateFormat = resolveDateFormat(profile?.date_format);

  return (
    <View style={styles.wrap}>
      <Text style={styles.toggle} onPress={() => setOpen((v) => !v)}>
        {open ? t('goalsCalc.hide') : t('goalsCalc.show')}
      </Text>
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

          <Text style={styles.label}>{t('goalsCalc.gender')}</Text>
          <View style={styles.row}>
            {GENDERS.map((g) => (
              <Chip key={g} label={t(`goalsCalc.gender_${g}`)} active={gender === g} onPress={() => setGender(g)} />
            ))}
          </View>

          <Field label={t('goalsCalc.weight')} value={weight} onChangeText={setWeight} keyboardType="numeric" />
          <Field label={t('goalsCalc.height')} value={height} onChangeText={setHeight} keyboardType="numeric" />
          <NativeDatePicker
            label={t('goalsCalc.dateOfBirth')}
            value={dobValue}
            onChange={setDob}
            dateFormat={dateFormat}
            maximumDate={isoToDate(todayIso())}
            minimumDate={isoToDate('1920-01-01')}
          />

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

          {error ? <Text style={styles.error}>{t('goalsCalc.invalid')}</Text> : null}
          <Text style={styles.disclaimer}>{t('goalsCalc.disclaimer')}</Text>
          <Button title={t('goalsCalc.calculate')} onPress={runCalculate} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.l },
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
  disclaimer: { fontSize: 12, color: colors.faint, lineHeight: 17, marginBottom: spacing.m },
  error: { fontSize: 13, color: colors.danger, marginBottom: spacing.s },
});
