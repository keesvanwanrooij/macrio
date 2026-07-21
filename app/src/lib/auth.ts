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

export function isDuplicateEmailSignUpError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already exists')
  );
}

/*
 * SECTION: Login identifier → email
 * WHAT: Resolves nickname or email to the auth email for sign-in.
 * HOW: Calls resolve_login_email RPC (server-side lookup in profiles + auth.users).
 * INPUT: user-typed login string
 * OUTPUT: email string, or null if not found
 */
export async function resolveLoginEmail(
  identifier: string
): Promise<{ email: string } | { error: 'not_found' }> {
  const trimmed = identifier.trim();
  if (!trimmed) return { error: 'not_found' };

  const { data, error } = await supabase.rpc('resolve_login_email', { p_identifier: trimmed });
  if (error) return { error: 'not_found' };

  return { email: data as string };
}
