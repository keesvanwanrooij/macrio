import { supabase } from './supabase';

export { getAuthRedirectUrl } from './authDeepLink';
export {
  getPasswordResetRedirectUrl,
  getEmailChangeRedirectUrl,
  createSessionFromUrl,
  passwordResetRedirectNeedsTunnel,
} from './authDeepLink';

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

/** Map trigger / unique-index failures for a taken username (sign-up or Settings). */
export function isUsernameTakenSignUpError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('username_taken') ||
    m.includes('profiles_username_lower_idx') ||
    m.includes('profiles_nickname_lower_idx') ||
    (m.includes('duplicate') && (m.includes('username') || m.includes('nickname'))) ||
    (m.includes('unique') && (m.includes('username') || m.includes('nickname')))
  );
}

/** DB CHECK / format failures for username (Settings save or sign-up). */
export function isUsernameFormatError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('profiles_username_format') ||
    m.includes('profiles_nickname_format') ||
    (m.includes('check') && (m.includes('username') || m.includes('nickname')))
  );
}

/** i18n key for username save/sign-up errors, or null when message should stay raw. */
export function usernameErrorI18nKey(
  message: string
): 'auth.usernameTaken' | 'auth.usernameInvalid' | null {
  if (isUsernameTakenSignUpError(message)) return 'auth.usernameTaken';
  if (isUsernameFormatError(message)) return 'auth.usernameInvalid';
  return null;
}

/*
 * SECTION: Re-auth before sensitive Settings changes
 * WHAT: Proves current password so a stolen session cannot change username/email/password alone.
 * HOW: signInWithPassword with the account email + typed current password.
 * INPUT: account email, current password
 * OUTPUT: { ok: true } or { ok: false }
 */
export async function reauthenticateWithPassword(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false };
  return { ok: true };
}

/*
 * SECTION: Username availability (pre-signup)
 * WHAT: Asks Postgres if this username is free before auth.signUp.
 * HOW: RPC is_username_available (migration 018). On RPC failure, return true so
 *      older projects still sign up; handle_new_user is the real safety net.
 * INPUT: trimmed username string
 * OUTPUT: true = free (or check skipped); false = taken
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_available', {
    p_username: username.trim(),
  });
  if (error) {
    console.warn('[auth] is_username_available failed:', error.message);
    return true;
  }
  return data === true;
}

export type SignInFailure =
  | 'not_found'
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'account_deleted'
  | 'unknown';

/** Soft-delete / ban messages from Auth or ensure_own_profile (migration 022). */
export function isAccountDeletedAuthError(message: string | null | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('account_deleted') ||
    m.includes('user is banned') ||
    m.includes('user_banned') ||
    m.includes('user has been banned') ||
    m.includes('banned')
  );
}

/** Map Supabase Auth sign-in errors to stable app keys. */
export function classifySignInError(message: string): SignInFailure {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return 'invalid_credentials';
  }
  if (m.includes('email not confirmed')) {
    return 'email_not_confirmed';
  }
  if (isAccountDeletedAuthError(m)) {
    return 'account_deleted';
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
