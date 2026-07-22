import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import '../lib/i18n';
import { Sentry } from '../lib/sentry';
import { isPasswordRecoveryPending, setPasswordRecoveryPending } from '../lib/passwordRecovery';
import { SessionProvider, useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, spacing } from '../lib/theme';
import { Button, Loading } from '../components/ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootNavigator() {
  const { session, profile, profileError, loading, refreshProfile } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);
  const [, bump] = useState(0);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryPending(true);
        bump((n) => n + 1);
        router.replace('/(auth)/reset-password');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inAuthCallback = segments[0] === 'auth';
    const authScreen = typeof segments[1] === 'string' ? segments[1] : '';
    const stayOnAuthWhileRecovering =
      isPasswordRecoveryPending() &&
      (authScreen === 'reset-password' || authScreen === 'callback' || inAuthCallback);

    if (!session && !inAuth && !inAuthCallback) {
      router.replace('/(auth)/welcome');
    } else if (session && stayOnAuthWhileRecovering) {
      // Keep recovery flow on reset-password / callback
    } else if (session && profile && !profile.onboarded && !inOnboarding) {
      router.replace('/onboarding');
    } else if (session && profile?.onboarded && (inAuth || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [session, profile, loading, segments, router]);

  if (loading) return <Loading />;

  // Session exists but profile missing (orphan auth user). Offer retry / sign out.
  // Skip during password recovery (session exists only to update password).
  if (session && !profile && !isPasswordRecoveryPending()) {
    return (
      <View style={styles.repair}>
        <Text style={styles.repairTitle}>{t('auth.profileMissingTitle')}</Text>
        <Text style={styles.repairBody}>{t('auth.profileMissingBody')}</Text>
        {profileError ? <Text style={styles.repairDetail}>{profileError}</Text> : null}
        <Button
          title={t('common.retry')}
          loading={retrying}
          onPress={async () => {
            setRetrying(true);
            await refreshProfile();
            setRetrying(false);
          }}
        />
        <View style={{ height: spacing.m }} />
        <Button title={t('settings.signOut')} variant="secondary" onPress={() => supabase.auth.signOut()} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(auth)/welcome" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/sign-in" options={{ title: '' }} />
      <Stack.Screen name="(auth)/sign-up" options={{ title: '' }} />
      <Stack.Screen name="(auth)/forgot-password" options={{ title: t('auth.forgotTitle') }} />
      <Stack.Screen name="(auth)/reset-password" options={{ title: t('auth.resetTitle'), headerBackVisible: false }} />
      <Stack.Screen name="auth/callback" options={{ title: '', headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-food" options={{ title: t('addFood.title'), presentation: 'modal' }} />
      <Stack.Screen name="log-entry" options={{ title: t('portion.title') }} />
      <Stack.Screen name="log-multi" options={{ title: t('addFood.multiReviewTitle') }} />
      <Stack.Screen name="product/[id]" options={{ title: t('product.title') }} />
      <Stack.Screen name="product/create" options={{ title: t('product.createTitle') }} />
      <Stack.Screen name="product/add-barcode" options={{ title: t('product.addBarcodeTitle') }} />
      <Stack.Screen name="feedback" options={{ title: t('feedback.title'), presentation: 'modal' }} />
    </Stack>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SessionProvider>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  repair: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  repairTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.s,
  },
  repairBody: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 21,
    marginBottom: spacing.m,
  },
  repairDetail: {
    fontSize: 12,
    color: colors.faint,
    lineHeight: 17,
    marginBottom: spacing.xl,
    fontFamily: 'monospace',
  },
});
