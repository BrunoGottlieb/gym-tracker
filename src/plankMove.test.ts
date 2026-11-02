import {it,expect} from 'vitest';
import {createInitialState} from './data';
import {createSession} from './domain';
import {migrateState} from './migrations';
import {selectRoutinePlan} from './routinePlans';
function old(){const s=createInitialState();delete s.brunoPlankRevision;const plank=s.workouts[0].exercises.pop()!;s.workouts[3].exercises.push({...plank,sets:4,target:'45'});s.active=createSession(s.workouts[3],{});s.active.exercises.at(-1)!.done[0]=true;s.active.exercises.at(-1)!.seconds=[35,null,null,null];s.history=[{...structuredClone(s.active),id:'past',finishedAt:Date.now()}];return s;}
it('moves the existing plank once and preserves its custom target and all recorded snapshots',()=>{
 const s=old(),n=migrateState(s);expect(n.workouts[0].exercises.at(-1)).toMatchObject({id:'front-plank',sets:4,target:'45'});expect(n.workouts[3].exercises.some(e=>e.id==='front-plank')).toBe(false);expect(n.active).toEqual(s.active);expect(n.history).toEqual(s.history);expect(migrateState(n)).toEqual(n);
});
it('updates the inactive Bruno plan without changing another person’s routine',()=>{
 const s=old();s.active=null;const nick=selectRoutinePlan(s,'sheet'),n=migrateState(nick);expect(n.workouts).toEqual(nick.workouts);expect(n.planSnapshots!.original![0].exercises.at(-1)!.id).toBe('front-plank');
});
