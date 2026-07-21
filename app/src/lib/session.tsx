import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import i18n from './i18n';
import { supabase } from './supabase';
import type { Profile } from './types';

type SessionContextValue = {
  session: Session | null;
  profile: Profile | null;
  /** Last profile load/repair error (shown on the orphan-profile screen). */
  profileError: string | null;
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
  profileError: null,
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
 * OUTPUT: Profile or null, plus optional error message
 */
async function fetchOrRepairProfile(userId: string, email?: string | null): Promise<ProfileLoadResult> {
  const { data, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (data) return { profile: data as Profile, error: null };

  if (selectError) {
    console.warn('[session] profiles select failed:', selectError.message);
  }

  // Orphan auth user: trigger failed earlier (e.g. username CHECK). Repair.
  const { data: ensured, error: ensureError } = await supabase.rpc('ensure_own_profile');
  if (ensured) return { profile: ensured as Profile, error: null };
  if (ensureError) {
    console.warn('[session] ensure_own_profile failed:', ensureError.message);
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
  return { profile: null, error: message };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string, email?: string | null) => {
    const { profile: row, error } = await fetchOrRepairProfile(userId, email);
    if (row) {
      setProfile(row);
      setProfileError(null);
      if (row.language && row.language !== i18n.language) {
        i18n.changeLanguage(row.language);
      }
    } else {
      setProfile(null);
      setProfileError(error);
    }
  }, []);

  const applySession = useCallback(
    async (next: Session | null) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setProfileError(null);
        return;
      }
      await loadProfile(next.user.id, next.user.email);
    },
    [loadProfile]
  );

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session) {
        await loadProfile(data.session.user.id, data.session.user.email);
      }
      if (!cancelled) setLoading(false);
    });

    /*
     * IMPORTANT: do not await Supabase calls inside onAuthStateChange.
     * The auth client holds a lock; awaiting profiles/RPC here deadlocks
     * signInWithPassword and leaves the UI stuck on the sign-in screen.
     */
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
        setProfileError(null);
        return;
      }
      const userId = newSession.user.id;
      const email = newSession.user.email;
      setTimeout(() => {
        if (!cancelled) void loadProfile(userId, email);
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
        if (!repaired.profile) {
          setProfileError(repaired.error);
          return { error: repaired.error ?? 'profile_unavailable' };
        }
        base = repaired.profile;
        setProfile(base);
        setProfileError(null);
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
        setProfileError(error.message);
        return { error: error.message };
      }

      setProfileError(null);
      // Re-read so we match what Postgres actually stored.
      await loadProfile(session.user.id, session.user.email);
      return { error: null };
    },
    [session, profile, loadProfile]
  );

  return (
    <SessionContext.Provider
      value={{ session, profile, profileError, loading, refreshProfile, applySession, updateProfile }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
