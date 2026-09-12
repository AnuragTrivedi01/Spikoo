import { describe, expect, it } from 'vitest';
import { calculateStreaks, dateOffset, localDate } from './dates';
import type { DailyActivity } from '../types';
const day = (date: string, attempts = 1): DailyActivity => ({ activity_date: date, attempt_count: attempts, session_count: attempts ? 1 : 0, speaking_seconds: attempts * 60 });
describe('real local practice days', () => {
  it('handles different calendar dates at the same instant', () => { const now = new Date('2026-09-11T20:00:00Z'); expect(localDate(now, 'Asia/Kolkata')).toBe('2026-09-12'); expect(localDate(now, 'America/Los_Angeles')).toBe('2026-09-11'); });
  it('handles DST dates without 24-hour arithmetic', () => { expect(dateOffset('2026-03-08', 1)).toBe('2026-03-09'); expect(dateOffset('2024-03-01', -1)).toBe('2024-02-29'); });
  it('has no streak for no analyzed attempts', () => { expect(calculateStreaks([day('2026-09-11', 0)], '2026-09-11')).toEqual({ current: 0, longest: 0, practiceDays: 0 }); });
  it('counts today once despite duplicates', () => { expect(calculateStreaks([day('2026-09-11', 3), day('2026-09-11')], '2026-09-11')).toEqual({ current: 1, longest: 1, practiceDays: 1 }); });
  it('preserves yesterday’s streak before today’s practice', () => { expect(calculateStreaks([day('2026-09-09'), day('2026-09-10')], '2026-09-11').current).toBe(2); });
  it('breaks current streak after a missed day but keeps best streak', () => { expect(calculateStreaks([day('2026-09-07'), day('2026-09-08'), day('2026-09-09')], '2026-09-11')).toEqual({ current: 0, longest: 3, practiceDays: 3 }); });
  it('ignores future activity in streaks', () => { expect(calculateStreaks([day('2026-09-10'), day('2026-09-11'), day('2026-09-12')], '2026-09-11')).toEqual({ current: 2, longest: 2, practiceDays: 2 }); });
});
