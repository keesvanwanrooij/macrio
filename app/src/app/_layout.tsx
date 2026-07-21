import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import '../lib/i18n';
import { SessionProvider, useSession } from '../lib/session';
import { colors } from '../lib/theme';
import { Loading } from '../components/ui';

function RootNavigator() {
  const { session, profile, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (session && profile && !profile.onboarded && !inOnboarding) {
      router.replace('/onboarding');
    } else if (session && profile?.onboarded && (inAuth || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [session, profile, loading, segments, router]);

  if (loading) return <Loading />;

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
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-food" options={{ title: t('addFood.title'), presentation: 'modal' }} />
      <Stack.Screen name="log-entry" options={{ title: t('portion.title') }} />
      <Stack.Screen name="product/[id]" options={{ title: t('product.title') }} />
      <Stack.Screen name="product/create" options={{ title: t('product.createTitle') }} />
      <Stack.Screen name="feedback" options={{ title: t('feedback.title'), presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SessionProvider>
  );
}
