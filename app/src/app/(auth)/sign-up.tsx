import React, { useState } from 'react';
import { Alert, ScrollView, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Field } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../lib/theme';

export default function SignUp() {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignUp() {
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() } },
    });
    setBusy(false);
    if (error) {
      Alert.alert(t('auth.signUpFailed'), error.message);
      return;
    }
    // Confirm email ON: Supabase returns no session until the link is clicked.
    if (data.user && !data.session) {
      Alert.alert(
        t('auth.confirmEmailTitle'),
        t('auth.confirmEmailMessage', { email: email.trim() }),
        [{ text: t('common.done'), onPress: () => router.replace('/(auth)/sign-in') }]
      );
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.xl }}>
      <Text style={styles.title}>{t('auth.signUp')}</Text>
      <Field label={t('auth.displayName')} value={name} onChangeText={setName} autoCapitalize="words" />
      <Field
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Field
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      <Button
        title={t('auth.signUp')}
        onPress={handleSignUp}
        loading={busy}
        disabled={!email.trim() || password.length < 8}
      />
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
