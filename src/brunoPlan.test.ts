import { describe, expect, it } from 'vitest';
import { createInitialState, createLegacyState, initialWorkouts } from './data';
import { migrateState } from './migrations';
import { createSession, createBackup, parseBackup, validateState } from './domain';
import { selectRoutinePlan } from './routinePlans';
import { exerciseLibrary } from './exerciseLibrary';
import { plannedMuscleCounts } from './trainingStats';

describe('Bruno balanced plan', () => {
  it('uses the agreed the agreed exercises and exact series, without a second leg day', () => {
    const state=createInitialState();
    expect(state.workouts.slice(0,5).map(w=>w.exercises.map(e=>e.sets))).toEqual([[3,3,3,3,3,3,3],[3,3,3,3,3,3],[3,3,3,3,3,3,4],[3,3,3,3,3,3],[3,3,3,3,3,3,3]]);
    expect(state.workouts.filter(w=>w.name==='Pernas')).toHaveLength(1);
    expect(state.workouts.flatMap(w=>w.exercises).filter(e=>e.id==='assisted-pullup')).toHaveLength(2);
    expect(state.workouts.flatMap(w=>w.exercises).some(e=>['lat-pulldown','straight-arm-pulldown','overhead-extension'].includes(e.id))).toBe(false);
    expect(plannedMuscleCounts(state.workouts)).toMatchObject({chest:5,back:5,shoulders:4,biceps:5,triceps:5,legs:7,abs:4});
    expect(validateState(state)).toBe(true);
    expect(parseBackup(createBackup(state))).toEqual(state);
  });
  it('updates an old installation once, preserving all loads, notes, active snapshots, history and timer', () => {
    const old=createLegacyState(); old.weights={'lat-pulldown':50,'pullup':7,'bench-press':40};old.exerciseNotes={'bench-press':'Banco 3'};
    old.active=createSession(old.workouts[1],old.weights);old.active.exercises[0].done[1]=true;
    old.history=[{...structuredClone(old.active),id:'recorded',finishedAt:Date.now()}];
    const next=migrateState(old);
    expect(next.workouts).toEqual(initialWorkouts);
    for(const key of ['weights','exerciseNotes','active','history','timer'] as const)expect(next[key]).toEqual(old[key]);
    expect(createSession(next.workouts[1],next.weights).exercises[0].weight).toBe(0);
    next.workouts[0].exercises[1].sets=4;next.workouts[0].name='Meu peito';
    expect(migrateState(next)).toEqual(next);
    expect(parseBackup(createBackup(next))).toEqual(next);
  });
  it.each(['sheet','ivan'] as const)('updates the inactive Bruno snapshot without changing %s', plan => {
    const old=selectRoutinePlan(createLegacyState(),plan),next=migrateState(old);
    expect(next.workouts).toEqual(old.workouts);expect(next.planSnapshots?.original).toEqual(initialWorkouts);
    expect(migrateState(next)).toEqual(next);expect(selectRoutinePlan(next,'original').workouts).toEqual(initialWorkouts);
  });
  it('retains retired exercises in the catalog and keeps assisted pullups distinct from pulley and free pullups', () => {
    for(const id of ['assisted-pullup','face-pull','lat-pulldown','pullup','straight-arm-pulldown','overhead-extension','incline-dumbbell'])expect(exerciseLibrary.some(e=>e.id===id)).toBe(true);
    const state=createInitialState();state.weights['lat-pulldown']=60;state.weights['pullup']=10;state.weights['assisted-pullup']=25;
    expect(createSession(state.workouts[1],state.weights).exercises[0].weight).toBe(25);
    expect(createSession(state.workouts[4],state.weights).exercises[0].weight).toBe(25);
  });
});
