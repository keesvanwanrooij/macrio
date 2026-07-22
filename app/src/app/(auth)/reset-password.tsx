/*
 * SECTION: Set new password after recovery email
 * WHAT: Updates password while a recovery session is active.
 * HOW: validate ≥8 + match → updateUser → clear recovery flag → sign out → sign-in
 * INPUT: new password fields; recovery session from callback
 * OUTPUT: success alert; user signs in with new password
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, PasswordField } from '../../components/ui';
import { setPasswordRecoveryPending } from '../../lib/passwordRecovery';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../lib/theme';

export default function ResetPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = password.length >= 8 && password === confirm;

  async function handleSave() {
    if (password.length < 8) {
      Alert.alert(t('common.error'), t('auth.passwordHint'));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t('common.error'), t('auth.resetMismatch'));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert(t('common.error'), error.message);
        return;
      }
      setPasswordRecoveryPending(false);
      await supabase.auth.signOut();
      Alert.alert(t('auth.resetSuccessTitle'), t('auth.resetSuccessBody'), [
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
      <Text style={styles.title}>{t('auth.resetTitle')}</Text>
      <Text style={styles.body}>{t('auth.resetBody')}</Text>
      <PasswordField
        label={t('auth.newPassword')}
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
      />
      <Text style={styles.hint}>{t('auth.passwordHint')}</Text>
      <PasswordField
        label={t('auth.confirmNewPassword')}
        value={confirm}
        onChangeText={setConfirm}
        autoComplete="new-password"
      />
      <Button title={t('auth.resetSave')} onPress={handleSave} loading={busy} disabled={!canSubmit} />
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
});
