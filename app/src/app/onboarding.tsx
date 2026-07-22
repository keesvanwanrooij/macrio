// Two-step onboarding: allergens (multi-select) → optional daily goals.
// Both steps are skippable so founders can reach the diary quickly.
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalCalculator } from '../components/GoalCalculator';
import { Button, Chip, Field } from '../components/ui';
import { EU_ALLERGENS } from '../lib/allergens';
import { macrosFromKcal, type BodyMetricsDraft } from '../lib/goalCalculator';
import { upsertTodayGoalRevision } from '../lib/goalRevisions';
import { parseNum } from '../lib/nutrition';
import { useSession } from '../lib/session';
import { colors, spacing } from '../lib/theme';

export default function Onboarding() {
  const { t } = useTranslation();
  const { profile, updateProfile } = useSession();
  const [step, setStep] = useState<0 | 1>(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [kcal, setKcal] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [bodyDraft, setBodyDraft] = useState<BodyMetricsDraft | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(key: string) {
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  /** When kcal changes, keep macros in sync using the same heuristics + stored weight. */
  function onKcalChange(value: string) {
    setKcal(value);
    const weightKg = bodyDraft?.weight_kg ?? profile?.weight_kg ?? 0;
    const goal = bodyDraft?.weight_goal ?? profile?.weight_goal ?? 'maintain';
    const macros = macrosFromKcal(parseNum(value), weightKg, goal);
    if (!macros) {
      setCarbs('');
      setProtein('');
      setFat('');
      return;
    }
    setCarbs(String(macros.carbs));
    setProtein(String(macros.protein));
    setFat(String(macros.fat));
  }

  async function finish(withGoals: boolean) {
    setBusy(true);
    try {
      const goals = {
        goal_kcal: withGoals ? parseNum(kcal) || null : null,
        goal_carbs: withGoals ? parseNum(carbs) || null : null,
        goal_protein: withGoals ? parseNum(protein) || null : null,
        goal_fat: withGoals ? parseNum(fat) || null : null,
      };
      const { error } = await updateProfile({
        allergens: selected,
        ...goals,
        ...(bodyDraft
          ? {
              date_of_birth: bodyDraft.date_of_birth,
              height_cm: bodyDraft.height_cm,
              weight_kg: bodyDraft.weight_kg,
              gender: bodyDraft.gender,
              activity_level: bodyDraft.activity_level,
              weight_goal: bodyDraft.weight_goal,
            }
          : {}),
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
      } else if (withGoals) {
        await upsertTodayGoalRevision(goals);
      }
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <Text style={styles.title}>{t('onboarding.allergensTitle')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.allergensSubtitle')}</Text>
            <View style={styles.chips}>
              {EU_ALLERGENS.map((key) => (
                <Chip
                  key={key}
                  label={t(`allergens.${key}`)}
                  active={selected.includes(key)}
                  onPress={() => toggle(key)}
                />
              ))}
            </View>
            <Text style={styles.disclaimer}>{t('allergens.disclaimer')}</Text>
            <Button title={t('common.next')} onPress={() => setStep(1)} />
            <Text style={styles.skip} onPress={() => finish(false)}>
              {t('common.skip')}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('onboarding.goalsTitle')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.goalsSubtitle')}</Text>
            <GoalCalculator
              profile={profile}
              defaultOpen
              onCalculated={({ goals, body }) => {
                setKcal(String(goals.kcal));
                setCarbs(String(goals.carbs));
                setProtein(String(goals.protein));
                setFat(String(goals.fat));
                setBodyDraft(body);
              }}
            />
            <Field label={t('settings.goalKcal')} value={kcal} onChangeText={onKcalChange} keyboardType="numeric" />
            <Text style={styles.macroHint}>{t('goalsCalc.kcalDrivesMacros')}</Text>
            <Field label={t('settings.goalCarbs')} value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
            <Field label={t('settings.goalProtein')} value={protein} onChangeText={setProtein} keyboardType="numeric" />
            <Field label={t('settings.goalFat')} value={fat} onChangeText={setFat} keyboardType="numeric" />
            <Button title={t('onboarding.start')} onPress={() => finish(true)} loading={busy} />
            <Text style={styles.skip} onPress={() => finish(false)}>
              {t('common.skip')}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 26, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: spacing.s, marginBottom: spacing.xl, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.l },
  disclaimer: { fontSize: 12, color: colors.faint, marginBottom: spacing.xl, lineHeight: 17 },
  macroHint: { fontSize: 12, color: colors.faint, marginTop: -spacing.s, marginBottom: spacing.m, lineHeight: 16 },
  skip: { color: colors.muted, textAlign: 'center', marginTop: spacing.l, fontWeight: '600' },
});
