import React, { useState } from 'react';
import { Alert, ScrollView, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Field, PasswordField } from '../../components/ui';
import { resolveLoginEmail } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../lib/theme';

export default function SignIn() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    const resolved = await resolveLoginEmail(loginId);
    if ('error' in resolved) {
      setBusy(false);
      Alert.alert(t('auth.signInFailed'), t('auth.loginNotFound'));
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: resolved.email,
      password,
    });
    setBusy(false);
    if (error) Alert.alert(t('auth.signInFailed'), error.message);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.xl }}>
      <Text style={styles.title}>{t('auth.signIn')}</Text>
      <Field
        label={t('auth.loginIdentifier')}
        value={loginId}
        onChangeText={setLoginId}
        trimOnBlur
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
        importantForAutofill="yes"
      />
      <Text style={styles.hint}>{t('auth.loginIdentifierHint')}</Text>
      {/* Password: sent as typed — do not trim (spaces may be intentional). */}
      <PasswordField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
      />
      <Button
        title={t('auth.signIn')}
        onPress={handleSignIn}
        loading={busy}
        disabled={!loginId.trim() || !password}
      />
      <Text style={styles.switch} onPress={() => router.replace('/(auth)/sign-up')}>
        {t('auth.noAccount')}
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
