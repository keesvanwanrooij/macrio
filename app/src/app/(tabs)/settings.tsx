/*
 * SECTION: Settings
 * WHAT: Profile identity, preferences, allergens, goals, privacy (export/delete), about, sign out.
 * HOW: Header section switcher (like Reports day/week) → only one panel visible.
 *      Local drafts for identity/goals → updateProfile / Auth updateUser / RPCs for GDPR.
 * INPUT: session profile + auth user email
 * OUTPUT: persisted profile/auth changes; export share sheet; soft-delete then signOut
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ActivityIndicator, Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

import { Button, Card, Chip, Field, Loading, PasswordField, SectionTitle } from '../../components/ui';
import { GoalCalculator } from '../../components/GoalCalculator';
import { GoalMacroEditor, type GoalMacroEditorHandle } from '../../components/GoalMacroEditor';
import { NativeDatePicker } from '../../components/NativeDatePicker';
import { EU_ALLERGENS, noneChipListState } from '../../lib/allergens';
import { APP_VERSION } from '../../lib/appMeta';
import { getEmailChangeRedirectUrl } from '../../lib/authDeepLink';
import {
  isValidEmail,
  normalizeEmail,
  reauthenticateWithPassword,
  usernameErrorI18nKey,
} from '../../lib/auth';
import {
  NULL_GOAL_NUMBERS,
  ageFromDateOfBirth,
  buildGoalCalcInput,
  calculateDailyGoals,
  goalNumbersFromFields,
  goalsFieldsAllEmpty,
  goalsFieldsComplete,
  goalsFieldsDirty,
  goalFieldsFromKcalInput,
  goalsFromKcalKeepingSplit,
  heightFieldMessage,
  ageFieldMessage,
  weightFieldMessage,
  GENDERS,
  isGender,
  macroPercentsFromGoalFields,
  type BodyMetricsDraft,
  type Gender,
  type GoalFields,
} from '../../lib/goalCalculator';
import { upsertTodayGoalRevision } from '../../lib/goalRevisions';
import { parseNum } from '../../lib/nutrition';
import { captureException, isSentryEnabled } from '../../lib/sentry';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../lib/theme';
import { isValidUsername, sanitizeUsernameInput } from '../../lib/username';
import {
  DATE_FORMATS,
  DOB_PICKER_FALLBACK_ISO,
  DOB_PICKER_MIN_ISO,
  isIsoDate,
  isoToDate,
  resolveDateFormat,
  todayIso,
} from '../../lib/dates';
import { fetchMyDataExport, shareDataExport } from '../../lib/dataExport';
import { formatLocaleMetric } from '../../lib/localeNumber';

const SPONSOR_URL = 'https://github.com/sponsors/keesvanwanrooij';
/** Persist auto-update checkbox across app restarts (device-local). */
const AUTO_UPDATE_KCAL_KEY = '@macrio/goals_auto_update_kcal';

type SettingsSection = 'preferences' | 'goals' | 'account' | 'privacy' | 'about';

const SETTINGS_SECTIONS: SettingsSection[] = ['goals', 'account', 'preferences', 'privacy', 'about'];

/*
 * SECTION: Settings draft save affordance (Doelen + Account identity/body)
 * WHAT: Grey “Tik om op te slaan” while dirty; green “Opgeslagen” when clean.
 * HOW: Tap pending label to flush, or leave the section / Settings. No countdown.
 * INPUT: busy, label, onPress (pending only)
 * OUTPUT: Pressable or static status row
 */
function SettingsSavePendingButton({
  busy,
  label,
  onPress,
}: {
  busy: boolean;
  label: string;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (busy) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [busy, pulse]);

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy }}
      hitSlop={8}
    >
      <View style={styles.goalsSaveStatusRow}>
        <View style={styles.goalsSaveIconSlot}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.muted} />
          ) : (
            <Animated.View style={[styles.goalsSavePulseDot, { opacity: pulse }]} />
          )}
        </View>
        <Text style={styles.goalsSavePendingText} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function SettingsSavedLabel({ label }: { label: string }) {
  return (
    <View style={styles.goalsSaveStatusRow} accessibilityRole="text">
      <View style={styles.goalsSaveIconSlot}>
        <View style={styles.goalsSaveDoneDot} />
      </View>
      <Text style={styles.goalsSaveStatusOk} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function profileSaveErrorMessage(raw: string, t: (k: string) => string): string {
  const m = raw.toLowerCase();
  if (m.includes('date_of_birth') || m.includes('height_cm') || m.includes('weight_kg') || m.includes('weight_goal') || m.includes('schema cache')) {
    return t('settings.bodyMetricsMigrationHint');
  }
  if (m.includes('date_format')) {
    return t('settings.dateFormatMigrationHint');
  }
  return raw;
}

function usernameSaveError(raw: string, t: (k: string) => string): string {
  const key = usernameErrorI18nKey(raw);
  return key ? t(key) : raw;
}

function sectionLabelKey(section: SettingsSection): string {
  switch (section) {
    case 'account':
      return 'settings.sectionAccount';
    case 'preferences':
      return 'settings.sectionPreferences';
    case 'goals':
      return 'settings.sectionGoals';
    case 'privacy':
      return 'settings.sectionPrivacy';
    case 'about':
      return 'settings.sectionAbout';
  }
}

export default function Settings() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, profile, updateProfile } = useSession();
  const [section, setSection] = useState<SettingsSection>('goals');
  const [goalDraft, setGoalDraft] = useState<GoalFields | null>(null);
  const [bodyDraft, setBodyDraft] = useState<BodyMetricsDraft | null>(null);
  const [weightDraft, setWeightDraft] = useState<string | null>(null);
  /** Account body metrics (height / DOB / gender); saved on Account, not via Doelen flush. */
  const [heightDraft, setHeightDraft] = useState<string | null>(null);
  const [dobDraft, setDobDraft] = useState<string | null>(null);
  const [genderDraft, setGenderDraft] = useState<Gender | null>(null);
  const [accountHeightConfirmed, setAccountHeightConfirmed] = useState(false);
  /** Accordion: calculator | macros | neither. Open calc by default when no goals yet. */
  const [goalsPanel, setGoalsPanel] = useState<'calc' | 'macros' | null>(
    profile?.goal_kcal != null && profile.goal_kcal > 0 ? null : 'calc'
  );
  /** When on, Mifflin recalculates kcal as body / calculator inputs change (keeps macro %). */
  const [autoUpdateKcal, setAutoUpdateKcal] = useState(false);
  /** When false and allergens empty, only “Niets” shows (collapse pattern). */
  const [allergenOptionsExpanded, setAllergenOptionsExpanded] = useState(
    () => (profile?.allergens.length ?? 0) > 0
  );
  /** Local allergen selection until tap-save / leave (same as goals drafts). */
  const [allergensDraft, setAllergensDraft] = useState<string[] | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const needsSectionOffsetY = useRef(0);
  const macroEditorRef = useRef<GoalMacroEditorHandle>(null);
  /** Guards overlapping flushes (tap save + leave). */
  const flushingRef = useRef(false);
  const flushGoalsTabRef = useRef<(opts?: { silent?: boolean }) => Promise<boolean>>(async () => true);
  const flushAccountTabRef = useRef<(opts?: { silent?: boolean }) => Promise<boolean>>(async () => true);
  const settingsGoalsDirtyRef = useRef(false);
  const goalsRef = useRef<GoalFields>({ kcal: '', protein: '', carbs: '', fat: '' });
  const bodyDraftRef = useRef<BodyMetricsDraft | null>(null);
  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null);
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [usernamePassword, setUsernamePassword] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  /** True while flushGoalsTab is in flight (spinner in save slot). */
  const [flushingGoals, setFlushingGoals] = useState(false);
  /** True while Account name/body flush is in flight. */
  const [flushingAccount, setFlushingAccount] = useState(false);
  /** Weight soft/hard message only after blur (not mid-typing). */
  const [weightFieldConfirmed, setWeightFieldConfirmed] = useState(false);

  // Password change (re-auth with current password, then updateUser); collapsed like GoalCalculator
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Email change (confirm-to-new-address); draft pattern matches username / full name
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [emailPassword, setEmailPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [exporting, setExporting] = useState(false);

  /*
   * SECTION: Draft save (Settings)
   * WHAT: Persist dirty Doelen + Account drafts on leave Settings tab, or tap status.
   * HOW: useFocusEffect cleanup flushes both; section switch flushes the panel left.
   */
  useFocusEffect(
    useCallback(() => {
      return () => {
        void flushGoalsTabRef.current({ silent: true });
        void flushAccountTabRef.current({ silent: true });
      };
    }, [])
  );

  // Restore auto-update preference from last session
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(AUTO_UPDATE_KCAL_KEY).then((raw) => {
      if (cancelled) return;
      if (raw === '1') setAutoUpdateKcal(true);
      else if (raw === '0') setAutoUpdateKcal(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!profile) return <Loading />;
  // Stable non-null alias for closures (flushGoalsTab) so TS keeps the narrow
  const savedProfile = profile;

  const savedFullName = savedProfile.full_name ?? '';
  const fullName = fullNameDraft ?? savedFullName;
  const fullNameDirty = fullNameDraft !== null && fullName.trim() !== savedFullName;

  const username = usernameDraft ?? savedProfile.username;
  const usernameDirty =
    usernameDraft !== null && sanitizeUsernameInput(username) !== savedProfile.username;

  const dateFormat = resolveDateFormat(savedProfile.date_format);
  const accountEmail = session?.user?.email ?? '';
  const email = emailDraft ?? accountEmail;
  const emailDirty =
    emailDraft !== null && normalizeEmail(email) !== normalizeEmail(accountEmail);

  const goals: GoalFields = goalDraft ?? {
    kcal: savedProfile.goal_kcal != null ? String(savedProfile.goal_kcal) : '',
    carbs: savedProfile.goal_carbs != null ? String(savedProfile.goal_carbs) : '',
    protein: savedProfile.goal_protein != null ? String(savedProfile.goal_protein) : '',
    fat: savedProfile.goal_fat != null ? String(savedProfile.goal_fat) : '',
  };

  /** Live macro % for Berekenen disclaimer (matches Macro's screen / default 50/20/30). */
  const disclaimerMacroPercents = macroPercentsFromGoalFields(goals);

  const weightStr =
    weightDraft ??
    (savedProfile.weight_kg != null && savedProfile.weight_kg > 0
      ? formatLocaleMetric(savedProfile.weight_kg)
      : '');
  // Height / DOB live on Account; Doelen reads saved profile only (for Mifflin + reminder)
  const heightStr =
    savedProfile.height_cm != null && savedProfile.height_cm > 0
      ? formatLocaleMetric(savedProfile.height_cm, 1)
      : '';
  const dobStr = savedProfile.date_of_birth ?? '';
  const lichaamWeightKg = parseNum(weightStr);
  const lichaamHeightCm = parseNum(heightStr);

  const accountHeightStr =
    heightDraft ??
    (savedProfile.height_cm != null && savedProfile.height_cm > 0
      ? formatLocaleMetric(savedProfile.height_cm, 1)
      : '');
  const accountDobStr = dobDraft ?? savedProfile.date_of_birth ?? '';
  const accountHeightCm = parseNum(accountHeightStr);
  const accountGender =
    genderDraft ?? (isGender(savedProfile.gender) ? savedProfile.gender : null);
  const accountAgeYears = isIsoDate(accountDobStr) ? ageFromDateOfBirth(accountDobStr) : null;
  const accountHeightMsg = heightFieldMessage(accountHeightStr, accountHeightCm);
  const accountAgeMsg = ageFieldMessage(accountAgeYears);
  // Stable Date identities: new Date() each render resets the native DOB spinner mid-scroll
  const accountDobMaximumDate = useMemo(() => isoToDate(todayIso()), []);
  const accountDobMinimumDate = useMemo(() => isoToDate(DOB_PICKER_MIN_ISO), []);
  const allergens = allergensDraft ?? savedProfile.allergens;
  const allergenNoneUi = noneChipListState(allergens.length, allergenOptionsExpanded);

  /** True when the editor draft differs from what is already on the profile. */
  const goalsDirty = goalDraft
    ? goalsFieldsDirty(goalDraft, {
        goal_kcal: savedProfile.goal_kcal,
        goal_carbs: savedProfile.goal_carbs,
        goal_protein: savedProfile.goal_protein,
        goal_fat: savedProfile.goal_fat,
      })
    : false;

  function onGoalsChange(next: GoalFields) {
    setGoalDraft(next);
  }

  goalsRef.current = goals;
  bodyDraftRef.current = bodyDraft;

  /**
   * Shared Calorieën box: always keep the current macro %.
   * Only “Macro's resetten” snaps back to 50/20/30 (Bereken keeps the split too).
   * Empty kcal → clear macros and open Berekenen so the user can recalculate.
   */
  function onSharedKcalChange(raw: string) {
    if (goalsPanel === 'macros') {
      macroEditorRef.current?.setKcalRaw(raw);
      return;
    }
    const next = goalFieldsFromKcalInput(raw, goals);
    if (!next) return;
    if (raw.trim() === '' && goalsPanel !== 'calc') setGoalsPanel('calc');
    onGoalsChange(next);
  }

  function scrollToNeedsSection() {
    // After Bereken doelen, bring “Mijn behoefte” (kcal + chips) back into view
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, needsSectionOffsetY.current - 8), animated: true });
    });
  }

  /** Treat null / missing / ≤0 as the same empty body metric. */
  function sameBodyMetric(a: number | null | undefined, b: number | null | undefined): boolean {
    const norm = (v: number | null | undefined) => (v != null && v > 0 ? v : null);
    return norm(a) === norm(b);
  }

  function allergensEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((k, i) => k === sb[i]);
  }

  /** True when calculator body meta differs from what is already saved (Doelen-owned fields only). */
  function bodyMetricsDifferFromProfile(body: BodyMetricsDraft): boolean {
    // Height / DOB / gender live on Account; ignore them here so Doelen dirty stays accurate
    if (body.activity_level !== (savedProfile.activity_level ?? null)) return true;
    if (body.weight_goal !== (savedProfile.weight_goal ?? null)) return true;
    if (!sameBodyMetric(body.weight_kg, savedProfile.weight_kg)) return true;
    return false;
  }

  /**
   * Auto Mifflin result: update drafts only when kcal/macros or body meta actually differ from profile.
   * Avoids phantom “Tik om op te slaan” when auto-update echoes the same values.
   */
  function applyAutoCalculated(payload: { goals: { kcal: number }; body: BodyMetricsDraft }) {
    const dirtyBody = bodyMetricsDifferFromProfile(payload.body);
    // Same maintenance answer as saved → do not rewrite macro grams (rounding noise)
    if (savedProfile.goal_kcal != null && payload.goals.kcal === savedProfile.goal_kcal && !dirtyBody) {
      return;
    }
    const next = goalsFromKcalKeepingSplit(payload.goals.kcal, goalsRef.current);
    const dirtyGoals = goalsFieldsDirty(next, {
      goal_kcal: savedProfile.goal_kcal,
      goal_carbs: savedProfile.goal_carbs,
      goal_protein: savedProfile.goal_protein,
      goal_fat: savedProfile.goal_fat,
    });
    if (!dirtyGoals && !dirtyBody) return;
    if (dirtyBody) setBodyDraft(payload.body);
    if (dirtyGoals) setGoalDraft(next);
  }

  /**
   * Persist body + goal + allergen drafts (leave Doelen, or tap “Tik om op te slaan”).
   * silent: no alerts on network errors; incomplete goals stay visible inline (not only on leave).
   * Skips updateProfile / revisions when nothing actually differs from the profile.
   */
  async function flushGoalsTab(opts?: { silent?: boolean }): Promise<boolean> {
    if (flushingRef.current) return true;
    flushingRef.current = true;
    setFlushingGoals(true);
    const silent = opts?.silent === true;
    try {
      const bodyPatch: Partial<{
        weight_kg: number | null;
      }> = {};
      if (weightDraft !== null) {
        const next = lichaamWeightKg > 0 ? lichaamWeightKg : null;
        if (!sameBodyMetric(next, savedProfile.weight_kg)) bodyPatch.weight_kg = next;
      }

      let goalPatch = null as ReturnType<typeof goalNumbersFromFields> | typeof NULL_GOAL_NUMBERS | null;
      let goalsBlockedIncomplete = false;
      if (goalDraft) {
        if (!goalsFieldsAllEmpty(goalDraft) && !goalsFieldsComplete(goalDraft)) {
          goalsBlockedIncomplete = true;
          goalPatch = null;
          if (!silent) {
            Alert.alert(t('common.error'), t('goalsCalc.goalsIncomplete'));
            return false;
          }
        } else if (!goalsDirty) {
          goalPatch = null;
          setGoalDraft(null);
        } else {
          goalPatch = goalsFieldsAllEmpty(goalDraft) ? NULL_GOAL_NUMBERS : goalNumbersFromFields(goalDraft);
        }
      }

      const calcMeta = bodyDraft
        ? {
            // Gender / DOB / height live on Account; Doelen only persists activity + weight goal
            activity_level: bodyDraft.activity_level,
            weight_goal: bodyDraft.weight_goal,
          }
        : null;

      // Only include calc meta fields that differ from the saved profile
      const calcMetaPatch: Partial<{
        activity_level: typeof savedProfile.activity_level;
        weight_goal: typeof savedProfile.weight_goal;
      }> = {};
      if (calcMeta) {
        if (calcMeta.activity_level !== (savedProfile.activity_level ?? null)) {
          calcMetaPatch.activity_level = calcMeta.activity_level;
        }
        if (calcMeta.weight_goal !== (savedProfile.weight_goal ?? null)) {
          calcMetaPatch.weight_goal = calcMeta.weight_goal;
        }
      }

      const allergensPatch =
        allergensDraft !== null && !allergensEqual(allergensDraft, savedProfile.allergens)
          ? { allergens: allergensDraft }
          : null;

      const patch = {
        ...bodyPatch,
        ...(goalPatch ?? {}),
        ...calcMetaPatch,
        ...(allergensPatch ?? {}),
      };

      const hasDbWrite = Object.keys(patch).length > 0;
      if (!hasDbWrite) {
        // Clear local drafts that matched profile (no network)
        if (goalDraft && !goalsDirty && !goalsBlockedIncomplete) setGoalDraft(null);
        if (weightDraft !== null) setWeightDraft(null);
        if (bodyDraft) setBodyDraft(null);
        if (allergensDraft !== null) setAllergensDraft(null);
        return true;
      }

      const { error } = await updateProfile(patch);
      if (error) {
        if (!silent) Alert.alert(t('common.error'), profileSaveErrorMessage(error, t));
        return false;
      }
      if (goalPatch) {
        await upsertTodayGoalRevision(goalPatch);
        setGoalDraft(null);
      }
      if (weightDraft !== null) setWeightDraft(null);
      setBodyDraft(null);
      if (allergensDraft !== null) setAllergensDraft(null);
      return true;
    } finally {
      flushingRef.current = false;
      setFlushingGoals(false);
    }
  }

  flushGoalsTabRef.current = flushGoalsTab;

  // Value-based dirty (typing the same saved weight should not keep “Opslaan…”)
  const weightDirty =
    weightDraft !== null &&
    !sameBodyMetric(lichaamWeightKg > 0 ? lichaamWeightKg : null, savedProfile.weight_kg);

  const allergensDirty =
    allergensDraft !== null && !allergensEqual(allergensDraft, savedProfile.allergens);

  const bodyDirty = bodyDraft != null && bodyMetricsDifferFromProfile(bodyDraft);

  const settingsGoalsDirty =
    goalsDirty || weightDirty || bodyDirty || allergensDirty;
  settingsGoalsDirtyRef.current = settingsGoalsDirty;

  const accountBodyDirty =
    (heightDraft !== null &&
      !sameBodyMetric(accountHeightCm > 0 ? accountHeightCm : null, savedProfile.height_cm)) ||
    (dobDraft !== null &&
      (isIsoDate(accountDobStr) ? accountDobStr : null) !== (savedProfile.date_of_birth ?? null)) ||
    (genderDraft !== null && genderDraft !== (savedProfile.gender ?? null));

  /** Name + body drafts (not username/email: those need password confirm). */
  const accountDraftDirty = fullNameDirty || accountBodyDirty;

  const needsAccountBody =
    !(lichaamHeightCm > 0) || !isIsoDate(dobStr) || !isGender(savedProfile.gender);

  /** Partial goal draft (e.g. empty protein while typing) - show inline, not only on leave Alert. */
  const goalsIncomplete =
    goalDraft != null && !goalsFieldsAllEmpty(goalDraft) && !goalsFieldsComplete(goalDraft);

  /*
   * Single auto-update path (open or closed Berekenen): shared buildGoalCalcInput + applyAutoCalculated.
   * GoalCalculator only hides the Bereken button when autoUpdate is on.
   */
  useEffect(() => {
    if (!autoUpdateKcal) return;
    const timer = setTimeout(() => {
      const draft = bodyDraftRef.current;
      const dateOfBirth = isIsoDate(dobStr)
        ? dobStr
        : draft?.date_of_birth ?? savedProfile.date_of_birth;
      const input = buildGoalCalcInput({
        weightKg: lichaamWeightKg,
        heightCm: lichaamHeightCm,
        dateOfBirth,
        gender: draft?.gender ?? savedProfile.gender,
        activity: draft?.activity_level ?? savedProfile.activity_level,
        weightGoal: draft?.weight_goal ?? savedProfile.weight_goal,
      });
      if (!input || !dateOfBirth) return;
      const result = calculateDailyGoals(input);
      if (!result) return;
      applyAutoCalculated({
        goals: result,
        body: {
          date_of_birth: dateOfBirth,
          height_cm: lichaamHeightCm,
          weight_kg: lichaamWeightKg,
          gender: input.gender,
          activity_level: input.activity,
          weight_goal: input.weightGoal,
        },
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [
    autoUpdateKcal,
    weightStr,
    heightStr,
    dobStr,
    lichaamWeightKg,
    lichaamHeightCm,
    bodyDraft,
    savedProfile.date_of_birth,
    savedProfile.gender,
    savedProfile.activity_level,
    savedProfile.weight_goal,
  ]);

  /** Chip edits from GoalCalculator → bodyDraft so leave/tap-save cannot drop them. */
  function onCalcMetaChange(meta: {
    gender: Gender;
    activity_level: NonNullable<BodyMetricsDraft['activity_level']>;
    weight_goal: NonNullable<BodyMetricsDraft['weight_goal']>;
  }) {
    const next: BodyMetricsDraft = {
      date_of_birth: isIsoDate(dobStr) ? dobStr : savedProfile.date_of_birth ?? '',
      height_cm: lichaamHeightCm > 0 ? lichaamHeightCm : savedProfile.height_cm ?? 0,
      weight_kg: lichaamWeightKg > 0 ? lichaamWeightKg : savedProfile.weight_kg ?? 0,
      gender: meta.gender,
      activity_level: meta.activity_level,
      weight_goal: meta.weight_goal,
    };
    if (!bodyMetricsDifferFromProfile(next)) {
      setBodyDraft(null);
      return;
    }
    setBodyDraft(next);
  }

  async function selectSection(next: SettingsSection) {
    if (section === 'goals' && next !== 'goals') {
      const ok = await flushGoalsTab();
      if (!ok) return;
    }
    if (section === 'account' && next !== 'account') {
      const ok = await flushAccountTab();
      if (!ok) return;
    }
    setSection(next);
  }

  /** Switch Berekenen / Macro's without flushing mid-edit (leave / tap save persists). */
  function selectGoalsPanel(next: 'calc' | 'macros' | null) {
    setGoalsPanel(next);
  }

  function setAutoUpdatePreference(next: boolean) {
    setAutoUpdateKcal(next);
    void AsyncStorage.setItem(AUTO_UPDATE_KCAL_KEY, next ? '1' : '0');
  }

  /*
   * SECTION: Account draft flush (full name + gender/height/DOB)
   * WHAT: Same tap-save / leave pattern as Doelen (no per-field Opslaan).
   * HOW: Username/email/password keep their own Save (password confirm).
   */
  const flushingAccountRef = useRef(false);
  async function flushAccountTab(opts?: { silent?: boolean }): Promise<boolean> {
    if (flushingAccountRef.current) return true;
    flushingAccountRef.current = true;
    setFlushingAccount(true);
    const silent = opts?.silent === true;
    try {
      if (accountHeightMsg?.severity === 'hard') {
        if (!silent) Alert.alert(t('common.error'), t('goalsCalc.invalid'));
        return false;
      }

      const patch: {
        full_name?: string | null;
        height_cm?: number | null;
        date_of_birth?: string | null;
        gender?: Gender | null;
      } = {};

      if (fullNameDirty) {
        patch.full_name = fullName.trim() || null;
      }
      if (accountBodyDirty) {
        patch.height_cm = accountHeightCm > 0 ? accountHeightCm : null;
        patch.date_of_birth = isIsoDate(accountDobStr) ? accountDobStr : null;
        patch.gender = accountGender;
      }

      if (Object.keys(patch).length === 0) {
        if (fullNameDraft !== null && !fullNameDirty) setFullNameDraft(null);
        if (heightDraft !== null || dobDraft !== null || genderDraft !== null) {
          setHeightDraft(null);
          setDobDraft(null);
          setGenderDraft(null);
          setAccountHeightConfirmed(false);
        }
        return true;
      }

      const { error } = await updateProfile(patch);
      if (error) {
        if (!silent) Alert.alert(t('common.error'), profileSaveErrorMessage(error, t));
        return false;
      }
      setFullNameDraft(null);
      setHeightDraft(null);
      setDobDraft(null);
      setGenderDraft(null);
      setAccountHeightConfirmed(false);
      return true;
    } finally {
      flushingAccountRef.current = false;
      setFlushingAccount(false);
    }
  }

  flushAccountTabRef.current = flushAccountTab;

  async function saveUsername() {
    const clean = sanitizeUsernameInput(username);
    if (!isValidUsername(clean)) {
      Alert.alert(t('common.error'), t('auth.usernameInvalid'));
      return;
    }
    if (clean === profile!.username) {
      setUsernameDraft(null);
      setUsernamePassword('');
      return;
    }
    if (!accountEmail || !usernamePassword) {
      Alert.alert(t('common.error'), t('settings.usernamePasswordRequired'));
      return;
    }

    setSavingUsername(true);
    // Re-auth so a stolen session cannot change username alone (same as email change)
    const reauth = await reauthenticateWithPassword(accountEmail, usernamePassword);
    if (!reauth.ok) {
      setSavingUsername(false);
      Alert.alert(t('common.error'), t('settings.passwordCurrentWrong'));
      return;
    }

    const { error } = await updateProfile({ username: clean });
    setSavingUsername(false);
    if (error) {
      Alert.alert(t('common.error'), usernameSaveError(error, t));
      return;
    }
    setUsernameDraft(null);
    setUsernamePassword('');
    Alert.alert(t('common.done'), t('settings.usernameSaved'));
  }

  async function savePassword() {
    if (newPassword.length < 8) {
      Alert.alert(t('common.error'), t('settings.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('settings.passwordMismatch'));
      return;
    }
    if (!accountEmail) {
      Alert.alert(t('common.error'), t('settings.passwordNoEmail'));
      return;
    }
    if (!currentPassword) {
      Alert.alert(t('common.error'), t('settings.passwordCurrentRequired'));
      return;
    }

    setSavingPassword(true);
    // Step 1: prove current password (Supabase requires a fresh session for sensitive updates)
    const reauth = await reauthenticateWithPassword(accountEmail, currentPassword);
    if (!reauth.ok) {
      setSavingPassword(false);
      Alert.alert(t('common.error'), t('settings.passwordCurrentWrong'));
      return;
    }

    // Step 2: set the new password
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      Alert.alert(t('common.error'), error.message);
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    Alert.alert(t('common.done'), t('settings.passwordSaved'));
  }

  async function saveEmail() {
    const next = normalizeEmail(email);
    if (!isValidEmail(next)) {
      Alert.alert(t('common.error'), t('settings.emailInvalid'));
      return;
    }
    if (next === normalizeEmail(accountEmail)) {
      setEmailDraft(null);
      setEmailPassword('');
      return;
    }
    if (!accountEmail || !emailPassword) {
      Alert.alert(t('common.error'), t('settings.emailPasswordRequired'));
      return;
    }

    setSavingEmail(true);
    // Re-auth so a stolen session cannot change email alone
    const reauth = await reauthenticateWithPassword(accountEmail, emailPassword);
    if (!reauth.ok) {
      setSavingEmail(false);
      Alert.alert(t('common.error'), t('settings.passwordCurrentWrong'));
      return;
    }

    const redirectTo = getEmailChangeRedirectUrl();
    if (__DEV__) {
      console.log('[auth] email change redirectTo:', redirectTo);
    }
    const { error } = await supabase.auth.updateUser(
      { email: next },
      { emailRedirectTo: redirectTo }
    );
    setSavingEmail(false);
    if (error) {
      Alert.alert(t('common.error'), error.message);
      return;
    }
    // Keep showing the current (old) address until the confirm link is opened
    setEmailDraft(null);
    setEmailPassword('');
    Alert.alert(t('settings.emailChangeSentTitle'), t('settings.emailChangeSentBody', { email: next }));
  }

  function toggleAllergen(key: string) {
    const cur = allergensDraft ?? savedProfile.allergens;
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
    setAllergenOptionsExpanded(true);
    setAllergensDraft(next);
  }

  /** Niets: clear + hide EU pills. While Niets is active, use “…” to expand again. */
  function toggleAllergensNone() {
    const { noneActive } = noneChipListState(allergens.length, allergenOptionsExpanded);
    if (noneActive) return;
    setAllergenOptionsExpanded(false);
    // Only draft a clear when something would actually change
    if (allergens.length > 0) setAllergensDraft([]);
  }

  function expandAllergenOptions() {
    setAllergenOptionsExpanded(true);
  }

  async function onDownloadData() {
    setExporting(true);
    const { data, error } = await fetchMyDataExport();
    if (error || !data) {
      setExporting(false);
      Alert.alert(
        t('common.error'),
        error === 'export_empty' || !error
          ? t('settings.exportFailed')
          : error.toLowerCase().includes('export_my_data') || error.toLowerCase().includes('schema cache')
            ? t('settings.exportMigrationHint')
            : error
      );
      return;
    }
    const shareResult = await shareDataExport(data, {
      json: t('settings.exportShareJsonTitle'),
      csv: t('settings.exportShareCsvTitle'),
    });
    setExporting(false);
    if (shareResult.error === 'sharing_unavailable') {
      Alert.alert(t('common.error'), t('settings.exportShareUnavailable'));
      return;
    }
    if (shareResult.error) {
      Alert.alert(t('common.error'), shareResult.error);
      return;
    }
    Alert.alert(t('common.done'), t('settings.exportDone'));
  }

  function confirmDelete() {
    Alert.alert(t('settings.deleteConfirmTitle'), t('settings.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteConfirmContinue'),
        style: 'destructive',
        onPress: () => {
          // Second confirm: irreversible messaging + 30-day grace honesty
          Alert.alert(t('settings.deleteConfirm2Title'), t('settings.deleteConfirm2Body'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('settings.deleteConfirmFinal'),
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase.rpc('delete_account');
                if (error) {
                  Alert.alert(
                    t('common.error'),
                    error.message.toLowerCase().includes('deletion_requested')
                      ? t('settings.deleteMigrationHint')
                      : error.message
                  );
                  return;
                }
                await supabase.auth.signOut();
              },
            },
          ]);
        },
      },
    ]);
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={{ padding: spacing.l, paddingBottom: spacing.xxl }}
    >
      {/*
       * SECTION: Settings header menu
       * WHAT: Switch between Doelen / Preferences / Account / Privacy / About panels.
       * HOW: Same segmented control pattern as Reports day/week switcher.
       */}
      <View style={styles.switcher}>
        {SETTINGS_SECTIONS.map((s) => (
          <Pressable
            key={s}
            style={[styles.switchBtn, section === s && styles.switchActive]}
            onPress={() => selectSection(s)}
          >
            <Text style={[styles.switchText, section === s && styles.switchTextActive]} numberOfLines={1}>
              {t(sectionLabelKey(s))}
            </Text>
          </Pressable>
        ))}
      </View>

      {section === 'account' ? (
        <>
          <View style={styles.goalsSaveTopBar}>
            {accountDraftDirty || flushingAccount ? (
              <SettingsSavePendingButton
                busy={flushingAccount}
                label={t('settings.goalsTapToSave')}
                onPress={() => {
                  void flushAccountTab();
                }}
              />
            ) : (
              <SettingsSavedLabel label={t('settings.goalsSaved')} />
            )}
          </View>
          <SectionTitle>{t('settings.profile')}</SectionTitle>
          {/*
           * SECTION: Account identity + body (one continuous layout)
           * WHAT: Username → name → email → password → gender/height/DOB/age → sign out.
           * HOW: Name + body drafts → tap-save / leave (same as Doelen). Username/email need password.
           */}
          <Field
            label={t('settings.username')}
            value={username}
            onChangeText={(v) => setUsernameDraft(sanitizeUsernameInput(v))}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
          />
          <Text style={styles.hint}>{t('auth.usernameHint')}</Text>
          {usernameDirty ? (
            <>
              <PasswordField
                label={t('settings.currentPassword')}
                value={usernamePassword}
                onChangeText={setUsernamePassword}
                autoComplete="password"
                textContentType="password"
              />
              <Button
                title={t('common.save')}
                onPress={saveUsername}
                loading={savingUsername}
                disabled={!usernamePassword}
              />
            </>
          ) : null}

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

          <Field
            label={t('settings.email')}
            value={email}
            onChangeText={setEmailDraft}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder={accountEmail ? undefined : t('settings.emailUnknown')}
          />
          {emailDirty ? (
            <>
              <Text style={styles.disclaimer}>{t('settings.changeEmailHint')}</Text>
              <PasswordField
                label={t('settings.currentPassword')}
                value={emailPassword}
                onChangeText={setEmailPassword}
                autoComplete="password"
                textContentType="password"
              />
              <Button
                title={t('settings.saveEmail')}
                onPress={saveEmail}
                loading={savingEmail}
                disabled={!emailPassword}
              />
            </>
          ) : null}

          <View style={styles.disclosureWrap}>
            <Text style={styles.disclosureToggle} onPress={() => setPasswordOpen((v) => !v)}>
              {passwordOpen ? t('settings.hideChangePassword') : t('settings.changePassword')}
            </Text>
            {passwordOpen ? (
              <View style={styles.disclosureBox}>
                <PasswordField
                  label={t('settings.currentPassword')}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  autoComplete="password"
                  textContentType="password"
                />
                <PasswordField
                  label={t('settings.newPassword')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoComplete="password-new"
                  textContentType="newPassword"
                />
                <Text style={styles.hint}>{t('auth.passwordHint')}</Text>
                <PasswordField
                  label={t('settings.confirmNewPassword')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoComplete="password-new"
                  textContentType="newPassword"
                />
                <Button
                  title={t('settings.savePassword')}
                  onPress={savePassword}
                  loading={savingPassword}
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                />
              </View>
            ) : null}
          </View>

          <Text style={styles.prefLabel}>{t('goalsCalc.gender')}</Text>
          <View style={styles.row}>
            {GENDERS.map((g) => (
              <Chip
                key={g}
                label={t(`goalsCalc.gender_${g}`)}
                active={accountGender === g}
                onPress={() => setGenderDraft(g)}
              />
            ))}
          </View>
          <Field
            label={t('goalsCalc.height')}
            value={accountHeightStr}
            onChangeText={(v) => {
              setAccountHeightConfirmed(false);
              setHeightDraft(v);
            }}
            onBlur={() => setAccountHeightConfirmed(true)}
            keyboardType="decimal-pad"
          />
          {/* Soft height always when unusual; hard only after blur (same honesty as Doelen). */}
          {accountHeightMsg?.severity === 'soft' ||
          (accountHeightConfirmed && accountHeightMsg?.severity === 'hard') ? (
            <Text
              style={
                accountHeightMsg.severity === 'hard' ? styles.fieldHard : styles.fieldSoft
              }
            >
              {t(accountHeightMsg.key)}
            </Text>
          ) : null}
          <NativeDatePicker
            label={t('goalsCalc.dateOfBirth')}
            value={isIsoDate(accountDobStr) ? accountDobStr : DOB_PICKER_FALLBACK_ISO}
            onChange={(iso) => setDobDraft(iso)}
            dateFormat={dateFormat}
            maximumDate={accountDobMaximumDate}
            minimumDate={accountDobMinimumDate}
          />
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyLabel}>{t('goalsCalc.age')}</Text>
            <Text style={styles.readOnlyValue}>
              {accountAgeYears != null && accountAgeYears >= 0 ? String(accountAgeYears) : ''}
            </Text>
          </View>
          {accountAgeMsg ? (
            <Text style={accountAgeMsg.severity === 'hard' ? styles.fieldHard : styles.fieldSoft}>
              {t(accountAgeMsg.key)}
            </Text>
          ) : null}

          <View style={{ height: spacing.xl }} />
          <Button title={t('settings.signOut')} variant="secondary" onPress={() => supabase.auth.signOut()} />
        </>
      ) : null}

      {section === 'preferences' ? (
        <>
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
          <Text style={styles.prefLabel}>{t('settings.dateFormat')}</Text>
          <View style={styles.row}>
            {DATE_FORMATS.map((fmt) => (
              <Chip
                key={fmt}
                label={fmt}
                active={dateFormat === fmt}
                onPress={async () => {
                  const { error } = await updateProfile({ date_format: fmt });
                  if (error) Alert.alert(t('common.error'), profileSaveErrorMessage(error, t));
                }}
              />
            ))}
          </View>
        </>
      ) : null}

      {section === 'goals' ? (
        <>
          {/*
           * SECTION: Mijn behoefte (weight + kcal + Berekenen/Macro's)
           * WHAT: Save status (below menu) then weight, shared kcal, auto-update, chips + panels.
           * HOW: Gender/height/DOB on Account. Tap save status or leave to flush (including Bereken drafts).
           */}
          <View style={styles.goalsSaveTopBar}>
            {settingsGoalsDirty || goalsIncomplete || flushingGoals ? (
              <SettingsSavePendingButton
                busy={flushingGoals}
                label={t('settings.goalsTapToSave')}
                onPress={() => {
                  void flushGoalsTab();
                }}
              />
            ) : (
              <SettingsSavedLabel label={t('settings.goalsSaved')} />
            )}
          </View>
          <View
            collapsable={false}
            onLayout={(e) => {
              needsSectionOffsetY.current = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.goalsSectionTitle}>{t('settings.goals')}</Text>
            <Text style={styles.goalsHint}>{t('settings.goalsHint')}</Text>
            {goalsIncomplete ? (
              <Text style={styles.goalsIncompleteHint}>{t('goalsCalc.goalsIncomplete')}</Text>
            ) : null}
          </View>

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
          {needsAccountBody ? (
            <Text
              style={styles.bodyMetricsReminder}
              onPress={() => selectSection('account')}
              accessibilityRole="link"
            >
              {t('settings.bodyMetricsReminder')}
            </Text>
          ) : null}
          <Pressable
            style={styles.autoUpdateRow}
            onPress={() => setAutoUpdatePreference(!autoUpdateKcal)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: autoUpdateKcal }}
          >
            <View style={[styles.autoUpdateBox, autoUpdateKcal && styles.autoUpdateBoxOn]}>
              {autoUpdateKcal ? <Text style={styles.autoUpdateTick}>✓</Text> : null}
            </View>
            <Text style={styles.autoUpdateLabel}>{t('settings.autoUpdateKcal')}</Text>
          </Pressable>
          {autoUpdateKcal && needsAccountBody ? (
            <Text
              style={styles.autoUpdateNeedsBody}
              onPress={() => selectSection('account')}
              accessibilityRole="link"
            >
              {t('goalsCalc.autoUpdateNeedsBody')}
            </Text>
          ) : null}

          <View style={styles.goalModeRow}>
            <Chip
              label={t('settings.goalsModeSimple')}
              active={goalsPanel === 'calc'}
              onPress={() => selectGoalsPanel(goalsPanel === 'calc' ? null : 'calc')}
            />
            <Chip
              label={t('settings.goalsModeAdvanced')}
              active={goalsPanel === 'macros'}
              onPress={() => selectGoalsPanel(goalsPanel === 'macros' ? null : 'macros')}
            />
          </View>

          {goalsPanel === 'calc' ? (
            <GoalCalculator
              profile={profile}
              weightText={weightStr}
              heightText={heightStr}
              onWeightTextChange={setWeightDraft}
              dobText={dobStr}
              hideWeightField
              hideHeightAndDob
              macroPercents={disclaimerMacroPercents}
              showToggle={false}
              open
              hideResultKcal
              autoUpdate={autoUpdateKcal}
              onCalcMetaChange={onCalcMetaChange}
              onCalculated={({ goals: calcGoals, body }) => {
                // Draft only: same tap-save / leave flush as weight, macros, allergens
                const styled = goalsFromKcalKeepingSplit(calcGoals.kcal, goalsRef.current);
                setGoalDraft(styled);
                setBodyDraft(body);
                if (body.weight_kg > 0) setWeightDraft(formatLocaleMetric(body.weight_kg));
                scrollToNeedsSection();
              }}
            />
          ) : null}
          {goalsPanel === 'macros' ? (
            <GoalMacroEditor
              ref={macroEditorRef}
              value={goals}
              onChange={onGoalsChange}
              weightKg={lichaamWeightKg > 0 ? lichaamWeightKg : 0}
              hideKcalField
            />
          ) : null}
          <Text style={styles.goalsSectionTitle}>{t('settings.myAllergens')}</Text>
          <Text style={styles.goalsHint}>{t('settings.myAllergensHint')}</Text>
          {/*
           * SECTION: Allergen chips (Niets collapse)
           * WHAT: Niets clears + hides EU-14; “…” expands again. Draft until tap-save / leave.
           * HOW: allergensDraft → flushGoalsTab; noneChipListState(selected, expanded)
           * Halal/vegan later: separate “I eat …” toggles on this row, not a second Niets.
           */}
          <View style={styles.row}>
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
                    active={allergens.includes(key)}
                    onPress={() => toggleAllergen(key)}
                  />
                ))
              : null}
          </View>
          <Text style={styles.disclaimer}>{t('allergens.disclaimer')}</Text>
        </>
      ) : null}

      {section === 'privacy' ? (
        <>
          {/*
           * SECTION: Privacy (GDPR)
           * WHAT: Download my data (JSON + diary CSV) and soft-delete with 30-day grace.
           * HOW: export_my_data RPC + share sheet; delete_account RPC → ban + signOut
           */}
          <SectionTitle>{t('settings.privacy')}</SectionTitle>
          <Text style={styles.disclaimer}>{t('settings.privacyHint')}</Text>
          <View style={{ height: spacing.s }} />
          <Button
            title={t('settings.downloadData')}
            variant="secondary"
            onPress={onDownloadData}
            loading={exporting}
          />
          <View style={{ height: spacing.s }} />
          <Button title={t('settings.deleteAccount')} variant="danger" onPress={confirmDelete} />
        </>
      ) : null}

      {section === 'about' ? (
        <>
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
            {__DEV__ ? (
              <>
                <View style={{ height: spacing.m }} />
                <Button
                  title={t('settings.sentryTest')}
                  variant="secondary"
                  onPress={() => {
                    if (!isSentryEnabled) {
                      Alert.alert(t('common.error'), t('settings.sentryTestDisabled'));
                      return;
                    }
                    captureException(new Error('Macrio Sentry smoke test'));
                    Alert.alert(t('common.done'), t('settings.sentryTestSent'));
                  }}
                />
              </>
            ) : null}
          </Card>

          <SectionTitle>{t('feedback.title')}</SectionTitle>
          <Button title={t('settings.feedback')} variant="secondary" onPress={() => router.push('/feedback')} />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  goalsSaveTopBar: {
    minHeight: 22,
    marginBottom: spacing.s,
    marginTop: spacing.xs,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing.m,
  },
  switchBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.s, alignItems: 'center' },
  switchActive: { backgroundColor: colors.primarySoft },
  switchText: { color: colors.muted, fontWeight: '600', fontSize: 11 },
  switchTextActive: { color: colors.primaryDark, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  prefLabel: { fontSize: 13, color: colors.muted, fontWeight: '600', marginBottom: spacing.s, marginTop: spacing.s },
  goalsSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.s,
    marginBottom: spacing.xs,
  },
  goalsSaveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 22,
  },
  goalsSaveIconSlot: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalsSavePulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.muted,
    backgroundColor: colors.border,
  },
  goalsSaveDoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryDark,
  },
  goalsSavePendingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textAlign: 'left',
  },
  goalsSaveStatusOk: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    textAlign: 'left',
  },
  goalsIncompleteHint: {
    fontSize: 13,
    color: colors.danger,
    lineHeight: 18,
    marginBottom: spacing.s,
  },
  bodyMetricsReminder: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: -spacing.s,
    marginBottom: spacing.m,
  },
  // Age derived from DOB: plain text, not a fake disabled input
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
  goalsHint: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.s,
    lineHeight: 18,
  },
  autoUpdateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginTop: -spacing.xs,
    marginBottom: spacing.m,
  },
  autoUpdateBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoUpdateBoxOn: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primarySoft,
  },
  autoUpdateTick: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 16,
  },
  autoUpdateLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  autoUpdateNeedsBody: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginTop: -spacing.s,
    marginBottom: spacing.m,
  },
  goalModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.s,
  },
  // Same short min-length hint as register password / username fields
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: -spacing.s,
    marginBottom: spacing.m,
    lineHeight: 16,
  },
  disclaimer: { fontSize: 12, color: colors.faint, lineHeight: 17, marginTop: spacing.xs, marginBottom: spacing.s },
  // Same disclosure look as GoalCalculator (toggle text + bordered card when open)
  disclosureWrap: { marginBottom: spacing.l },
  disclosureToggle: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: spacing.s,
  },
  disclosureBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  aboutText: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  aboutMeta: { fontSize: 12, color: colors.faint, marginTop: spacing.s },
});
