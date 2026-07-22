/*
 * SECTION: Auth redirect URLs + deep-link session exchange
 * WHAT: Confirm uses browser redirect env; password reset + email-change use Expo Linking URLs.
 * HOW: createURL for reset/email-change; parse incoming URL for PKCE code or tokens; exchange session.
 * INPUT: env EXPO_PUBLIC_AUTH_REDIRECT_URL; deep link URL from email
 * OUTPUT: redirect strings; session after exchange/setSession; kind = recovery | email_change | other
 *
 * IMPORTANT (Expo Go + Supabase):
 * Supabase Auth rejects redirect URLs that use private LAN IPs (e.g. exp://192.168.x.x:…).
 * When that happens it silently falls back to Site URL (http://localhost:3000). Fix: Metro
 * with `--tunnel`, or a native/dev build with macrio:// (allow-listed).
 *
 * PKCE recovery emails often land as `…/auth/callback?code=…` without `type=recovery`.
 * Treat `/auth/callback` as recovery and `/auth/email-callback` as email change.
 */
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

import { supabase } from './supabase';

/** Where Supabase sends the browser after email confirm. Must match Auth → URL Configuration. */
export function getAuthRedirectUrl(): string {
  return process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL ?? 'http://localhost:3000';
}

function hostnameFromRedirect(url: string): string | null {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(url);
  if (!m) return null;
  return m[1].split(':')[0]?.toLowerCase() ?? null;
}

/** True for RFC1918 / link-local hosts Supabase will not accept as redirect_to. */
export function isPrivateLanHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') return false;
  const parts = hostname.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/**
 * Deep link back into the app after password-reset email.
 * Must be allow-listed in Supabase Redirect URLs (macrio://**, exp://**, or exact URL).
 */
export function getPasswordResetRedirectUrl(): string {
  if (Constants.appOwnership !== 'expo') {
    return Linking.createURL('/auth/callback', { scheme: 'macrio' });
  }
  return Linking.createURL('/auth/callback');
}

/** Deep link after confirm-to-new-address (email change). Distinct path from password reset. */
export function getEmailChangeRedirectUrl(): string {
  if (Constants.appOwnership !== 'expo') {
    return Linking.createURL('/auth/email-callback', { scheme: 'macrio' });
  }
  return Linking.createURL('/auth/email-callback');
}

/** True when this redirect would be dropped by Supabase → Site URL fallback. */
export function passwordResetRedirectNeedsTunnel(url: string = getPasswordResetRedirectUrl()): boolean {
  const host = hostnameFromRedirect(url);
  return host != null && isPrivateLanHostname(host);
}

export type AuthDeepLinkKind = 'recovery' | 'email_change' | 'other';

/** Classify auth email deep links (path + type= query). */
export function authDeepLinkKind(url: string): AuthDeepLinkKind {
  if (/auth\/email-callback/i.test(url)) return 'email_change';
  if (/[?&#]type=email_change(?:&|#|$)/i.test(url)) return 'email_change';
  if (/auth\/callback/i.test(url)) return 'recovery';
  if (/[?&#]type=recovery(?:&|#|$)/i.test(url)) return 'recovery';
  return 'other';
}

/** True when this URL is our auth email callback (reset / email-change landing in-app). */
export function isAuthCallbackUrl(url: string): boolean {
  return authDeepLinkKind(url) !== 'other';
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
 * Create a session from an auth email deep link (password recovery or email change).
 * Supports PKCE `code` and implicit `access_token` + `refresh_token`.
 */
export async function createSessionFromUrl(url: string): Promise<{
  session: Awaited<ReturnType<typeof supabase.auth.setSession>>['data']['session'];
  isRecovery: boolean;
  kind: AuthDeepLinkKind;
  error: string | null;
}> {
  if (__DEV__) {
    console.log('[auth] createSessionFromUrl:', url);
  }

  const params = parseAuthParams(url);
  const kind = authDeepLinkKind(url);
  const errorDescription = params.error_description || params.error;
  if (errorDescription) {
    return { session: null, isRecovery: false, kind, error: errorDescription };
  }

  // PKCE reset links often omit type=recovery; /auth/callback still means set-password.
  const isRecovery = kind === 'recovery';

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      if (__DEV__) console.warn('[auth] exchangeCodeForSession failed:', error.message);
      return { session: null, isRecovery, kind, error: error.message };
    }
    return { session: data.session, isRecovery, kind, error: null };
  }

  const access_token = params.access_token;
  const refresh_token = params.refresh_token;
  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) return { session: null, isRecovery, kind, error: error.message };
    return { session: data.session, isRecovery, kind, error: null };
  }

  if (__DEV__) {
    console.warn('[auth] createSessionFromUrl: no code/tokens in URL');
  }
  return { session: null, isRecovery: false, kind, error: null };
}
