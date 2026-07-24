import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { isAccountDeletedAuthError } from './auth';
import i18n from './i18n';
import { supabase } from './supabase';
import type { Profile } from './types';

type SessionContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  /** Apply a session from signIn/signUp response (avoids relying only on the auth listener). */
  applySession: (next: Session | null) => Promise<void>;
  /** Patch profiles row. Returns error message if the DB write failed (UI is reverted). */
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: string | null }>;
};

const SessionContext = createContext<SessionContextValue>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  applySession: async () => {},
  updateProfile: async () => ({ error: null }),
});

function fallbackUsername(userId: string, email?: string | null): string {
  const fromEmail = (email?.split('@')[0] ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (fromEmail.length >= 2) return fromEmail.slice(0, 30);
  return `user_${userId.replace(/-/g, '').slice(0, 8)}`;
}

type ProfileLoadResult = { profile: Profile | null; error: string | null };

/*
 * SECTION: Load or repair profile after auth
 * WHAT: Fetches the caller's profiles row; creates one if the auth user has none.
 * HOW: 1) select by id 2) ensure_own_profile RPC 3) direct insert fallback
 * INPUT: auth user id (+ optional email for username fallback)
 * OUTPUT: Profile or null, plus optional error (account_deleted when soft-deleted / banned)
 */
async function fetchOrRepairProfile(userId: string, email?: string | null): Promise<ProfileLoadResult> {
  const { data, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (data) {
    const row = data as Profile;
    // Soft-deleted account: do not treat as a live profile
    if (row.deletion_requested_at) {
      return { profile: null, error: 'account_deleted' };
    }
    return { profile: row, error: null };
  }

  if (selectError) {
    console.warn('[session] profiles select failed:', selectError.message);
  }

  // Orphan auth user: trigger failed earlier (e.g. username CHECK). Repair.
  const { data: ensured, error: ensureError } = await supabase.rpc('ensure_own_profile');
  if (ensured) {
    const row = ensured as Profile;
    if (row.deletion_requested_at) {
      return { profile: null, error: 'account_deleted' };
    }
    return { profile: row, error: null };
  }
  if (ensureError) {
    console.warn('[session] ensure_own_profile failed:', ensureError.message);
    if (isAccountDeletedAuthError(ensureError.message)) {
      return { profile: null, error: 'account_deleted' };
    }
  }

  const username = fallbackUsername(userId, email);
  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: userId, username })
    .select('*')
    .maybeSingle();
  if (!insertError && inserted) return { profile: inserted as Profile, error: null };

  // Username collision: try unique fallback id-based username
  const { data: retry, error: retryError } = await supabase
    .from('profiles')
    .insert({ id: userId, username: `user_${userId.replace(/-/g, '').slice(0, 8)}` })
    .select('*')
    .maybeSingle();
  if (!retryError && retry) return { profile: retry as Profile, error: null };

  const message =
    selectError?.message ||
    ensureError?.message ||
    insertError?.message ||
    retryError?.message ||
    'profile_unavailable';
  if (isAccountDeletedAuthError(message)) {
    return { profile: null, error: 'account_deleted' };
  }
  return { profile: null, error: message };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(
    async (userId: string, email?: string | null): Promise<'ok' | 'deleted' | 'missing'> => {
      const { profile: row, error } = await fetchOrRepairProfile(userId, email);

      if (error === 'account_deleted') {
        setProfile(null);
        await supabase.auth.signOut();
        setSession(null);
        return 'deleted';
      }

      if (row) {
        setProfile(row);
        if (row.language && row.language !== i18n.language) {
          i18n.changeLanguage(row.language);
        }
        return 'ok';
      }

      setProfile(null);
      return 'missing';
    },
    []
  );

  const applySession = useCallback(
    async (next: Session | null) => {
      if (!next) {
        setSession(null);
        setProfile(null);
        return;
      }
      // Load/repair profile before exposing the session so navigation never sees
      // “signed in, no profile” mid sign-up / sign-in (welcome flash).
      const status = await loadProfile(next.user.id, next.user.email);
      if (status !== 'deleted') setSession(next);
    },
    [loadProfile]
  );

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      if (data.session) {
        const status = await loadProfile(data.session.user.id, data.session.user.email);
        if (!cancelled && status !== 'deleted') setSession(data.session);
      }
      if (!cancelled) setLoading(false);
    });

    /*
     * IMPORTANT: do not await Supabase calls inside onAuthStateChange.
     * The auth client holds a lock; awaiting profiles/RPC here deadlocks
     * signInWithPassword and leaves the UI stuck on the sign-in screen.
     */
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        setSession(null);
        setProfile(null);
        return;
      }
      const userId = newSession.user.id;
      const email = newSession.user.email;
      setTimeout(() => {
        if (cancelled) return;
        void (async () => {
          const status = await loadProfile(userId, email);
          if (!cancelled && status !== 'deleted') setSession(newSession);
        })();
      }, 0);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session) await loadProfile(session.user.id, session.user.email);
  }, [session, loadProfile]);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>): Promise<{ error: string | null }> => {
      if (!session) return { error: 'no_session' };

      // If profile was missing, repair first so onboarding/settings can save.
      let base = profile;
      if (!base) {
        const repaired = await fetchOrRepairProfile(session.user.id, session.user.email);
        if (repaired.error === 'account_deleted') {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          return { error: 'account_deleted' };
        }
        if (!repaired.profile) {
          return { error: repaired.error ?? 'profile_unavailable' };
        }
        base = repaired.profile;
        setProfile(base);
      }

      // Optimistic UI, then write. Revert if Postgres/PostgREST rejects the patch
      // (common when migrations 006/007 were not run yet).
      const previous = base;
      setProfile({ ...base, ...patch });
      if (patch.language) i18n.changeLanguage(patch.language);

      const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
      if (error) {
        console.warn('[session] profile update failed:', error.message);
        setProfile(previous);
        return { error: error.message };
      }

      // Re-read so we match what Postgres actually stored.
      await loadProfile(session.user.id, session.user.email);
      return { error: null };
    },
    [session, profile, loadProfile]
  );

  return (
    <SessionContext.Provider
      value={{ session, profile, loading, refreshProfile, applySession, updateProfile }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
