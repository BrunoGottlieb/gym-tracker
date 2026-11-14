import { describe, expect, it } from 'vitest';
import { completedWeeklyMuscleCounts, weeklyMuscleVolume, completedWorkoutAverages, completedWeekdayAverages, muscleOrder, plannedMuscleCounts } from './trainingStats';
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
  it('compares weekly sets by exercise, merging repeated planned appearances, extras, partials and canonical aliases', () => {
    const state = createInitialState(), now = new Date(2026, 10, 13, 20).getTime();
    const bench = state.workouts[0].exercises[0], pec = state.workouts[0].exercises.find(e => e.id === 'pec-deck')!;
    const row = state.workouts[1].exercises.find(e => e.id === 'chest-supported-row')!;
    const calf = state.workouts[2].exercises.find(e => e.id === 'calf-raise')!;
    const workouts = [{ ...state.workouts[0], exercises: [bench, pec] }, { ...state.workouts[3], exercises: [bench, row, calf] }];
    const session = record(11, [{ muscle: 'chest', done: [true, true, true, true, true, true] }, { muscle: 'chest', done: [true, true, false] }, { muscle: 'chest', done: [true, true, true, true] }, { muscle: 'back', done: [true, true, false] }], 10);
    session.exercises[0].exerciseId = 'bench-press'; session.exercises[1].exerciseId = 'bench-press';
    session.exercises[2].exerciseId = 'custom-extra'; session.exercises[2].extra = true;
    session.exercises[3].exerciseId = 'supported-row';
    const repeated = { ...session, id: 'repeated-session', exercises: [session.exercises[1]] };
    session.exercises.splice(1, 1);
    const before = structuredClone({ workouts, session, repeated });
    const volume = weeklyMuscleVolume(workouts, [session, repeated, { ...session, id: 'nick', person: 'sheet' }], 'original', now);
    expect(volume.chest).toMatchObject({ plannedSets: 9, completedSets: 12 });
    expect(volume.chest.exercises.find(e => e.id === 'bench-press')).toMatchObject({ plannedSets: 6, completedSets: 8 });
    expect(volume.chest.exercises.find(e => e.id === 'pec-deck')).toMatchObject({ plannedSets: 3, completedSets: 0, sessions: [] });
    expect(volume.chest.exercises.find(e => e.id === 'custom-extra')).toMatchObject({ plannedSets: 0, completedSets: 4, sessions: [{ sets: 4, extra: true }] });
    expect(volume.back.exercises).toHaveLength(1);
    expect(volume.back.exercises[0]).toMatchObject({ id: 'chest-supported-row', plannedSets: 3, completedSets: 2 });
    expect(volume.legs.plannedSets).toBe(4);
    expect({ workouts, session, repeated }).toEqual(before);
  });
  it('counts actual sets as three-set equivalents from Sunday to now, with profile/date isolation and no duplicate sessions', () => {
    const now = new Date(2026, 10, 13, 20).getTime();
    const sunday = record(8, [{ muscle: 'chest', done: [true, true, true] }, { muscle: 'triceps', done: [true, false, false] }], 10);
    const otherDay = record(10, [{ muscle: 'chest', done: [true] }, { muscle: 'abs', done: [true, true] }], 10);
    const nick = { ...otherDay, id: 'nick', person: 'sheet' as const };
    const previousWeek = record(7, [{ muscle: 'legs', done: [true] }], 10);
    const future = record(14, [{ muscle: 'back', done: [true] }], 10);
    const active = { ...otherDay, id: 'active', finishedAt: undefined };
    const history = [sunday, sunday, otherDay, nick, previousWeek, future, active], before = structuredClone(history);
    expect(completedWeeklyMuscleCounts(history, 'original', now)).toEqual({ chest: 4 / 3, triceps: 1 / 3, biceps: 0, legs: 0, shoulders: 0, back: 0, abs: 2 / 3, other: 0 });
    expect(completedWeeklyMuscleCounts(history, 'sheet', now).chest).toBe(1 / 3);
    expect(history).toEqual(before);
    const edited = { ...otherDay, exercises: otherDay.exercises.map(log => ({ ...log, muscle: 'other' as const })) };
    expect(completedWeeklyMuscleCounts([edited], 'original', now).other).toBe(1);
    expect(completedWeeklyMuscleCounts(history, 'original', new Date(2026, 10, 15, 0).getTime()).chest).toBe(0);
  });
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
