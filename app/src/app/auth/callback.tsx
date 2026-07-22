/*
 * SECTION: Auth email deep-link callback
 * WHAT: Handles Supabase redirect after password-reset (or similar) email.
 * HOW: Parse URL → createSessionFromUrl → mark recovery → navigate to reset-password.
 * INPUT: route / linking URL with code or tokens
 * OUTPUT: session + /(auth)/reset-password or error → sign-in
 */
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { createSessionFromUrl } from '../../lib/authDeepLink';
import { setPasswordRecoveryPending } from '../../lib/passwordRecovery';
import { useSession } from '../../lib/session';
import { colors, spacing } from '../../lib/theme';

export default function AuthCallback() {
  const { t } = useTranslation();
  const router = useRouter();
  const { applySession } = useSession();
  const [message, setMessage] = useState(t('auth.callbackWorking'));
  const handled = useRef<string | null>(null);
  const url = Linking.useURL();

  useEffect(() => {
    let cancelled = false;

    async function run(nextUrl: string | null) {
      if (!nextUrl || handled.current === nextUrl) return;
      handled.current = nextUrl;
      const result = await createSessionFromUrl(nextUrl);
      if (cancelled) return;
      if (result.error) {
        setMessage(result.error);
        setTimeout(() => router.replace('/(auth)/sign-in'), 2000);
        return;
      }
      if (!result.session) {
        setMessage(t('auth.callbackMissingLink'));
        setTimeout(() => router.replace('/(auth)/sign-in'), 2000);
        return;
      }
      setPasswordRecoveryPending(true);
      await applySession(result.session);
      router.replace('/(auth)/reset-password');
    }

    if (url) {
      void run(url);
      return () => {
        cancelled = true;
      };
    }

    Linking.getInitialURL().then((initial) => {
      if (!cancelled) void run(initial);
    });
    const sub = Linking.addEventListener('url', ({ url: eventUrl }) => {
      void run(eventUrl);
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [applySession, router, t, url]);

  return (
    <View style={styles.box}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.m,
  },
  text: { color: colors.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
});
