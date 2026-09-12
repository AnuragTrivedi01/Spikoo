import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
function isPublicKey(value: string) {
  if (value.startsWith('sb_publishable_')) return true;
  try { return JSON.parse(atob(value.split('.')[1])).role === 'anon'; } catch { return false; }
}
export const isConfigured = Boolean(url && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) && key && isPublicKey(key));
export const supabase = isConfigured ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export function database() { if (!supabase) throw new Error('Spikoo is not connected yet. Please contact the app owner.'); return supabase; }
