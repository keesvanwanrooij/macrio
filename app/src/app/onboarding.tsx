// Two-step onboarding: allergens (multi-select + Niets) → optional daily goals.
// Both steps are skippable; Skip/Niets persist allergens: [].
// Goals step mirrors Settings → Doelen (one body block, shared kcal, Berekenen / Macro's).
import React, { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalCalculator } from '../components/GoalCalculator';
import { GoalMacroEditor, type GoalMacroEditorHandle } from '../components/GoalMacroEditor';
import { Button, Chip, Field } from '../components/ui';
import { EU_ALLERGENS, noneChipListState } from '../lib/allergens';
import {
  type BodyMetricsDraft,
  type GoalFields,
  EMPTY_GOAL_FIELDS,
  NULL_GOAL_NUMBERS,
  bodyMetricsToProfilePatch,
  goalNumbersFromFields,
  goalsFieldsAllEmpty,
  goalsFieldsComplete,
  goalFieldsFromKcalInput,
  goalsFromPercents,
  weightFieldMessage,
} from '../lib/goalCalculator';
import { upsertTodayGoalRevision } from '../lib/goalRevisions';
import { isIsoDate } from '../lib/dates';
import { parseNum } from '../lib/nutrition';
import { useSession } from '../lib/session';
import { colors, spacing } from '../lib/theme';

export default function Onboarding() {
  const { t } = useTranslation();
  const { profile, updateProfile } = useSession();
  const [step, setStep] = useState<0 | 1>(0);
  const [selected, setSelected] = useState<string[]>([]);
  /** Start expanded so first-time users see Gluten…; Niets collapses the row. */
  const [allergenOptionsExpanded, setAllergenOptionsExpanded] = useState(true);
  const [goals, setGoals] = useState<GoalFields>(EMPTY_GOAL_FIELDS);
  const [bodyDraft, setBodyDraft] = useState<BodyMetricsDraft | null>(null);
  const [macroPercentResetKey, setMacroPercentResetKey] = useState(0);
  const [goalsPanel, setGoalsPanel] = useState<'calc' | 'macros' | null>('calc');
  const [weightDraft, setWeightDraft] = useState<string | null>(null);
  const [heightDraft, setHeightDraft] = useState<string | null>(null);
  const [dobDraft, setDobDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Weight soft/hard message only after blur (not mid-typing). */
  const [weightFieldConfirmed, setWeightFieldConfirmed] = useState(false);
  const macroEditorRef = useRef<GoalMacroEditorHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  const needsSectionOffsetY = useRef(0);

  const weightStr =
    weightDraft ??
    (profile?.weight_kg != null && profile.weight_kg > 0 ? String(profile.weight_kg) : '');
  const heightStr =
    heightDraft ??
    (profile?.height_cm != null && profile.height_cm > 0 ? String(profile.height_cm) : '');
  const dobStr = dobDraft ?? profile?.date_of_birth ?? '';
  const lichaamWeightKg = parseNum(weightStr);
  const lichaamHeightCm = parseNum(heightStr);

  function toggle(key: string) {
    setAllergenOptionsExpanded(true);
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  /** Niets: clear + hide EU pills. While Niets is active, use “…” to expand again. */
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

  /** Keep current macro % when editing kcal (same rule as Settings). */
  function onSharedKcalChange(raw: string) {
    if (goalsPanel === 'macros') {
      macroEditorRef.current?.setKcalRaw(raw);
      return;
    }
    const next = goalFieldsFromKcalInput(raw, goals);
    if (!next) return;
    if (raw.trim() === '' && goalsPanel !== 'calc') setGoalsPanel('calc');
    setGoals(next);
  }

  function scrollToNeedsSection() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, needsSectionOffsetY.current - 8), animated: true });
    });
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
      const goalPatch = persistGoals ? goalNumbersFromFields(goals) : NULL_GOAL_NUMBERS;
      const { error } = await updateProfile({
        allergens,
        ...goalPatch,
        ...(bodyDraft ? bodyMetricsToProfilePatch(bodyDraft) : {}),
        ...(lichaamWeightKg > 0 ? { weight_kg: lichaamWeightKg } : {}),
        ...(lichaamHeightCm > 0 ? { height_cm: lichaamHeightCm } : {}),
        ...(isIsoDate(dobStr) ? { date_of_birth: dobStr } : {}),
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 ? (
          <>
            {/*
             * SECTION: Allergen step
             * WHAT: Niets clears + hides pills; “…” expands them again. Skip saves allergens: [].
             */}
            <Text style={styles.title}>{t('onboarding.allergensTitle')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.allergensSubtitle')}</Text>
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
            <Button title={t('common.next')} onPress={() => setStep(1)} />
            <Text style={styles.skip} onPress={() => finish(false, [])}>
              {t('common.skip')}
            </Text>
          </>
        ) : (
          <>
            {/*
             * SECTION: Goals step (mirrors Settings → Doelen)
             * WHAT: One Mijn behoefte block: weight, kcal, chips, panels.
             */}
            <Text style={styles.title}>{t('onboarding.goalsTitle')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.goalsSubtitle')}</Text>

            <View
              collapsable={false}
              onLayout={(e) => {
                needsSectionOffsetY.current = e.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.sectionTitle}>{t('settings.goals')}</Text>
              <Text style={styles.hint}>{t('settings.goalsHint')}</Text>
            </View>

            <Field
              label={t('goalsCalc.weight')}
              value={weightStr}
              onChangeText={(v) => {
                setWeightFieldConfirmed(false);
                setWeightDraft(v);
              }}
              onBlur={() => setWeightFieldConfirmed(true)}
              keyboardType="numeric"
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

            <View style={styles.goalModeRow}>
              <Chip
                label={t('settings.goalsModeSimple')}
                active={goalsPanel === 'calc'}
                onPress={() => setGoalsPanel(goalsPanel === 'calc' ? null : 'calc')}
              />
              <Chip
                label={t('settings.goalsModeAdvanced')}
                active={goalsPanel === 'macros'}
                onPress={() => setGoalsPanel(goalsPanel === 'macros' ? null : 'macros')}
              />
            </View>

            {goalsPanel === 'calc' ? (
              <>
                <Text style={styles.panelHint}>{t('onboarding.calculateHint')}</Text>
                <GoalCalculator
                  profile={profile}
                  weightText={weightStr}
                  heightText={heightStr}
                  onWeightTextChange={setWeightDraft}
                  onHeightTextChange={setHeightDraft}
                  dobText={dobStr}
                  onDobTextChange={setDobDraft}
                  hideWeightField
                  showToggle={false}
                  open
                  hideResultKcal
                  onCalculated={({ goals: calcGoals, body }) => {
                    setGoals(goalsFromPercents(calcGoals.kcal));
                    setBodyDraft(body);
                    setMacroPercentResetKey((k) => k + 1);
                    scrollToNeedsSection();
                  }}
                />
              </>
            ) : null}

            {goalsPanel === 'macros' ? (
              <>
                <Text style={styles.panelHint}>{t('onboarding.macrosHint')}</Text>
                <GoalMacroEditor
                  ref={macroEditorRef}
                  key={`macro-editor-${macroPercentResetKey}`}
                  value={goals}
                  onChange={setGoals}
                  weightKg={lichaamWeightKg > 0 ? lichaamWeightKg : 0}
                  percentResetKey={macroPercentResetKey}
                  hideKcalField
                />
              </>
            ) : null}

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
  subtitle: { fontSize: 15, color: colors.muted, marginTop: spacing.s, marginBottom: spacing.l, lineHeight: 21 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.s,
    marginBottom: spacing.xs,
  },
  hint: { fontSize: 13, color: colors.muted, marginBottom: spacing.s, lineHeight: 18 },
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
  panelHint: { fontSize: 13, color: colors.muted, marginBottom: spacing.s, lineHeight: 18 },
  goalModeRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.l },
  disclaimer: { fontSize: 12, color: colors.faint, marginBottom: spacing.l, lineHeight: 17 },
  skip: { textAlign: 'center', color: colors.muted, marginTop: spacing.l, fontWeight: '600' },
});
