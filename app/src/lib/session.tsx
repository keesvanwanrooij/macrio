import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import i18n from './i18n';
import { supabase } from './supabase';
import type { Profile } from './types';

type SessionContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  updateProfile: async () => {},
});

function fallbackNickname(userId: string, email?: string | null): string {
  const fromEmail = (email?.split('@')[0] ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (fromEmail.length >= 2) return fromEmail.slice(0, 30);
  return `user_${userId.replace(/-/g, '').slice(0, 8)}`;
}

/*
 * SECTION: Load or repair profile after auth
 * WHAT: Fetches the caller's profiles row; creates one if the auth user has none.
 * HOW: 1) select by id 2) ensure_own_profile RPC 3) direct insert fallback
 * INPUT: auth user id (+ optional email for nickname fallback)
 * OUTPUT: Profile or null
 */
async function fetchOrRepairProfile(userId: string, email?: string | null): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (data) return data as Profile;

  // Orphan auth user: trigger failed earlier (e.g. nickname CHECK). Repair.
  const { data: ensured } = await supabase.rpc('ensure_own_profile');
  if (ensured) return ensured as Profile;

  const nickname = fallbackNickname(userId, email);
  const { data: inserted, error } = await supabase
    .from('profiles')
    .insert({ id: userId, nickname })
    .select('*')
    .maybeSingle();
  if (!error && inserted) return inserted as Profile;

  // Nickname collision: try unique fallback id-based nickname
  const { data: retry } = await supabase
    .from('profiles')
    .insert({ id: userId, nickname: `user_${userId.replace(/-/g, '').slice(0, 8)}` })
    .select('*')
    .maybeSingle();
  return (retry as Profile) ?? null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string, email?: string | null) => {
    const row = await fetchOrRepairProfile(userId, email);
    if (row) {
      setProfile(row);
      if (row.language && row.language !== i18n.language) {
        i18n.changeLanguage(row.language);
      }
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        await loadProfile(data.session.user.id, data.session.user.email);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) await loadProfile(newSession.user.id, newSession.user.email);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session) await loadProfile(session.user.id, session.user.email);
  }, [session, loadProfile]);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!session) return;

      // If profile was missing, repair first so onboarding/settings can save.
      let base = profile;
      if (!base) {
        base = await fetchOrRepairProfile(session.user.id, session.user.email);
        if (!base) return;
        setProfile(base);
      }

      setProfile({ ...base, ...patch });
      if (patch.language) i18n.changeLanguage(patch.language);
      await supabase.from('profiles').update(patch).eq('id', session.user.id);
    },
    [session, profile]
  );

  return (
    <SessionContext.Provider value={{ session, profile, loading, refreshProfile, updateProfile }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
