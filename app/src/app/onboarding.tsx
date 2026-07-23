// Two-step onboarding: allergens (multi-select + Niets) → optional daily goals.
// Both steps are skippable; Skip/Niets persist allergens: [].
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalCalculator } from '../components/GoalCalculator';
import { GoalMacroEditor } from '../components/GoalMacroEditor';
import { Button, Chip } from '../components/ui';
import { EU_ALLERGENS } from '../lib/allergens';
import {
  type BodyMetricsDraft,
  type GoalFields,
  goalsFieldsAllEmpty,
  goalsFieldsComplete,
  goalsFromPercents,
} from '../lib/goalCalculator';
import { upsertTodayGoalRevision } from '../lib/goalRevisions';
import { parseNum } from '../lib/nutrition';
import { useSession } from '../lib/session';
import { colors, spacing } from '../lib/theme';

export default function Onboarding() {
  const { t } = useTranslation();
  const { profile, updateProfile } = useSession();
  const [step, setStep] = useState<0 | 1>(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [goals, setGoals] = useState<GoalFields>({ kcal: '', carbs: '', protein: '', fat: '' });
  const [bodyDraft, setBodyDraft] = useState<BodyMetricsDraft | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(key: string) {
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  /** Niets / Nothing: no allergies → empty list, then goals step. */
  function chooseNothing() {
    setSelected([]);
    setStep(1);
  }

  async function finish(withGoals: boolean, allergens: string[] = selected) {
    let persistGoals = withGoals;
    if (withGoals) {
      if (goalsFieldsAllEmpty(goals)) {
        persistGoals = false;
      } else if (!goalsFieldsComplete(goals)) {
        Alert.alert(t('common.error'), t('goalsCalc.goalsIncomplete'));
        return;
      }
    }
    setBusy(true);
    try {
      const goalPatch = {
        goal_kcal: persistGoals ? parseNum(goals.kcal) || null : null,
        goal_carbs: persistGoals ? parseNum(goals.carbs) || null : null,
        goal_protein: persistGoals ? parseNum(goals.protein) || null : null,
        goal_fat: persistGoals ? parseNum(goals.fat) || null : null,
      };
      const { error } = await updateProfile({
        allergens,
        ...goalPatch,
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
      } else if (persistGoals) {
        await upsertTodayGoalRevision({
          goal_kcal: goalPatch.goal_kcal,
          goal_carbs: goalPatch.goal_carbs,
          goal_protein: goalPatch.goal_protein,
          goal_fat: goalPatch.goal_fat,
        });
      }
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const weightKg = bodyDraft?.weight_kg ?? profile?.weight_kg ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            {/*
             * SECTION: Allergen step
             * WHAT: EU-14 chips + Niets (none). Skip also saves allergens: [].
             */}
            <Text style={styles.title}>{t('onboarding.allergensTitle')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.allergensSubtitle')}</Text>
            <View style={styles.chips}>
              <Chip
                label={t('onboarding.allergensNothing')}
                active={selected.length === 0}
                onPress={chooseNothing}
              />
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
            <Text style={styles.skip} onPress={() => finish(false, [])}>
              {t('common.skip')}
            </Text>
          </>
        ) : (
          <>
            {/*
             * SECTION: Goals step
             * WHAT: Calculator (default closed) + GoalMacroEditor sliders/grams.
             */}
            <Text style={styles.title}>{t('onboarding.goalsTitle')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.goalsSubtitle')}</Text>
            <GoalCalculator
              profile={profile}
              defaultOpen={false}
              onCalculated={({ goals: calcGoals, body }) => {
                setGoals(goalsFromPercents(calcGoals.kcal));
                setBodyDraft(body);
              }}
            />
            <GoalMacroEditor value={goals} onChange={setGoals} weightKg={weightKg} />
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
  disclaimer: { fontSize: 12, color: colors.faint, marginBottom: spacing.l, lineHeight: 17 },
  skip: { textAlign: 'center', color: colors.muted, marginTop: spacing.l, fontWeight: '600' },
});
