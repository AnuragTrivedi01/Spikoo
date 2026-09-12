import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile, UserPreferences } from '../types';
import { supabase } from '../services/supabaseClient';
import { getPreferences, getProfile } from '../services/authService';
interface AuthState { user: User | null; profile: Profile | null; preferences: UserPreferences | null; loading: boolean; error: string; reload: () => Promise<void>; signOut: () => Promise<void> }
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState('');
  const generation = useRef(0);
  const currentId = useRef<string | null>(null);
  const loadUser = useCallback(async (nextUser: User | null) => {
    const request = ++generation.current;
    currentId.current = nextUser?.id ?? null;
    setUser(nextUser); setProfile(null); setPreferences(null); setError('');
    if (!nextUser) { setLoading(false); return; }
    setLoading(true);
    try {
      const [p, preferences] = await Promise.all([getProfile(nextUser.id), getPreferences(nextUser.id)]);
      if (request === generation.current) { setProfile(p); setPreferences(preferences); }
    } catch (e) { if (request === generation.current) setError(e instanceof Error ? e.message : 'Your account could not load.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      if (event === 'INITIAL_SESSION' || (session?.user.id ?? null) !== currentId.current) {
        // Leave Supabase's auth callback before querying to avoid client-lock deadlocks.
        queueMicrotask(() => { if (live) void loadUser(session?.user ?? null); });
      } else if (session) setUser(session.user);
    });
    return () => { live = false; generation.current++; subscription.unsubscribe(); };
  }, [loadUser]);
  const reload = useCallback(() => loadUser(user), [loadUser, user]);
  const signOut = useCallback(async () => {
    const result = await supabase?.auth.signOut({ scope: 'local' });
    if (result?.error) throw new Error('Sign out did not finish. Please try again.');
    await loadUser(null);
  }, [loadUser]);
  return <AuthContext.Provider value={{ user, profile, preferences, loading, error, reload, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const auth = useContext(AuthContext); if (!auth) throw new Error('Missing auth context'); return auth; }
