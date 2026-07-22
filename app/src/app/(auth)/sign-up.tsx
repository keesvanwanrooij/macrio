import React, { useState } from 'react';
import { Alert, ScrollView, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Field, PasswordField } from '../../components/ui';
import { isValidUsername, sanitizeUsernameInput } from '../../lib/username';
import {
  isDuplicateEmailSignUpError,
  isUsernameAvailable,
  isUsernameTakenSignUpError,
  getAuthRedirectUrl,
  isValidEmail,
  normalizeEmail,
} from '../../lib/auth';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../lib/theme';

export default function SignUp() {
  const { t } = useTranslation();
  const router = useRouter();
  const { applySession } = useSession();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = isValidUsername(username) && isValidEmail(email) && password.length >= 8;

  /*
   * SECTION: Create account
   * WHAT: Validates username, checks availability, then auth.signUp with metadata.
   * HOW: 1) isUsernameAvailable RPC 2) signUp with data.username 3) map taken/format errors
   * INPUT: username, email, password fields
   * OUTPUT: session + success alert, confirm-email flow, or usernameTaken / emailTaken alert
   * NOTE: Migration 018 makes handle_new_user raise username_taken instead of user_<id>.
   */
  async function handleSignUp() {
    setBusy(true);
    try {
      const normalizedEmail = normalizeEmail(email);
      const cleanUsername = username.trim();

      // Reject taken names before creating an auth user (avoids orphan + random fallback).
      const available = await isUsernameAvailable(cleanUsername);
      if (!available) {
        Alert.alert(t('auth.signUpFailed'), t('auth.usernameTaken'));
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: { username: cleanUsername },
        },
      });
      if (error) {
        const msg = isDuplicateEmailSignUpError(error.message)
          ? t('auth.emailTaken')
          : isUsernameTakenSignUpError(error.message)
            ? t('auth.usernameTaken')
            : error.message.includes('profiles_username_format') || error.message.includes('profiles_nickname_format')
              ? t('auth.usernameInvalid')
              : error.message;
        Alert.alert(t('auth.signUpFailed'), msg);
        return;
      }
      if (data.user && data.user.identities?.length === 0) {
        Alert.alert(t('auth.signUpFailed'), t('auth.emailTaken'));
        return;
      }
      if (data.session) {
        await applySession(data.session);
        Alert.alert(t('auth.signUpSuccessTitle'), t('auth.signUpSuccessMessage'));
        return;
      }
      if (data.user) {
        Alert.alert(
          t('auth.confirmEmailTitle'),
          t('auth.confirmEmailMessage', { email: normalizedEmail }),
          [{ text: t('common.done'), onPress: () => router.replace('/(auth)/sign-in') }]
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{t('auth.signUp')}</Text>
      <Field
        label={t('auth.username')}
        value={username}
        onChangeText={(text) => setUsername(sanitizeUsernameInput(text))}
        trimOnBlur
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
        importantForAutofill="yes"
      />
      <Text style={styles.hint}>{t('auth.usernameHint')}</Text>
      <Field
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        trimOnBlur
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        importantForAutofill="yes"
      />
      <PasswordField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        importantForAutofill="yes"
      />
      <Text style={styles.hint}>{t('auth.passwordHint')}</Text>
      <Button title={t('auth.signUp')} onPress={handleSignUp} loading={busy} disabled={!canSubmit} />
      <Text style={styles.switch} onPress={() => router.replace('/(auth)/sign-in')}>
        {t('auth.haveAccount')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: spacing.xl },
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: -spacing.s,
    marginBottom: spacing.m,
    lineHeight: 16,
  },
  switch: { color: colors.primaryDark, textAlign: 'center', marginTop: spacing.xl, fontWeight: '600' },
});
