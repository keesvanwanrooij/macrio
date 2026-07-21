/*
 * SECTION: Welcome (unauthenticated landing)
 * WHAT: First screen before sign-up / sign-in; states Macrio's value proposition.
 * HOW: Title, subtitle, then primary/secondary CTAs.
 * INPUT: i18n strings under auth.welcome*
 * OUTPUT: Navigation to sign-up or sign-in.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/ui';
import { colors, spacing } from '../../lib/theme';

export default function Welcome() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>🥦</Text>
        <Text style={styles.title}>{t('auth.welcomeTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.welcomeSubtitle')}</Text>
      </View>
      <View style={styles.actions}>
        <Button title={t('auth.signUp')} onPress={() => router.push('/(auth)/sign-up')} />
        <View style={{ height: spacing.m }} />
        <Button title={t('auth.signIn')} variant="secondary" onPress={() => router.push('/(auth)/sign-in')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 72, marginBottom: spacing.l },
  title: { fontSize: 32, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.l,
    lineHeight: 24,
    maxWidth: 340,
    paddingHorizontal: spacing.s,
  },
  actions: { paddingBottom: spacing.xl },
});
