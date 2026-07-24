import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import '../lib/i18n';
import { Sentry } from '../lib/sentry';
import { isPasswordRecoveryPending, setPasswordRecoveryPending } from '../lib/passwordRecovery';
import { SessionProvider, useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { useAuthDeepLinkHandler } from '../lib/useAuthDeepLinkHandler';
import { Loading } from '../components/ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootNavigator() {
  const { session, profile, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const { t } = useTranslation();
  const [, bump] = useState(0);

  // Password-reset emails must work even if expo-router never mounts /auth/callback.
  useAuthDeepLinkHandler();

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

    // Recovery wins over "already onboarded → tabs" so users always see set-password.
    if (isPasswordRecoveryPending()) {
      const onReset = inAuth && authScreen === 'reset-password';
      const onCallback = inAuthCallback;
      if (!onReset && !onCallback) {
        router.replace('/(auth)/reset-password');
      }
      return;
    }

    if (!session && !inAuth && !inAuthCallback) {
      router.replace('/(auth)/welcome');
    } else if (session && profile && !profile.onboarded && !inOnboarding) {
      router.replace('/onboarding');
    } else if (session && profile?.onboarded && (inAuth || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [session, profile, loading, segments, router]);

  if (loading) return <Loading />;

  // Profile still loading/repairing after auth (should be rare with applySession order).
  // Keep a spinner - do not bounce to welcome mid sign-up.
  if (session && !profile && !isPasswordRecoveryPending()) {
    return <Loading />;
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
