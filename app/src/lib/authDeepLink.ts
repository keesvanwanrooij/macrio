/*
 * SECTION: Auth redirect URLs + deep-link session exchange
 * WHAT: Confirm uses browser redirect env; password reset uses Expo Linking URL.
 * HOW: createURL for reset; parse incoming URL for PKCE code or access/refresh tokens.
 * INPUT: env EXPO_PUBLIC_AUTH_REDIRECT_URL; deep link URL from email
 * OUTPUT: redirect strings; session after exchange/setSession
 */
import * as Linking from 'expo-linking';

import { supabase } from './supabase';

/** Where Supabase sends the browser after email confirm. Must match Auth → URL Configuration. */
export function getAuthRedirectUrl(): string {
  return process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL ?? 'http://localhost:3000';
}

/**
 * Deep link back into the app after password-reset email.
 * Add this exact URL (and wildcards like macrio://**) in Supabase Redirect URLs.
 */
export function getPasswordResetRedirectUrl(): string {
  return Linking.createURL('/auth/callback');
}

function parseAuthParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const normalized = url.replace(/#/g, '?');
  try {
    const parsed = new URL(normalized);
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch {
    // Expo Go URLs can be odd; fall back to manual query parse
    const q = normalized.split('?')[1];
    if (!q) return params;
    for (const part of q.split('&')) {
      const [k, v] = part.split('=');
      if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }
  return params;
}

/**
 * Create a session from an auth email deep link (password recovery or magic).
 * Supports PKCE `code` and implicit `access_token` + `refresh_token`.
 */
export async function createSessionFromUrl(url: string): Promise<{
  session: Awaited<ReturnType<typeof supabase.auth.setSession>>['data']['session'];
  isRecovery: boolean;
  error: string | null;
}> {
  const params = parseAuthParams(url);
  const errorDescription = params.error_description || params.error;
  if (errorDescription) {
    return { session: null, isRecovery: false, error: errorDescription };
  }

  const isRecovery = params.type === 'recovery';

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) return { session: null, isRecovery, error: error.message };
    return { session: data.session, isRecovery, error: null };
  }

  const access_token = params.access_token;
  const refresh_token = params.refresh_token;
  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) return { session: null, isRecovery, error: error.message };
    return { session: data.session, isRecovery: isRecovery || true, error: null };
  }

  return { session: null, isRecovery: false, error: null };
}
