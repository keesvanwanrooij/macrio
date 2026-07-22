/*
 * SECTION: Forgot password request
 * WHAT: Sends a password-reset email via Supabase (generic success copy).
 * HOW: normalize email → resetPasswordForEmail with app deep-link redirectTo
 * INPUT: email field
 * OUTPUT: alert; user opens email link → /auth/callback → reset-password
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Field } from '../../components/ui';
import { getPasswordResetRedirectUrl, isValidEmail, normalizeEmail } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../lib/theme';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSend() {
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      Alert.alert(t('common.error'), t('auth.forgotInvalidEmail'));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
        redirectTo: getPasswordResetRedirectUrl(),
      });
      if (error) {
        Alert.alert(t('common.error'), error.message);
        return;
      }
      // Same message whether or not the email exists (no account enumeration).
      Alert.alert(t('auth.forgotSentTitle'), t('auth.forgotSentBody'), [
        { text: t('common.done'), onPress: () => router.replace('/(auth)/sign-in') },
      ]);
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
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        trimOnBlur
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <Button
        title={t('auth.forgotSend')}
        onPress={handleSend}
        loading={busy}
        disabled={!email.trim()}
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
  switch: { color: colors.primaryDark, textAlign: 'center', marginTop: spacing.xl, fontWeight: '600' },
});
