/*
 * SECTION: Settings
 * WHAT: Profile identity, preferences, allergens, goals, privacy (export/delete), about, sign out.
 * HOW: Header section switcher (like Reports day/week) → only one panel visible.
 *      Local drafts for identity/goals → updateProfile / Auth updateUser / RPCs for GDPR.
 * INPUT: session profile + auth user email
 * OUTPUT: persisted profile/auth changes; export share sheet; soft-delete then signOut
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card, Chip, Field, Loading, PasswordField, SectionTitle } from '../../components/ui';
import { GoalCalculator } from '../../components/GoalCalculator';
import { GoalMacroEditor } from '../../components/GoalMacroEditor';
import { EU_ALLERGENS } from '../../lib/allergens';
import { APP_VERSION } from '../../lib/appMeta';
import { getEmailChangeRedirectUrl } from '../../lib/authDeepLink';
import {
  isValidEmail,
  normalizeEmail,
  reauthenticateWithPassword,
  usernameErrorI18nKey,
} from '../../lib/auth';
import { DATE_FORMATS, resolveDateFormat } from '../../lib/dates';
import { fetchMyDataExport, shareDataExport } from '../../lib/dataExport';
import type { BodyMetricsDraft, GoalFields } from '../../lib/goalCalculator';
import { goalsFieldsAllEmpty, goalsFieldsComplete, goalsFromPercents } from '../../lib/goalCalculator';
import { upsertTodayGoalRevision } from '../../lib/goalRevisions';
import { parseNum } from '../../lib/nutrition';
import { captureException, isSentryEnabled } from '../../lib/sentry';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../lib/theme';
import { isValidUsername, sanitizeUsernameInput } from '../../lib/username';

const SPONSOR_URL = 'https://github.com/sponsors/keesvanwanrooij';

type SettingsSection = 'account' | 'preferences' | 'privacy' | 'about';

const SETTINGS_SECTIONS: SettingsSection[] = ['preferences', 'account', 'privacy', 'about'];

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
  const [section, setSection] = useState<SettingsSection>('preferences');
  const [goalDraft, setGoalDraft] = useState<GoalFields | null>(null);
  const [bodyDraft, setBodyDraft] = useState<BodyMetricsDraft | null>(null);
  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null);
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [usernamePassword, setUsernamePassword] = useState('');
  const [savingBody, setSavingBody] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

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

  if (!profile) return <Loading />;

  const savedFullName = profile.full_name ?? '';
  const fullName = fullNameDraft ?? savedFullName;
  const fullNameDirty = fullNameDraft !== null && fullName.trim() !== savedFullName;

  const username = usernameDraft ?? profile.username;
  const usernameDirty =
    usernameDraft !== null && sanitizeUsernameInput(username) !== profile.username;

  const dateFormat = resolveDateFormat(profile.date_format);
  const accountEmail = session?.user?.email ?? '';
  const email = emailDraft ?? accountEmail;
  const emailDirty =
    emailDraft !== null && normalizeEmail(email) !== normalizeEmail(accountEmail);

  const goals: GoalFields = goalDraft ?? {
    kcal: profile.goal_kcal ? String(profile.goal_kcal) : '',
    carbs: profile.goal_carbs ? String(profile.goal_carbs) : '',
    protein: profile.goal_protein ? String(profile.goal_protein) : '',
    fat: profile.goal_fat ? String(profile.goal_fat) : '',
  };

  function onGoalsChange(next: GoalFields) {
    setGoalDraft(next);
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

  async function saveGoals() {
    // All empty = clear goals to null. Partial = block. Complete = save.
    if (!goalsFieldsAllEmpty(goals) && !goalsFieldsComplete(goals)) {
      Alert.alert(t('common.error'), t('goalsCalc.goalsIncomplete'));
      return;
    }
    const clearing = goalsFieldsAllEmpty(goals);
    const patch = {
      goal_kcal: clearing ? null : parseNum(goals.kcal) || null,
      goal_carbs: clearing ? null : parseNum(goals.carbs) || null,
      goal_protein: clearing ? null : parseNum(goals.protein) || null,
      goal_fat: clearing ? null : parseNum(goals.fat) || null,
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
    await upsertTodayGoalRevision({
      goal_kcal: patch.goal_kcal,
      goal_carbs: patch.goal_carbs,
      goal_protein: patch.goal_protein,
      goal_fat: patch.goal_fat,
    });
    setGoalDraft(null);
    setBodyDraft(null);
  }

  function toggleAllergen(key: string) {
    const cur = profile!.allergens;
    updateProfile({
      allergens: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    });
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.l, paddingBottom: spacing.xxl }}>
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
            onPress={() => setSection(s)}
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

          <SectionTitle>{t('settings.myAllergens')}</SectionTitle>
          <Text style={[styles.disclaimer, { marginBottom: spacing.s }]}>{t('settings.myAllergensHint')}</Text>
          <View style={styles.row}>
            {EU_ALLERGENS.map((key) => (
              <Chip key={key} label={t(`allergens.${key}`)} active={profile.allergens.includes(key)} onPress={() => toggleAllergen(key)} />
            ))}
          </View>
          <Text style={styles.disclaimer}>{t('allergens.disclaimer')}</Text>

          <SectionTitle>{t('settings.goals')}</SectionTitle>
          <GoalCalculator
            profile={profile}
            defaultOpen={false}
            onCalculated={async ({ goals: calcGoals, body }) => {
              setSavingBody(true);
              const styled = goalsFromPercents(calcGoals.kcal);
              const patch = {
                goal_kcal: calcGoals.kcal,
                goal_carbs: parseNum(styled.carbs) || calcGoals.carbs,
                goal_protein: parseNum(styled.protein) || calcGoals.protein,
                goal_fat: parseNum(styled.fat) || calcGoals.fat,
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
                setBodyDraft(body);
                setGoalDraft(styled);
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
            }}
          />
          {savingBody ? <Text style={styles.disclaimer}>{t('common.loading')}</Text> : null}
          <GoalMacroEditor
            value={goals}
            onChange={onGoalsChange}
            weightKg={bodyDraft?.weight_kg ?? profile.weight_kg ?? 0}
          />
          {goalDraft && <Button title={t('common.save')} onPress={saveGoals} />}
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
  switchText: { color: colors.muted, fontWeight: '600', fontSize: 12 },
  switchTextActive: { color: colors.primaryDark, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  prefLabel: { fontSize: 13, color: colors.muted, fontWeight: '600', marginBottom: spacing.s, marginTop: spacing.s },
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
