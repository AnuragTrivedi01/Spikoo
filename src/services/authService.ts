import { database } from './supabaseClient';
import type { EnglishLevel, Profile, Theme, UserPreferences } from '../types';
export async function getProfile(userId: string) {
  const { data, error } = await database().from('profiles').select('user_id,display_name,english_level,onboarding_completed,created_at').eq('user_id', userId).single();
  if (error) throw new Error('Your account details could not load. Please try again.');
  return data as Profile;
}
export async function getPreferences(userId: string) {
  const { data, error } = await database().from('user_preferences').select('user_id,theme,timezone').eq('user_id', userId).single();
  if (error) throw new Error('Your preferences could not load. Please try again.');
  return data as UserPreferences;
}
export async function updateProfile(userId: string, displayName: string, level: EnglishLevel, onboarding = true) {
  const { error } = await database().from('profiles').update({ display_name: displayName.trim(), english_level: level, onboarding_completed: onboarding }).eq('user_id', userId);
  if (error) throw new Error('Your profile could not be saved. Please try again.');
}
export async function updatePreferences(userId: string, theme: Theme, timezone: string) {
  const { error } = await database().from('user_preferences').update({ theme, timezone }).eq('user_id', userId);
  if (error) throw new Error('Your preferences could not be saved. Please try again.');
}
