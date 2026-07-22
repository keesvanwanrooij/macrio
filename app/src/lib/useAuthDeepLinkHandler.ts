/*
 * SECTION: Root auth deep-link handler
 * WHAT: Processes password-reset and email-change links even when callback routes did not mount.
 * HOW: Listen for Linking URL → createSessionFromUrl → route by kind
 * INPUT: exp://…/auth/callback?code=… or …/auth/email-callback?… or macrio://…
 * OUTPUT: recovery → reset-password; email_change → Settings (session applied)
 */
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { createSessionFromUrl, isAuthCallbackUrl } from './authDeepLink';
import i18n from './i18n';
import { setPasswordRecoveryPending } from './passwordRecovery';
import { useSession } from './session';

export function useAuthDeepLinkHandler() {
  const router = useRouter();
  const { applySession } = useSession();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handle(url: string | null) {
      if (!url || cancelled) return;
      if (!isAuthCallbackUrl(url)) return;
      if (handled.current === url) return;
      handled.current = url;

      const result = await createSessionFromUrl(url);
      if (cancelled) return;

      if (result.error) {
        if (__DEV__) console.warn('[auth] deep link error:', result.error);
        setPasswordRecoveryPending(false);
        router.replace('/(auth)/sign-in');
        return;
      }
      if (!result.session) {
        if (__DEV__) console.warn('[auth] deep link: no session');
        return;
      }

      await applySession(result.session);
      if (cancelled) return;

      if (result.kind === 'email_change') {
        setPasswordRecoveryPending(false);
        Alert.alert(
          i18n.t('settings.emailChangeConfirmedTitle'),
          i18n.t('settings.emailChangeConfirmedBody')
        );
        router.replace('/(tabs)/settings');
        return;
      }

      // Password recovery (default for /auth/callback)
      setPasswordRecoveryPending(true);
      router.replace('/(auth)/reset-password');
    }

    void Linking.getInitialURL().then((url) => void handle(url));
    const sub = Linking.addEventListener('url', ({ url }) => {
      void handle(url);
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [applySession, router]);
}
