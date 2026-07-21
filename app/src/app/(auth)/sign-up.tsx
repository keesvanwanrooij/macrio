import React, { useState } from 'react';
import { Alert, ScrollView, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Field, PasswordField } from '../../components/ui';
import { isValidNickname, sanitizeNicknameInput } from '../../lib/nickname';
import { isDuplicateEmailSignUpError, getAuthRedirectUrl, isValidEmail, normalizeEmail } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../lib/theme';

export default function SignUp() {
  const { t } = useTranslation();
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = isValidNickname(nickname) && isValidEmail(email) && password.length >= 8;

  async function handleSignUp() {
    setBusy(true);
    const normalizedEmail = normalizeEmail(email);
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: { nickname: nickname.trim() },
      },
    });
    setBusy(false);
    if (error) {
      const msg = isDuplicateEmailSignUpError(error.message)
        ? t('auth.emailTaken')
        : error.message.includes('profiles_nickname_lower_idx')
          ? t('auth.nicknameTaken')
          : error.message.includes('profiles_nickname_format')
            ? t('auth.nicknameInvalid')
            : error.message;
      Alert.alert(t('auth.signUpFailed'), msg);
      return;
    }
    if (data.user && data.user.identities?.length === 0) {
      Alert.alert(t('auth.signUpFailed'), t('auth.emailTaken'));
      return;
    }
    if (data.user && !data.session) {
      Alert.alert(
        t('auth.confirmEmailTitle'),
        t('auth.confirmEmailMessage', { email: normalizedEmail }),
        [{ text: t('common.done'), onPress: () => router.replace('/(auth)/sign-in') }]
      );
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.xl }}>
      <Text style={styles.title}>{t('auth.signUp')}</Text>
      <Field
        label={t('auth.nickname')}
        value={nickname}
        onChangeText={(text) => setNickname(sanitizeNicknameInput(text))}
        trimOnBlur
        autoCapitalize="none"
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
      />
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
  switch: { color: colors.primaryDark, textAlign: 'center', marginTop: spacing.xl, fontWeight: '600' },
});
