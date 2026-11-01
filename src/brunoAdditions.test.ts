import { describe, expect, it } from 'vitest';
import { createInitialState } from './data';
import { createSession, createBackup, parseBackup } from './domain';
import { migrateState } from './migrations';
import { selectRoutinePlan } from './routinePlans';

function previous() {
 const state=createInitialState();delete state.brunoAdditionsRevision;
 for(const [id,exercise]of [['c','hip-abduction'],['d','decline-situp'],['e','rope-curl']]){
  const w=state.workouts.find(w=>w.id===id)!;w.exercises=w.exercises.filter(e=>e.id!==exercise);
 }
 return state;
}
describe('three requested Bruno additions',()=>{
 it('adds exactly one exercise on Wednesday, Thursday and Friday, leaving Monday and Tuesday untouched',()=>{
  const state=previous(),next=migrateState(state);
  expect(next.workouts.map(w=>w.exercises.length)).toEqual([6,6,7,7,7,2]);
  expect(next.workouts.slice(0,2)).toEqual(state.workouts.slice(0,2));
  expect(next.workouts[0].exercises.find(e=>e.id==='parallel-bar-dips')?.sets).toBe(3);
  expect(next.workouts[2].exercises.find(e=>e.id==='hip-abduction')).toMatchObject({sets:3,image:64});
  expect(next.workouts[3].exercises.find(e=>e.id==='decline-situp')).toMatchObject({sets:3,image:34});
  expect(next.workouts[4].exercises.map(e=>e.id)).toEqual(['assisted-pullup','cable-row','preacher-curl','cable-curl','rope-curl','cable-lateral-raise','face-pull']);
  expect(migrateState(next)).toEqual(next);expect(parseBackup(createBackup(next))).toEqual(next);
 });
 it('keeps existing rope-curl load, session-only extra dips, history and customizations',()=>{
  const state=previous();state.weights['rope-curl']=12;state.workouts[0].name='Peito editado';
  state.active=createSession(state.workouts[0],state.weights);const dips=state.active.exercises.find(e=>e.exerciseId==='parallel-bar-dips')!;dips.done=[true,true,true,true,true,true];
  state.history=[{...structuredClone(state.active),id:'past',finishedAt:Date.now()}];
  const next=migrateState(state);expect(next.active).toEqual(state.active);expect(next.history).toEqual(state.history);expect(next.weights).toEqual(state.weights);expect(next.workouts[0].name).toBe('Peito editado');
  expect(createSession(next.workouts[4],next.weights).exercises.find(e=>e.exerciseId==='rope-curl')?.weight).toBe(12);
 });
 it.each(['sheet','ivan'] as const)('leaves %s active routines unchanged and upgrades only the saved Bruno routine',plan=>{
  const state=selectRoutinePlan(previous(),plan),next=migrateState(state);
  expect(next.workouts).toEqual(state.workouts);expect(next.planSnapshots?.original?.[4].exercises.some(e=>e.id==='rope-curl')).toBe(true);
 });
 it('does not duplicate a manually added exercise or overwrite its series',()=>{
  const state=previous();state.workouts[4].exercises.push({...createInitialState().workouts[4].exercises.find(e=>e.id==='rope-curl')!,sets:4});
  const next=migrateState(state);expect(next.workouts[4].exercises.filter(e=>e.id==='rope-curl')).toHaveLength(1);expect(next.workouts[4].exercises.find(e=>e.id==='rope-curl')?.sets).toBe(4);
 });
});
