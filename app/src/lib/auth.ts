import { supabase } from './supabase';

/** Where Supabase sends the browser after email confirm. Must match Auth → URL Configuration. */
export function getAuthRedirectUrl(): string {
  return process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL ?? 'http://localhost:3000';
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function looksLikeEmail(identifier: string): boolean {
  return identifier.trim().includes('@');
}

export function isDuplicateEmailSignUpError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already exists')
  );
}

export type SignInFailure =
  | 'not_found'
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'unknown';

/** Map Supabase Auth sign-in errors to stable app keys. */
export function classifySignInError(message: string): SignInFailure {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return 'invalid_credentials';
  }
  if (m.includes('email not confirmed')) {
    return 'email_not_confirmed';
  }
  return 'unknown';
}

/*
 * SECTION: Login identifier → email
 * WHAT: Resolves username or email to the auth email for sign-in.
 * HOW: Email is resolved locally (no RPC). Username uses resolve_login_email RPC.
 * INPUT: user-typed login string
 * OUTPUT: email string, or not_found
 */
export async function resolveLoginEmail(
  identifier: string
): Promise<{ email: string } | { error: 'not_found' }> {
  const trimmed = identifier.trim();
  if (!trimmed) return { error: 'not_found' };

  // Email login must work even if the username RPC was never migrated.
  if (looksLikeEmail(trimmed)) {
    return { email: normalizeEmail(trimmed) };
  }

  const { data, error } = await supabase.rpc('resolve_login_email', { p_identifier: trimmed });
  if (error || !data) return { error: 'not_found' };

  return { email: data as string };
}
