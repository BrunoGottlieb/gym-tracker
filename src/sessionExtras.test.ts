import { describe,it,expect } from 'vitest';
import { createInitialState } from './data';
import { beginWorkout,recordHold,swapSessionExercise,finishSession,validateState,addSessionSet,removeSessionSet,createBackup,parseBackup } from './domain';
import { canReplaceEmptyCloudSeed,profileBackup,restoreProfile } from './CloudBackup';
describe('Sustentação, trocas e backup',()=>{
 it('registra segundos reais, mantém alinhamento das séries e sobrevive ao backup',()=>{
  let s=createInitialState();s=beginWorkout(s,s.workouts.find(w=>w.id==='home')!);
  s=recordHold(s,'tuck-front-lever',0,12);s=addSessionSet(s,'tuck-front-lever');s=removeSessionSet(s,'tuck-front-lever');
  expect(s.active!.exercises[0].seconds).toEqual([12,null,null]);expect(validateState(s)).toBe(true);
  s=finishSession(s);expect(parseBackup(createBackup(s)).history[0].exercises[0].seconds![0]).toBe(12);
  expect(recordHold(s,'bench-press',0,10)).toEqual(s);
 });
 it('troca só a sessão, conserva as séries e usa a carga do substituto',()=>{
  let s=createInitialState();s.weights['cable-row']=37;s=beginWorkout(s,s.workouts[0]);const routine=structuredClone(s.workouts);
  const replacement=s.workouts[4].exercises.find(e=>e.id==='cable-row')!;
  s=swapSessionExercise(s,'bench-press',replacement);
  expect(s.active!.exercises[0].weight).toBe(37);expect(s.active!.exercises[0].swappedFrom).toContain('Supino');expect(s.workouts).toEqual(routine);
  expect(validateState(s)).toBe(true);
  const duplicate=swapSessionExercise(s,'pec-deck',replacement);expect(duplicate).toBe(s);
  s.active!.exercises[0].done[0]=true;expect(swapSessionExercise(s,'cable-row',routine[0].exercises[0])).toBe(s);
 });
 it('restaura somente o perfil selecionado e rejeita perfil diferente',()=>{
  const s=createInitialState();const other={id:'nick',person:'sheet' as const,workoutId:'a',workoutName:'Nick',startedAt:10,finishedAt:20,exercises:[]};
  s.history.push(other);const payload=profileBackup(s);expect(JSON.parse(payload).data.history).toEqual([]);
  const restored=restoreProfile(s,payload);expect(restored.history).toContainEqual(other);
  expect(()=>restoreProfile({...s,selectedPlan:'ivan'},payload)).toThrow();
 });
});

it('only fills empty cloud seeds automatically; protects existing history and loads',()=>{
 const seed=createInitialState(),phone=createInitialState();phone.weights['bench-press']=35;
 expect(canReplaceEmptyCloudSeed(createBackup(seed),profileBackup(phone))).toBe(true);
 seed.weights['bench-press']=10;expect(canReplaceEmptyCloudSeed(createBackup(seed),profileBackup(phone))).toBe(false);
 expect(canReplaceEmptyCloudSeed(createBackup(createInitialState()),createBackup({...phone,selectedPlan:'ivan'}))).toBe(false);
});

it.each(['sheet','ivan'] as const)('allows %s phone progress to replace its own empty seed, without crossing profiles',person=>{
 const seed={...createInitialState(),selectedPlan:person},phone={...createInitialState(),selectedPlan:person};phone.weights['bench-press']=15;
 expect(canReplaceEmptyCloudSeed(createBackup(seed),profileBackup(phone))).toBe(true);
 expect(canReplaceEmptyCloudSeed(createBackup({...seed,selectedPlan:'original'}),profileBackup(phone))).toBe(false);
});
