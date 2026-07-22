/*
 * SECTION: Root auth deep-link handler
 * WHAT: Processes password-reset (and similar) email links even when /auth/callback did not mount.
 * HOW: Listen for Linking URL → createSessionFromUrl → mark recovery → applySession → reset-password
 * INPUT: exp://…/auth/callback?code=… or macrio://auth/callback?…
 * OUTPUT: recovery session + navigation to /(auth)/reset-password
 */
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { createSessionFromUrl, isAuthCallbackUrl } from './authDeepLink';
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

      // Always treat /auth/callback success as recovery (show set-password UI).
      setPasswordRecoveryPending(true);
      await applySession(result.session);
      if (cancelled) return;
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
