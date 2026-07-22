// Settings: profile, language, preferences, allergens, goals, feedback,
// about (attribution + sponsor), sign out, GDPR account deletion.
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card, Chip, Field, Loading, SectionTitle } from '../../components/ui';
import { GoalCalculator } from '../../components/GoalCalculator';
import { EU_ALLERGENS } from '../../lib/allergens';
import { APP_VERSION } from '../../lib/appMeta';
import type { BodyMetricsDraft } from '../../lib/goalCalculator';
import { macrosFromKcal } from '../../lib/goalCalculator';
import { upsertTodayGoalRevision } from '../../lib/goalRevisions';
import { parseNum } from '../../lib/nutrition';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../lib/theme';

const SPONSOR_URL = 'https://github.com/sponsors/keesvanwanrooij';

function profileSaveErrorMessage(raw: string, t: (k: string) => string): string {
  const m = raw.toLowerCase();
  if (m.includes('date_of_birth') || m.includes('height_cm') || m.includes('weight_kg') || m.includes('weight_goal') || m.includes('schema cache')) {
    return t('settings.bodyMetricsMigrationHint');
  }
  return raw;
}

export default function Settings() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, updateProfile } = useSession();
  const [goalDraft, setGoalDraft] = useState<{ [k: string]: string } | null>(null);
  const [bodyDraft, setBodyDraft] = useState<BodyMetricsDraft | null>(null);
  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null);
  const [savingBody, setSavingBody] = useState(false);

  if (!profile) return <Loading />;

  const savedFullName = profile.full_name ?? '';
  const fullName = fullNameDraft ?? savedFullName;
  const fullNameDirty = fullNameDraft !== null && fullName.trim() !== savedFullName;
  const goals = goalDraft ?? {
    kcal: profile.goal_kcal ? String(profile.goal_kcal) : '',
    carbs: profile.goal_carbs ? String(profile.goal_carbs) : '',
    protein: profile.goal_protein ? String(profile.goal_protein) : '',
    fat: profile.goal_fat ? String(profile.goal_fat) : '',
  };

  function setGoal(key: string, value: string) {
    setGoalDraft({ ...goals, [key]: value });
  }

  async function saveFullName() {
    const trimmed = fullName.trim();
    const { error } = await updateProfile({ full_name: trimmed || null });
    if (error) {
      Alert.alert(t('common.error'), profileSaveErrorMessage(error, t));
      return;
    }
    setFullNameDraft(null);
  }

  async function saveGoals() {
    const patch = {
      goal_kcal: parseNum(goals.kcal) || null,
      goal_carbs: parseNum(goals.carbs) || null,
      goal_protein: parseNum(goals.protein) || null,
      goal_fat: parseNum(goals.fat) || null,
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
    };
    const { error } = await updateProfile(patch);
    if (error) {
      Alert.alert(t('common.error'), profileSaveErrorMessage(error, t));
      return;
    }
    // Snapshot today's goals so past report days keep old targets
    await upsertTodayGoalRevision({
      goal_kcal: patch.goal_kcal,
      goal_carbs: patch.goal_carbs,
      goal_protein: patch.goal_protein,
      goal_fat: patch.goal_fat,
    });
    setGoalDraft(null);
    setBodyDraft(null);
  }

  function setGoalKcal(value: string) {
    const weightKg = profile!.weight_kg ?? 0;
    const weightGoal = profile!.weight_goal ?? 'maintain';
    const macros = macrosFromKcal(parseNum(value), weightKg, weightGoal);
    if (macros) {
      setGoalDraft({
        kcal: value,
        carbs: String(macros.carbs),
        protein: String(macros.protein),
        fat: String(macros.fat),
      });
    } else {
      // Empty/0 kcal or no weight: clear auto macros (do not leave stale 1 g carbs)
      setGoalDraft({ kcal: value, carbs: '', protein: '', fat: '' });
    }
  }

  function toggleAllergen(key: string) {
    const cur = profile!.allergens;
    updateProfile({
      allergens: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    });
  }

  function confirmDelete() {
    Alert.alert(t('settings.deleteConfirmTitle'), t('settings.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('delete_account');
          if (error) Alert.alert(t('common.error'), error.message);
          else await supabase.auth.signOut();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.l, paddingBottom: spacing.xxl }}>
      <SectionTitle>{t('settings.profile')}</SectionTitle>
      <Text style={styles.prefLabel}>{t('settings.username')}</Text>
      <Text style={styles.profileValue}>{profile.username}</Text>
      <Field
        label={t('settings.fullName')}
        value={fullName}
        onChangeText={setFullNameDraft}
        trimOnBlur
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        placeholder={t('settings.fullNameOptional')}
      />
      {fullNameDirty && <Button title={t('common.save')} onPress={saveFullName} />}

      <SectionTitle>{t('settings.language')}</SectionTitle>
      <View style={styles.row}>
        <Chip label={t('settings.dutch')} active={profile.language === 'nl'} onPress={() => updateProfile({ language: 'nl' })} />
        <Chip label={t('settings.english')} active={profile.language === 'en'} onPress={() => updateProfile({ language: 'en' })} />
      </View>

      <SectionTitle>{t('settings.preferences')}</SectionTitle>
      <Text style={styles.prefLabel}>{t('settings.countDirection')}</Text>
      <View style={styles.row}>
        <Chip label={t('settings.countUp')} active={profile.count_direction === 'up'} onPress={() => updateProfile({ count_direction: 'up' })} />
        <Chip label={t('settings.countDown')} active={profile.count_direction === 'down'} onPress={() => updateProfile({ count_direction: 'down' })} />
      </View>
      <Text style={styles.prefLabel}>{t('settings.macroDisplay')}</Text>
      <View style={styles.row}>
        <Chip label={t('settings.displayOverview')} active={profile.macro_display === 'overview'} onPress={() => updateProfile({ macro_display: 'overview' })} />
        <Chip label={t('settings.displayFocus')} active={profile.macro_display === 'focus'} onPress={() => updateProfile({ macro_display: 'focus' })} />
      </View>

      <SectionTitle>{t('settings.myAllergens')}</SectionTitle>
      <View style={styles.row}>
        {EU_ALLERGENS.map((key) => (
          <Chip key={key} label={t(`allergens.${key}`)} active={profile.allergens.includes(key)} onPress={() => toggleAllergen(key)} />
        ))}
      </View>
      <Text style={styles.disclaimer}>{t('allergens.disclaimer')}</Text>

      <SectionTitle>{t('settings.goals')}</SectionTitle>
      <GoalCalculator
        profile={profile}
        onCalculated={async ({ goals: calcGoals, body }) => {
          // One tap: persist body metrics + calculated macro goals (no second Save)
          setSavingBody(true);
          const patch = {
            goal_kcal: calcGoals.kcal,
            goal_carbs: calcGoals.carbs,
            goal_protein: calcGoals.protein,
            goal_fat: calcGoals.fat,
            date_of_birth: body.date_of_birth,
            height_cm: body.height_cm,
            weight_kg: body.weight_kg,
            gender: body.gender,
            activity_level: body.activity_level,
            weight_goal: body.weight_goal,
          };
          const { error } = await updateProfile(patch);
          setSavingBody(false);
          if (error) {
            // Keep draft so the user can edit and tap Save
            setBodyDraft(body);
            setGoalDraft({
              kcal: String(calcGoals.kcal),
              carbs: String(calcGoals.carbs),
              protein: String(calcGoals.protein),
              fat: String(calcGoals.fat),
            });
            Alert.alert(t('common.error'), profileSaveErrorMessage(error, t));
            return;
          }
          await upsertTodayGoalRevision({
            goal_kcal: patch.goal_kcal,
            goal_carbs: patch.goal_carbs,
            goal_protein: patch.goal_protein,
            goal_fat: patch.goal_fat,
          });
          setGoalDraft(null);
          setBodyDraft(null);
          Alert.alert(t('settings.bodySavedTitle'), t('settings.bodySavedBody'));
        }}
      />
      {savingBody ? <Text style={styles.disclaimer}>{t('common.loading')}</Text> : null}
      <Field label={t('settings.goalKcal')} value={goals.kcal} onChangeText={setGoalKcal} keyboardType="numeric" />
      <Text style={styles.disclaimer}>{t('goalsCalc.kcalDrivesMacros')}</Text>
      <Field label={t('settings.goalCarbs')} value={goals.carbs} onChangeText={(v) => setGoal('carbs', v)} keyboardType="numeric" />
      <Field label={t('settings.goalProtein')} value={goals.protein} onChangeText={(v) => setGoal('protein', v)} keyboardType="numeric" />
      <Field label={t('settings.goalFat')} value={goals.fat} onChangeText={(v) => setGoal('fat', v)} keyboardType="numeric" />
      {goalDraft && <Button title={t('common.save')} onPress={saveGoals} />}

      <SectionTitle>{t('feedback.title')}</SectionTitle>
      <Button title={t('settings.feedback')} variant="secondary" onPress={() => router.push('/feedback')} />

      <SectionTitle>{t('settings.about')}</SectionTitle>
      <Card>
        <Text style={styles.aboutText}>{t('settings.aboutText')}</Text>
        <Text style={styles.aboutMeta}>
          {t('settings.version')} {APP_VERSION}
          {'  ·  '}
          {t('settings.license')}
        </Text>
        <View style={{ height: spacing.m }} />
        <Button title={t('settings.sponsor')} onPress={() => Linking.openURL(SPONSOR_URL)} />
      </Card>

      <View style={{ height: spacing.xl }} />
      <Button title={t('settings.signOut')} variant="secondary" onPress={() => supabase.auth.signOut()} />
      <View style={{ height: spacing.s }} />
      <Button title={t('settings.deleteAccount')} variant="danger" onPress={confirmDelete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  prefLabel: { fontSize: 13, color: colors.muted, fontWeight: '600', marginBottom: spacing.s, marginTop: spacing.s },
  profileValue: { fontSize: 20, color: colors.text, fontWeight: '700', marginBottom: spacing.m },
  disclaimer: { fontSize: 12, color: colors.faint, lineHeight: 17, marginTop: spacing.xs },
  aboutText: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  aboutMeta: { fontSize: 12, color: colors.faint, marginTop: spacing.s },
});
