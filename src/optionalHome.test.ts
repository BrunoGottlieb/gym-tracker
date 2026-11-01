import { describe, expect, it } from 'vitest';
import { createInitialState, optionalHomeWorkout } from './data';
import { createSession, createBackup, parseBackup, validateState } from './domain';
import { migrateState } from './migrations';
import { selectRoutinePlan } from './routinePlans';
import { scheduledTrainingDays, sharedStreak } from './streaks';

function previousState() { const state=createInitialState();delete state.brunoHomeRevision;state.workouts=state.workouts.filter(w=>w.id!=='home');return state; }
describe('optional Saturday at home',()=>{
 it('is a sixth optional workout with timed tuck and controlled hanging raises',()=>{
  const state=createInitialState(),home=state.workouts.find(w=>w.id==='home')!;
  expect(home).toMatchObject({day:6,optional:true});
  expect(home.exercises.map(e=>[e.id,e.sets,e.kind])).toEqual([['tuck-front-lever',3,'seconds'],['hanging-leg-raise',3,'reps']]);
  expect(parseBackup(createBackup(state))).toEqual(state);
 });
 it('appends once without changing customized weekdays, remembered data, ongoing or recorded sessions',()=>{
  const state=previousState();state.workouts[0].exercises[0].sets=4;state.workouts[0].name='Peito editado';state.weights['bench-press']=55;
  state.active=createSession(state.workouts[0],state.weights);state.history=[{...structuredClone(state.active),id:'past',finishedAt:Date.now()}];
  const next=migrateState(state);
  expect(next.workouts.slice(0,5)).toEqual(state.workouts);expect(next.workouts[5]).toEqual(optionalHomeWorkout);
  expect(next.active).toEqual(state.active);expect(next.history).toEqual(state.history);expect(next.weights).toEqual(state.weights);
  next.workouts[5].name='Casa editada';expect(migrateState(next)).toEqual(next);
  expect(validateState({...next,workouts:[{...optionalHomeWorkout,optional:'yes'}]})).toBe(false);
 });
 it.each(['sheet','ivan'] as const)('updates an inactive Bruno snapshot without changing %s',plan=>{
  const state=selectRoutinePlan(previousState(),plan),next=migrateState(state);
  expect(next.workouts).toEqual(state.workouts);expect(next.planSnapshots?.original?.at(-1)).toEqual(optionalHomeWorkout);
 });
 it('excludes optional weekdays from the schedule but credits completed optional workouts',()=>{
  const days=scheduledTrainingDays(createInitialState().workouts);expect(days).toEqual([1,2,3,4,5]);
  const schedule={original:days,sheet:days,ivan:days};
  expect(sharedStreak([{person:'original',date:'2026-10-30'}],schedule,'2026-11-01')).toMatchObject({current:1,restToday:true});
  expect(sharedStreak([{person:'original',date:'2026-10-30'},{person:'original',date:'2026-10-31'}],schedule,'2026-11-01').current).toBe(2);
 });
});
