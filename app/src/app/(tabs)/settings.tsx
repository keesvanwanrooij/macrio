/*
 * SECTION: Settings
 * WHAT: Profile identity, preferences, allergens, goals, privacy (export/delete), about, sign out.
 * HOW: Header section switcher (like Reports day/week) → only one panel visible.
 *      Local drafts for identity/goals → updateProfile / Auth updateUser / RPCs for GDPR.
 * INPUT: session profile + auth user email
 * OUTPUT: persisted profile/auth changes; export share sheet; soft-delete then signOut
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ActivityIndicator, Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card, Chip, Field, Loading, PasswordField, SectionTitle } from '../../components/ui';
import { GoalCalculator } from '../../components/GoalCalculator';
import { GoalMacroEditor, type GoalMacroEditorHandle } from '../../components/GoalMacroEditor';
import { EU_ALLERGENS, noneChipListState } from '../../lib/allergens';
import { APP_VERSION } from '../../lib/appMeta';
import { getEmailChangeRedirectUrl } from '../../lib/authDeepLink';
import {
  isValidEmail,
  normalizeEmail,
  reauthenticateWithPassword,
  usernameErrorI18nKey,
} from '../../lib/auth';
import { DATE_FORMATS, isIsoDate, resolveDateFormat } from '../../lib/dates';
import { fetchMyDataExport, shareDataExport } from '../../lib/dataExport';
import type { BodyMetricsDraft, GoalFields } from '../../lib/goalCalculator';
import {
  NULL_GOAL_NUMBERS,
  ageFromDateOfBirth,
  calculateDailyGoals,
  goalNumbersFromFields,
  goalsFieldsAllEmpty,
  goalsFieldsComplete,
  goalsFieldsDirty,
  goalFieldsFromKcalInput,
  goalsFromKcalKeepingSplit,
  goalsFromPercents,
  weightFieldMessage,
  isActivityLevel,
  isGender,
  isWeightGoal,
} from '../../lib/goalCalculator';
import { upsertTodayGoalRevision } from '../../lib/goalRevisions';
import { parseNum } from '../../lib/nutrition';
import { captureException, isSentryEnabled } from '../../lib/sentry';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../lib/theme';
import { isValidUsername, sanitizeUsernameInput } from '../../lib/username';

const SPONSOR_URL = 'https://github.com/sponsors/keesvanwanrooij';
/** Seconds until silent goals autosave while drafts are dirty. */
const GOALS_AUTOSAVE_SEC = 10;

type SettingsSection = 'preferences' | 'goals' | 'account' | 'privacy' | 'about';

const SETTINGS_SECTIONS: SettingsSection[] = ['goals', 'preferences', 'account', 'privacy', 'about'];

/*
 * SECTION: Goals save affordance (always visible)
 * WHAT: Fixed slot: either green “Opgeslagen” or grey “Opslaan in Ns” (tap to save).
 * HOW: Same row height / icon slot so switching states does not shift the form.
 * INPUT: busy, label, onPress (pending only)
 * OUTPUT: Pressable or static status row
 */
function GoalsSavePendingButton({
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

function GoalsSavedLabel({ label }: { label: string }) {
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
  if (m.includes('date_of_birth') || m.includes('height_cm') || m.includes('weight_kg') || m.includes('weight_goal') || m.includes('goal_macro_mode') || m.includes('schema cache')) {
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
  /** Bumped on body calculator so GoalMacroEditor snaps bars to 50/20/30. */
  const [macroPercentResetKey, setMacroPercentResetKey] = useState(0);
  const [weightDraft, setWeightDraft] = useState<string | null>(null);
  const [heightDraft, setHeightDraft] = useState<string | null>(null);
  const [dobDraft, setDobDraft] = useState<string | null>(null);
  /** Accordion: calculator | macros | neither. Open calc by default when no goals yet. */
  const [goalsPanel, setGoalsPanel] = useState<'calc' | 'macros' | null>(
    profile?.goal_kcal != null && profile.goal_kcal > 0 ? null : 'calc'
  );
  /** When on, Mifflin recalculates kcal as body / calculator inputs change (keeps macro %). Default off (opt-in; same as onboarding). */
  const [autoUpdateKcal, setAutoUpdateKcal] = useState(false);
  /** When false and allergens empty, only “Niets” shows (collapse pattern). */
  const [allergenOptionsExpanded, setAllergenOptionsExpanded] = useState(
    () => (profile?.allergens.length ?? 0) > 0
  );
  const scrollRef = useRef<ScrollView>(null);
  const needsSectionOffsetY = useRef(0);
  const macroEditorRef = useRef<GoalMacroEditorHandle>(null);
  /** Guards overlapping flushes (panel switch + 10s interval + leave). */
  const flushingRef = useRef(false);
  const flushGoalsTabRef = useRef<(opts?: { silent?: boolean }) => Promise<boolean>>(async () => true);
  const settingsGoalsDirtyRef = useRef(false);
  const goalsRef = useRef<GoalFields>({ kcal: '', protein: '', carbs: '', fat: '' });
  const bodyDraftRef = useRef<BodyMetricsDraft | null>(null);
  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null);
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [usernamePassword, setUsernamePassword] = useState('');
  const [savingBody, setSavingBody] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  /** True while flushGoalsTab is in flight (spinner in save slot). */
  const [flushingGoals, setFlushingGoals] = useState(false);
  /** 10→1 nudge while dirty; tap (or leave tab) saves - no silent flush at 0. */
  const [saveCountdown, setSaveCountdown] = useState<number | null>(null);
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
   * SECTION: Doelen save (Settings only)
   * WHAT: Persist dirty drafts on leave / panel switch / tap “Opslaan in Ns”.
   * HOW: Leave cleanup flush; countdown is a nudge only (does not auto-flush at 0).
   * WHY: User stays in control while the leading save message counts down.
   */
  useFocusEffect(
    useCallback(() => {
      return () => {
        void flushGoalsTabRef.current({ silent: true });
      };
    }, [])
  );

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

  const weightStr =
    weightDraft ??
    (savedProfile.weight_kg != null && savedProfile.weight_kg > 0 ? String(savedProfile.weight_kg) : '');
  const heightStr =
    heightDraft ??
    (savedProfile.height_cm != null && savedProfile.height_cm > 0 ? String(savedProfile.height_cm) : '');
  const dobStr = dobDraft ?? savedProfile.date_of_birth ?? '';
  const lichaamWeightKg = parseNum(weightStr);
  const lichaamHeightCm = parseNum(heightStr);
  const allergenNoneUi = noneChipListState(savedProfile.allergens.length, allergenOptionsExpanded);

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
   * Auto Mifflin result: update kcal, keep current macro split, stash calc meta for flush.
   * No scroll / no immediate save (10s / leave autosave handles DB).
   */
  function applyAutoCalculated(payload: { goals: { kcal: number }; body: BodyMetricsDraft }) {
    const next = goalsFromKcalKeepingSplit(payload.goals.kcal, goalsRef.current);
    const cur = goalsRef.current;
    // Skip no-op drafts so autosave / effects do not thrash
    if (
      next.kcal === cur.kcal &&
      next.protein === cur.protein &&
      next.carbs === cur.carbs &&
      next.fat === cur.fat
    ) {
      const prev = bodyDraftRef.current;
      if (
        prev &&
        prev.date_of_birth === payload.body.date_of_birth &&
        prev.gender === payload.body.gender &&
        prev.activity_level === payload.body.activity_level &&
        prev.weight_goal === payload.body.weight_goal &&
        prev.weight_kg === payload.body.weight_kg &&
        prev.height_cm === payload.body.height_cm
      ) {
        return;
      }
    }
    setBodyDraft(payload.body);
    setGoalDraft(next);
  }

  /**
   * Shared Calorieën box: always keep the current macro %.
   * Only “Macro's resetten” / Bereken doelen snaps back to 50/20/30.
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

  /**
   * Persist body + goal drafts (leave Doelen, panel switch, 10s interval on Settings).
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
        height_cm: number | null;
        date_of_birth: string | null;
      }> = {};
      if (weightDraft !== null) {
        const next = lichaamWeightKg > 0 ? lichaamWeightKg : null;
        if (!sameBodyMetric(next, savedProfile.weight_kg)) bodyPatch.weight_kg = next;
      }
      if (heightDraft !== null) {
        const next = lichaamHeightCm > 0 ? lichaamHeightCm : null;
        if (!sameBodyMetric(next, savedProfile.height_cm)) bodyPatch.height_cm = next;
      }
      if (dobDraft !== null) {
        const next = isIsoDate(dobDraft) ? dobDraft : null;
        if (next !== (savedProfile.date_of_birth ?? null)) bodyPatch.date_of_birth = next;
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
            // DOB lives with body fields; do not let calculator meta overwrite a body draft
            gender: bodyDraft.gender,
            activity_level: bodyDraft.activity_level,
            weight_goal: bodyDraft.weight_goal,
          }
        : null;

      // Only include calc meta fields that differ from the saved profile
      const calcMetaPatch: Partial<{
        gender: typeof savedProfile.gender;
        activity_level: typeof savedProfile.activity_level;
        weight_goal: typeof savedProfile.weight_goal;
      }> = {};
      if (calcMeta) {
        if (calcMeta.gender !== (savedProfile.gender ?? null)) calcMetaPatch.gender = calcMeta.gender;
        if (calcMeta.activity_level !== (savedProfile.activity_level ?? null)) {
          calcMetaPatch.activity_level = calcMeta.activity_level;
        }
        if (calcMeta.weight_goal !== (savedProfile.weight_goal ?? null)) {
          calcMetaPatch.weight_goal = calcMeta.weight_goal;
        }
      }

      const patch = {
        ...bodyPatch,
        ...(goalPatch ?? {}),
        ...calcMetaPatch,
      };

      const hasDbWrite = Object.keys(patch).length > 0;
      if (!hasDbWrite) {
        // Clear local drafts that matched profile (no network)
        if (goalDraft && !goalsDirty && !goalsBlockedIncomplete) setGoalDraft(null);
        if (weightDraft !== null) setWeightDraft(null);
        if (heightDraft !== null) setHeightDraft(null);
        if (dobDraft !== null) setDobDraft(null);
        if (bodyDraft) setBodyDraft(null);
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
      if (heightDraft !== null) setHeightDraft(null);
      if (dobDraft !== null) setDobDraft(null);
      setBodyDraft(null);
      return true;
    } finally {
      flushingRef.current = false;
      setFlushingGoals(false);
    }
  }

  flushGoalsTabRef.current = flushGoalsTab;

  const settingsGoalsDirty =
    goalsDirty ||
    weightDraft !== null ||
    heightDraft !== null ||
    dobDraft !== null ||
    bodyDraft != null;
  settingsGoalsDirtyRef.current = settingsGoalsDirty;

  /** Partial goal draft (e.g. empty protein while typing) - show inline, not only on leave Alert. */
  const goalsIncomplete =
    goalDraft != null && !goalsFieldsAllEmpty(goalDraft) && !goalsFieldsComplete(goalDraft);

  // Reset 10→1 countdown whenever drafts change; pause while a flush is running.
  // Counts to 0 as a nudge only - does not call flush (tap or leave does).
  const goalsDirtyFingerprint = [
    goalDraft?.kcal ?? '',
    goalDraft?.protein ?? '',
    goalDraft?.carbs ?? '',
    goalDraft?.fat ?? '',
    weightDraft ?? '',
    heightDraft ?? '',
    dobDraft ?? '',
    bodyDraft?.date_of_birth ?? '',
    bodyDraft?.gender ?? '',
    bodyDraft?.activity_level ?? '',
    bodyDraft?.weight_goal ?? '',
    bodyDraft?.weight_kg ?? '',
    bodyDraft?.height_cm ?? '',
    goalsIncomplete ? '1' : '0',
  ].join('|');

  useEffect(() => {
    if (flushingGoals) return;
    if (!(settingsGoalsDirty || goalsIncomplete)) {
      setSaveCountdown(null);
      return;
    }
    setSaveCountdown(GOALS_AUTOSAVE_SEC);
    const id = setInterval(() => {
      setSaveCountdown((c) => {
        if (c == null || c <= 1) return 0;
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [settingsGoalsDirty, goalsIncomplete, goalsDirtyFingerprint, flushingGoals]);

  /*
   * When Berekenen is closed, still auto-recalc from Mijn lichaam + saved/calc meta.
   * (Open Berekenen panel: GoalCalculator owns the debounced auto path.)
   */
  useEffect(() => {
    if (!autoUpdateKcal || goalsPanel === 'calc') return;
    const timer = setTimeout(() => {
      const draft = bodyDraftRef.current;
      const dateOfBirth = isIsoDate(dobStr)
        ? dobStr
        : draft?.date_of_birth ?? savedProfile.date_of_birth;
      if (!isIsoDate(dateOfBirth)) return;
      const ageYears = ageFromDateOfBirth(dateOfBirth);
      if (ageYears == null || !(ageYears > 0)) return;
      if (!(lichaamWeightKg > 0) || !(lichaamHeightCm > 0)) return;

      const genderRaw = draft?.gender ?? savedProfile.gender;
      const activityRaw = draft?.activity_level ?? savedProfile.activity_level;
      const weightGoalRaw = draft?.weight_goal ?? savedProfile.weight_goal;
      if (!isGender(genderRaw) || !isActivityLevel(activityRaw) || !isWeightGoal(weightGoalRaw)) return;

      const result = calculateDailyGoals({
        weightKg: lichaamWeightKg,
        heightCm: lichaamHeightCm,
        ageYears,
        gender: genderRaw,
        activity: activityRaw,
        weightGoal: weightGoalRaw,
      });
      if (!result) return;
      applyAutoCalculated({
        goals: result,
        body: {
          date_of_birth: dateOfBirth,
          height_cm: lichaamHeightCm,
          weight_kg: lichaamWeightKg,
          gender: genderRaw,
          activity_level: activityRaw,
          weight_goal: weightGoalRaw,
        },
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [
    autoUpdateKcal,
    goalsPanel,
    weightStr,
    heightStr,
    dobStr,
    lichaamWeightKg,
    lichaamHeightCm,
    savedProfile.date_of_birth,
    savedProfile.gender,
    savedProfile.activity_level,
    savedProfile.weight_goal,
  ]);

  async function selectSection(next: SettingsSection) {
    if (section === 'goals' && next !== 'goals') {
      const ok = await flushGoalsTab();
      if (!ok) return;
    }
    setSection(next);
  }

  /** Switch Berekenen / Macro's; flush dirty drafts first so nothing is lost. */
  async function selectGoalsPanel(next: 'calc' | 'macros' | null) {
    if (settingsGoalsDirty) {
      const ok = await flushGoalsTab();
      if (!ok) return;
    }
    setGoalsPanel(next);
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
    const cur = profile!.allergens;
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
    setAllergenOptionsExpanded(true);
    updateProfile({ allergens: next });
  }

  /** Niets: clear + hide EU pills. While Niets is active, use “…” to expand again. */
  function toggleAllergensNone() {
    const { noneActive } = noneChipListState(profile!.allergens.length, allergenOptionsExpanded);
    if (noneActive) return;
    setAllergenOptionsExpanded(false);
    if (profile!.allergens.length > 0) {
      updateProfile({ allergens: [] });
    }
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
       * WHAT: Switch between Account / Preferences / Privacy / About panels.
       * HOW: Same segmented control pattern as Reports day/week switcher.
       * INPUT: local `section` state
       * OUTPUT: only the matching panel renders below
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
          <SectionTitle>{t('settings.profile')}</SectionTitle>
          {/*
           * SECTION: Username (inline draft + password confirm when dirty)
           * WHAT: Edit username in-place; re-auth before profiles update.
           * HOW: When dirty → ask current password → signInWithPassword → updateProfile
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
          {fullNameDirty && <Button title={t('common.save')} onPress={saveFullName} />}

          {/*
           * SECTION: Email (inline like username / full name)
           * WHAT: Edit email in-place; confirm-to-new-address via Supabase deep link.
           * HOW: When dirty → ask current password → updateUser({ email }, { emailRedirectTo })
           */}
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

          {/*
           * SECTION: Change password (collapsible, same pattern as GoalCalculator)
           * WHAT: Signed-in password update with current-password challenge.
           * HOW: tap toggle → fields in card; signInWithPassword → updateUser({ password })
           * INPUT: current + new + confirm password
           * OUTPUT: auth password updated, or Alert on validation / re-auth failure
           */}
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
           * WHAT: One section: weight, shared kcal, auto-update, then mode chips + panels.
           * HOW: Height/DOB live inside Berekenen. Save via leading “Opslaan in Ns” tap / leave.
           */}
          <View
            collapsable={false}
            onLayout={(e) => {
              needsSectionOffsetY.current = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.goalsSectionTitle}>{t('settings.goals')}</Text>
            {/* Fixed slot: always Opgeslagen or Opslaan in Xs (no layout jump while saving) */}
            <View style={styles.goalsSaveSlot}>
              {settingsGoalsDirty || goalsIncomplete || flushingGoals ? (
                <GoalsSavePendingButton
                  busy={flushingGoals}
                  label={t('settings.goalsSaveInSeconds', {
                    seconds:
                      saveCountdown != null && saveCountdown > 0
                        ? saveCountdown
                        : GOALS_AUTOSAVE_SEC,
                  })}
                  onPress={() => {
                    void flushGoalsTab();
                  }}
                />
              ) : (
                <GoalsSavedLabel label={t('settings.goalsSaved')} />
              )}
            </View>
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
          <Pressable
            style={styles.autoUpdateRow}
            onPress={() => setAutoUpdateKcal((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: autoUpdateKcal }}
          >
            <View style={[styles.autoUpdateBox, autoUpdateKcal && styles.autoUpdateBoxOn]}>
              {autoUpdateKcal ? <Text style={styles.autoUpdateTick}>✓</Text> : null}
            </View>
            <Text style={styles.autoUpdateLabel}>{t('settings.autoUpdateKcal')}</Text>
          </Pressable>
          {autoUpdateKcal &&
          (!(lichaamHeightCm > 0) || !isIsoDate(dobStr)) ? (
            <Text style={styles.autoUpdateNeedsBody}>{t('goalsCalc.autoUpdateNeedsBody')}</Text>
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
              onHeightTextChange={setHeightDraft}
              dobText={dobStr}
              onDobTextChange={setDobDraft}
              hideWeightField
              showToggle={false}
              open
              hideResultKcal
              autoUpdate={autoUpdateKcal}
              onAutoCalculated={applyAutoCalculated}
              onCalculated={async ({ goals: calcGoals, body }) => {
                setSavingBody(true);
                const styled = goalsFromPercents(calcGoals.kcal);
                setGoalDraft(styled);
                setBodyDraft(body);
                setMacroPercentResetKey((k) => k + 1);
                const goalPatch = goalNumbersFromFields(styled);
                // Weight lives above; calculator updates goals + height/DOB/gender/activity/goal
                const patch = {
                  ...goalPatch,
                  date_of_birth: body.date_of_birth,
                  gender: body.gender,
                  activity_level: body.activity_level,
                  weight_goal: body.weight_goal,
                };
                const { error } = await updateProfile(patch);
                setSavingBody(false);
                if (error) {
                  Alert.alert(t('common.error'), profileSaveErrorMessage(error, t));
                  return;
                }
                await upsertTodayGoalRevision(goalPatch);
                setGoalDraft(null);
                setBodyDraft(null);
                setDobDraft(null);
                scrollToNeedsSection();
              }}
            />
          ) : null}
          {savingBody ? <Text style={styles.disclaimer}>{t('common.loading')}</Text> : null}
          {goalsPanel === 'macros' ? (
            <GoalMacroEditor
              ref={macroEditorRef}
              key={`macro-editor-${macroPercentResetKey}`}
              value={goals}
              onChange={onGoalsChange}
              weightKg={lichaamWeightKg > 0 ? lichaamWeightKg : 0}
              percentResetKey={macroPercentResetKey}
              hideKcalField
            />
          ) : null}
          <Text style={styles.goalsSectionTitle}>{t('settings.myAllergens')}</Text>
          <Text style={styles.goalsHint}>{t('settings.myAllergensHint')}</Text>
          {/*
           * SECTION: Allergen chips (Niets collapse)
           * WHAT: Niets clears + hides EU-14; “…” next to Niets expands the row again.
           * HOW: noneChipListState(selected, expanded)
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
                    active={profile.allergens.includes(key)}
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
  goalsSaveSlot: {
    minHeight: 22,
    marginBottom: spacing.s,
    justifyContent: 'center',
    alignSelf: 'flex-start',
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
