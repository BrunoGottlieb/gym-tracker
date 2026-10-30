import { describe, expect, it } from 'vitest';
import { completedWeekdayAverages, muscleOrder, plannedMuscleCounts } from './trainingStats';
import { createInitialState } from './data';
import { createSession, editHistorySession } from './domain';
import type { MuscleGroup, Session } from './types';

function record(day: number, groups: { muscle: MuscleGroup; done: boolean[] }[], month = 9): Session {
  const finishedAt = new Date(2026, month, day, 18).getTime();
  return { id: crypto.randomUUID(), workoutId: 'test', workoutName: 'Sessão registrada', startedAt: finishedAt - 60000, finishedAt,
    exercises: groups.map((group, index) => ({ exerciseId: `test-${index}`, name: 'Exercício', image: 0, target: '12', kind: 'reps', weight: 10, ...group })) };
}
describe('weekly planned muscle counts', () => {
  it('counts occurrences by primary muscle, including repeated exercises across workouts', () => {
    const state = createInitialState();
    const counts = plannedMuscleCounts(state.workouts);
    expect(counts).toEqual({ chest: 5, back: 8, legs: 6, shoulders: 2, biceps: 4, triceps: 5, abs: 0, other: 0 });
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(30);
    state.workouts[4].exercises = [];
    expect(plannedMuscleCounts(state.workouts).biceps).toBe(2);
  });
  it('handles customized muscle groups and unknown custom exercises', () => {
    const state = createInitialState(); state.workouts = [state.workouts[0]];
    state.workouts[0].exercises = [{ ...state.workouts[0].exercises[0], muscle: 'abs' }, { ...state.workouts[0].exercises[0], id: 'unknown', muscle: undefined }];
    expect(plannedMuscleCounts(state.workouts)).toMatchObject({ abs: 1, other: 1, chest: 0 });
  });
});
describe('actual completed series weekday averages', () => {
  it('uses done flags, real dates and a common recorded-day denominator for stacked muscle averages', () => {
    // Oct19 and26 are Mondays; Oct20 is Tuesday. Two sessions on19 must share one date.
    const monday1 = record(19, [{ muscle: 'chest', done: [true, true, false, false, false] }]);
    const sameDate = record(19, [{ muscle: 'triceps', done: [true, false, true] }]);
    const monday2 = record(26, [{ muscle: 'chest', done: [true, true, true, true] }]);
    const tuesday = record(20, [{ muscle: 'legs', done: [true, false, false] }]);
    const rows = completedWeekdayAverages([monday1, sameDate, monday2, tuesday]);
    expect(rows.map(row => row.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(rows[1].days).toBe(2);
    expect(rows[1].averages).toMatchObject({ chest: 3, triceps: 1 });
    expect(rows[1].total).toBe(4);
    expect(rows[2]).toMatchObject({ days: 1, total: 1 });
    expect(rows[0]).toMatchObject({ days: 0, total: 0 });
    expect(muscleOrder.reduce((sum, group) => sum + rows[1].averages[group], 0)).toBe(rows[1].total);
  });
  it('excludes active/unfinished sessions and uses snapshot muscles instead of the current plan', () => {
    const state = createInitialState();
    const active = createSession(state.workouts[0], {}); active.exercises.forEach(e => e.done.fill(true));
    const old = record(20, [{ muscle: 'abs', done: [true, true, false] }]);
    state.workouts[0].exercises = [];
    const result = completedWeekdayAverages([active, old]);
    expect(result.reduce((sum, row) => sum + row.days, 0)).toBe(1);
    expect(result[2].averages.abs).toBe(2);
    expect(result[2].averages.chest).toBe(0);
  });
  it('updates averages after corrections to the date, completed series or muscular group', () => {
    const state = createInitialState();
    const session = record(19, [{ muscle: 'legs', done: [true, true, false] }]);
    state.history = [session];
    const corrected = structuredClone(session);
    corrected.startedAt = new Date(2026, 9, 21, 18).getTime(); corrected.finishedAt = corrected.startedAt + 60000;
    corrected.exercises[0].muscle = 'back'; corrected.exercises[0].done = [true, true, true, true];
    const next = editHistorySession(state, corrected);
    const rows = completedWeekdayAverages(next.history);
    expect(rows[1].days).toBe(0);
    expect(rows[3]).toMatchObject({ days: 1, total: 4 });
    expect(rows[3].averages.back).toBe(4);
  });
  it('is read-only, safe for empty history, and includes zeroes for recorded days without a group', () => {
    const history = [record(19, [{ muscle: 'legs', done: [false, false] }]), record(26, [{ muscle: 'chest', done: [true] }])];
    const before = structuredClone(history);
    expect(completedWeekdayAverages(history)[1].averages.chest).toBe(.5);
    expect(history).toEqual(before);
    expect(completedWeekdayAverages([]).every(row => row.days === 0 && row.total === 0)).toBe(true);
  });
});
