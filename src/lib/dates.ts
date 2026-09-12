import type { DailyActivity } from '../types';
export function localDate(date = new Date(), timezone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function dateOffset(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10);
}
export function calculateStreaks(activity: DailyActivity[], today = localDate()) {
  const days = [...new Set(activity.filter(a => a.attempt_count > 0 && a.activity_date <= today).map(a => a.activity_date))].sort();
  let longest = 0; let run = 0;
  days.forEach((day, i) => { run = i > 0 && dateOffset(days[i - 1], 1) === day ? run + 1 : 1; longest = Math.max(longest, run); });
  let cursor = days.includes(today) ? today : dateOffset(today, -1); let current = 0;
  const set = new Set(days);
  while (set.has(cursor)) { current++; cursor = dateOffset(cursor, -1); }
  return { current, longest, practiceDays: days.length };
}
export function formatDuration(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }
export function readableDate(value: string) { return new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
