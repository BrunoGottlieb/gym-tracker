import { describe,it,expect } from 'vitest';
import { createInitialState } from './data';
import { addSessionExercise,beginWorkout,recordHold,swapSessionExercise,finishSession,validateState,addSessionSet,removeSessionSet,createBackup,parseBackup } from './domain';
import { canReplaceEmptyCloudSeed,profileBackup,restoreProfile } from './CloudBackup';
import { selectRoutinePlan } from './routinePlans';
import { copyPreset, exerciseLibrary } from './exerciseLibrary';
describe('Sustentação, trocas e backup',()=>{
 it('registra os lados da prancha separadamente e só inicia o descanso ao completar os dois',()=>{
  const nick=selectRoutinePlan(createInitialState(),'sheet');
  let state=beginWorkout(nick,nick.workouts.find(workout=>workout.id==='e')!);
  state.preferences.autoRest=true;
  state=recordHold(state,'side-plank',0,20,45,1000,'left');
  expect(state.timer.started).toBe(false);
  expect(state.active!.exercises.find(e=>e.exerciseId==='side-plank')!.done[0]).toBe(false);
  state=recordHold(state,'side-plank',0,24,45,2000,'right');
  expect(state.timer.endAt).toBe(47000);
  state=addSessionSet(state,'side-plank');state=removeSessionSet(state,'side-plank');
  const history=parseBackup(createBackup(finishSession(state))).history[0];
  expect(history.exercises.find(e=>e.exerciseId==='side-plank')).toMatchObject({
   done:[true,false,false],secondsBySide:{left:[20,null,null],right:[24,null,null]},
  });
 });
 it('guarda um exercício extra na sessão e no histórico, com a própria carga',()=>{
  const state=createInitialState(), workout=state.workouts[0];
  const extra=copyPreset(exerciseLibrary.find(e=>e.id==='cable-row')!);
  state.weights[extra.id]=35;
  const next=addSessionExercise(state,workout,extra);
  expect(next.workouts).toEqual(state.workouts);
  expect(next.active?.exercises.at(-1)).toMatchObject({exerciseId:extra.id,weight:35,extra:true});
  expect(addSessionExercise(next,workout,extra)).toBe(next);
  expect(addSessionExercise(next,state.workouts[1],extra)).toBe(next);
  next.active!.exercises.at(-1)!.done[0]=true;
  const restored=parseBackup(createBackup(finishSession(next)));
  expect(restored.history[0].exercises.at(-1)).toMatchObject({exerciseId:extra.id,extra:true});
  expect(beginWorkout(restored,workout).active!.exercises.some(e=>e.exerciseId===extra.id)).toBe(false);
 });
 it('inicia descanso ao concluir sustentação, mas não ao corrigir uma série já feita',()=>{
  let s=createInitialState();s.preferences.autoRest=true;s=beginWorkout(s,s.workouts.find(w=>w.id==='home')!);
  s.active!.exercises[0].holdStartedAt=1000;
  s=recordHold(s,'tuck-front-lever',0,12,120,13000);
  expect(s.timer).toEqual({duration:120,remaining:120,endAt:133000,exercise:'Tuck front lever',started:true});
  expect(s.active!.exercises[0].holdStartedAt).toBeUndefined();
  const timer=s.timer;s=recordHold(s,'tuck-front-lever',0,15,120,15000);expect(s.timer).toBe(timer);
  s.preferences.autoRest=false;s=recordHold(s,'tuck-front-lever',1,10,120,20000);expect(s.timer).toBe(timer);
  expect(s.active!.exercises[0].done).toEqual([true,true,false]);
 });
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
