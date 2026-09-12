import { database } from './supabaseClient';
import { dateOffset, localDate } from '../lib/dates';
import type { DailyActivity, UserStats } from '../types';
export async function getProgress(timezone: string) {
  const db = database();
  const [stats, activity, trend] = await Promise.all([
    db.from('user_stats').select('*').single(),
    db.from('daily_activity').select('activity_date,session_count,attempt_count,speaking_seconds').gte('activity_date', dateOffset(localDate(new Date(), timezone), -364)).order('activity_date'),
    db.from('practice_attempts').select('id,overall_score,grammar_score,vocabulary_score,clarity_score,completed_at').order('completed_at', { ascending: false }).limit(20),
  ]);
  if (stats.error || activity.error || trend.error) throw new Error('Your progress could not load. Please try again.');
  return { stats: stats.data as UserStats, activity: activity.data as DailyActivity[], trend: trend.data.reverse() };
}
