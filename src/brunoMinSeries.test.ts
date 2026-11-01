import { describe, expect, it } from 'vitest';
import { createInitialState } from './data';
import { createSession, parseBackup, createBackup } from './domain';
import { migrateState } from './migrations';
import { selectRoutinePlan } from './routinePlans';
function previous() {
 const state=createInitialState();delete state.brunoSeriesRevision;
 for(const w of state.workouts)for(const e of w.exercises)e.sets=2;
 state.workouts[0].exercises[1]={...state.workouts[0].exercises[1],id:'incline-machine',name:'Supino inclinado com barra',image:30};
 return state;
}
describe('Bruno minimum planned series and dumbbell incline',()=>{
 it('updates planned series only, preserves 4+ sets, and does not transfer barbell load into dumbbell load',()=>{
  const old=previous();old.workouts[0].exercises[0].sets=5;old.weights={'incline-machine':50,'incline-dumbbell':18};
  old.active=createSession(old.workouts[0],old.weights);old.active.exercises[1].done[0]=true;old.history=[{...structuredClone(old.active),id:'old',finishedAt:Date.now()}];
  const next=migrateState(old);
  expect(next.workouts.flatMap(w=>w.exercises).every(e=>e.sets>=3)).toBe(true);expect(next.workouts[0].exercises[0].sets).toBe(5);
  expect(next.workouts[0].exercises[1]).toMatchObject({id:'incline-dumbbell',image:21,name:'Supino inclinado com halteres'});
  expect(createSession(next.workouts[0],next.weights).exercises[1].weight).toBe(18);
  expect(next.active).toEqual(old.active);expect(next.history).toEqual(old.history);expect(next.weights).toEqual(old.weights);
  expect(migrateState(next)).toEqual(next);expect(parseBackup(createBackup(next))).toEqual(next);
 });
 it.each(['sheet','ivan'] as const)('preserves %s while upgrading the inactive Bruno plan',plan=>{
  const old=selectRoutinePlan(previous(),plan),next=migrateState(old);
  expect(next.workouts).toEqual(old.workouts);expect(next.planSnapshots?.original?.flatMap(w=>w.exercises).every(e=>e.sets>=3)).toBe(true);
  expect(next.planSnapshots?.original?.[0].exercises[1].id).toBe('incline-dumbbell');
 });
});
