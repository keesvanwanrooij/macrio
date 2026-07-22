/*
 * SECTION: Forgot password request
 * WHAT: Sends a password-reset email via Supabase (generic success copy).
 * HOW: resolve username/email → resetPasswordForEmail with app deep-link redirectTo
 * INPUT: email or username (same as sign-in)
 * OUTPUT: alert; user opens email link → /auth/callback → reset-password
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Field } from '../../components/ui';
import {
  getPasswordResetRedirectUrl,
  passwordResetRedirectNeedsTunnel,
  resolveLoginEmail,
} from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../lib/theme';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [busy, setBusy] = useState(false);

  function showSentAndGoSignIn() {
    // Same message whether or not the account exists (no account enumeration).
    Alert.alert(t('auth.forgotSentTitle'), t('auth.forgotSentBody'), [
      { text: t('common.done'), onPress: () => router.replace('/(auth)/sign-in') },
    ]);
  }

  async function handleSend() {
    const trimmed = loginId.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('auth.forgotInvalidIdentifier'));
      return;
    }
    setBusy(true);
    try {
      const redirectTo = getPasswordResetRedirectUrl();
      if (__DEV__) {
        console.log('[auth] password reset redirectTo:', redirectTo);
      }
      // Supabase rejects LAN IPs and falls back to Site URL (localhost:3000) - useless on a phone.
      if (passwordResetRedirectNeedsTunnel(redirectTo)) {
        Alert.alert(t('auth.forgotNeedsTunnelTitle'), t('auth.forgotNeedsTunnelBody'));
        return;
      }

      // Username → auth email via RPC; email path resolves locally (same as sign-in).
      const resolved = await resolveLoginEmail(trimmed);
      if ('error' in resolved) {
        showSentAndGoSignIn();
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(resolved.email, {
        redirectTo,
      });
      if (error) {
        Alert.alert(t('common.error'), error.message);
        return;
      }
      showSentAndGoSignIn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.xl }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{t('auth.forgotTitle')}</Text>
      <Text style={styles.body}>{t('auth.forgotBody')}</Text>
      <Field
        label={t('auth.loginIdentifier')}
        value={loginId}
        onChangeText={setLoginId}
        trimOnBlur
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
      />
      <Text style={styles.hint}>{t('auth.forgotIdentifierHint')}</Text>
      <Button
        title={t('auth.forgotSend')}
        onPress={handleSend}
        loading={busy}
        disabled={!loginId.trim()}
      />
      <Text style={styles.switch} onPress={() => router.replace('/(auth)/sign-in')}>
        {t('auth.backToSignIn')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: spacing.s },
  body: { fontSize: 15, color: colors.muted, lineHeight: 21, marginBottom: spacing.xl },
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: -spacing.s,
    marginBottom: spacing.m,
    lineHeight: 16,
  },
  switch: { color: colors.primaryDark, textAlign: 'center', marginTop: spacing.xl, fontWeight: '600' },
});
