import { describe, expect, it } from 'vitest';
import { createInitialState } from './data';
import { createSession } from './domain';
import { weekStart, shiftWeek, weeklyReview } from './weeklyReviewStats';

const now = new Date(2026, 10, 21, 18).getTime();
function session(id: string, day: number, sets = 3) {
  const state = createInitialState();
  const log = createSession(state.workouts[0], {}, new Date(2026, 10, day, 9).getTime());
  log.id = id; log.person = 'original'; log.xpRules = 2;
  log.finishedAt = log.startedAt + 3600000;
  log.exercises = [{ ...log.exercises[0], muscle: 'chest', done: Array(sets).fill(true), plannedSets: 3 }];
  return log;
}
describe('weekly review of recorded activity', () => {
  it('uses Sunday boundaries, unique finished sessions, real sets and distinct training days', () => {
    const state = createInitialState();
    const a = session('a', 15, 4); a.exercises[0].xpBoost = true;
    const b = session('b', 15); b.startedAt += 3600000; b.finishedAt = b.startedAt + 1800000;
    const other = { ...session('nick', 16), person: 'sheet' as const };
    const unfinished = session('active', 17); delete unfinished.finishedAt;
    const empty = session('empty', 18); empty.exercises[0].done.fill(false);
    state.history = [a, b, a, other, unfinished, empty, session('previous', 14), session('future', 22)];
    state.preferences.weeklyGoals = { original: 2 };
    state.avatarWallets!.original = { awards: { a: 52, b: 0 }, purchases: { 'head:cap': 3 }, gifts: [] };
    const r = weeklyReview(state, now, now);
    expect(r.sessions.map(s => s.id)).toEqual(['b', 'a']);
    expect(r.days).toBe(1); expect(r.target).toBe(2);
    expect(r.sets).toBe(7); expect(r.volume.chest.completedSets).toBe(7);
    expect(r.minutes).toBe(90); expect(r.xp).toBe(95);
    expect(r.coins).toBe(52); // Earned ledger amounts survive spending and zero awards.
    expect(r.calendar[0].sessions).toHaveLength(2);
    expect(r.calendar).toHaveLength(7);
    expect(new Date(r.start).getDay()).toBe(0);
  });
  it('shows historical weeks separately and uses the saved exercise snapshots', () => {
    const state = createInitialState();
    state.history = [session('old', 14), session('current', 15)];
    state.workouts = [];
    const review = weeklyReview(state, shiftWeek(weekStart(now), -1), now);
    expect(review.sessions.map(s => s.id)).toEqual(['old']);
    expect(review.volume.chest.completedSets).toBe(3);
    expect(review.coins).toBe(8);
    expect(weeklyReview({ ...state, selectedPlan: 'sheet' }, now, now).sets).toBe(0);
    expect(shiftWeek(shiftWeek(weekStart(now), -1), 1)).toBe(weekStart(now));
  });
  it('does not count training before the XP reset as freshly earned rewards', () => {
    const state = createInitialState(); state.history = [session('old', 12)];
    const review = weeklyReview(state, shiftWeek(now, -1), now);
    expect(review.sets).toBe(3); expect(review.xp).toBe(0); expect(review.coins).toBe(0);
  });
});
