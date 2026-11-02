import { describe, expect, it } from 'vitest';
import { completedWorkoutAverages, completedWeekdayAverages, muscleOrder, plannedMuscleCounts } from './trainingStats';
import { createInitialState } from './data';
import { createSession, editHistorySession } from './domain';
import type { MuscleGroup, Session } from './types';

function record(day: number, groups: { muscle: MuscleGroup; done: boolean[] }[], month = 9): Session {
  const finishedAt = new Date(2026, month, day, 18).getTime();
  return { id: crypto.randomUUID(), workoutId: 'test', workoutName: 'Sessão registrada', startedAt: finishedAt - 60000, finishedAt,
    exercises: groups.map((group, index) => ({ exerciseId: `test-${index}`, name: 'Exercício', image: 0, target: '12', kind: 'reps', weight: 10, ...group })) };
}

describe('actual sets by workout type',()=>{
 it('groups the same workout across different weekdays, with actual sets and a shared session denominator',()=>{
  const a={...record(19,[{muscle:'chest',done:[true,true,false]}]),workoutId:'a'};
  const a2={...record(21,[{muscle:'chest',done:[true,true,true,true]},{muscle:'abs',done:[true,true]}]),workoutId:'a'};
  const b={...record(19,[{muscle:'back',done:[true]}]),workoutId:'b'};
  const rows=completedWorkoutAverages([a,a2,b],createInitialState().workouts);
  expect(rows.map(r=>r.label)).toEqual(['A','B','C','D','E','CASA']);
  expect(rows[0]).toMatchObject({sessions:2,total:4,averages:{chest:3,abs:1}});
  expect(rows[1]).toMatchObject({sessions:1,total:1});expect(rows[2].sessions).toBe(0);
 });
 it('separates profiles with identical workout IDs, excludes unfinished sessions and retains archived workouts',()=>{
  const a={...record(20,[{muscle:'legs',done:[true,true]}]),workoutId:'a',person:'ivan' as const};
  const old={...record(21,[{muscle:'abs',done:[true]}]),workoutId:'retired',workoutName:'Treino antigo'};
  const active={...old,finishedAt:undefined};const history=[a,old,active],before=structuredClone(history);
  expect(completedWorkoutAverages(history,createInitialState().workouts)[0].total).toBe(0);
  expect(completedWorkoutAverages(history,[], 'ivan')[0]).toMatchObject({workoutId:'a',total:2});
  expect(completedWorkoutAverages(history,[])[0]).toMatchObject({workoutId:'retired',total:1,sessions:1});expect(history).toEqual(before);
 });
});
describe('weekly planned muscle counts', () => {
  it('counts occurrences by primary muscle, including repeated exercises across workouts', () => {
    const state = createInitialState();
    const counts = plannedMuscleCounts(state.workouts);
    expect(counts).toEqual({ chest: 5, back: 5, legs: 7, shoulders: 4, biceps: 5, triceps: 5, abs: 4, other: 0 });
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(35);
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
