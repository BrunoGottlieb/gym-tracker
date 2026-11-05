import { describe, expect, it } from 'vitest';
import { brazilianHolidays, holidayName } from './holidays';
import { defaultTrainingDays, sharedStreak, streakSummary } from './streaks';

describe('holiday calendar and protected streak days', () => {
  it('covers the ten national holidays, including movable Good Friday across years', () => {
    expect(brazilianHolidays(2026).size).toBe(10);
    expect(holidayName('2026-11-02')).toBe('Finados');
    expect(holidayName('2026-11-20')).toContain('Consciência Negra');
    expect(holidayName('2026-04-03')).toBe('Sexta-feira Santa');
    expect(holidayName('2027-03-26')).toBe('Sexta-feira Santa');
    expect(holidayName('2025-04-18')).toBe('Sexta-feira Santa');
    expect(holidayName('2026-02-17')).toBeUndefined(); // Carnival is optional.
    expect(holidayName('2023-11-20')).toBeUndefined();
  });
  it('preserves the shared flame through a holiday even when people are scheduled', () => {
    const days = [{ person: 'ivan' as const, date: '2026-10-31' }];
    expect(sharedStreak(days, defaultTrainingDays, '2026-11-02')).toMatchObject({ current: 1, restToday: true });
    expect(sharedStreak(days, defaultTrainingDays, '2026-11-03')).toMatchObject({ current: 1, best: 1 });
    expect(sharedStreak(days, defaultTrainingDays, '2026-11-04')).toMatchObject({ current: 0, best: 1 });
  });
  it('adds no free days, but credits a real holiday workout once', () => {
    expect(streakSummary(['2026-11-19'], [1, 2, 3, 4, 5], '2026-11-23').current).toBe(1);
    expect(streakSummary(['2026-11-19', '2026-11-20', '2026-11-20'], [1, 2, 3, 4, 5], '2026-11-23').current).toBe(2);
  });
  it('preserves the holiday and rest-day gap across the year boundary', () => {
    expect(streakSummary(['2026-12-31', '2027-01-04'], [1, 2, 3, 4, 5], '2027-01-04')).toMatchObject({ current: 2, best: 2 });
  });
});
