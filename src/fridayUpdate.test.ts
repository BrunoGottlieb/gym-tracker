import { describe, expect, it } from 'vitest';
import { createInitialState } from './data';
import { createSession, createBackup, parseBackup } from './domain';
import { migrateState } from './migrations';
import { exerciseLibrary, copyPreset } from './exerciseLibrary';
import { selectRoutinePlan } from './routinePlans';

function oldFriday() {
  const state = createInitialState();
  delete state.brunoFridayRevision;
  const friday = state.workouts[4];
  friday.image = 36;
  friday.exercises[4] = copyPreset(exerciseLibrary.find(e => e.id === 'incline-curl')!);
  state.weights['incline-curl'] = 18;
  state.weights['preacher-curl'] = 25;
  return state;
}
describe('Bruno Friday Scott update', () => {
  it('replaces the dumbbell curl and cover, sharing existing Scott load while preserving snapshots', () => {
    const state = oldFriday();
    state.active = createSession(state.workouts[4], state.weights);
    state.active.exercises[4].done[0] = true;
    state.history = [{ ...structuredClone(state.active), id: 'past', finishedAt: state.active.startedAt + 60000 }];
    const next = migrateState(state);
    expect(next.workouts[4].exercises.map(e => e.id)).toEqual(['lat-pulldown', 'chest-supported-row', 'cable-row', 'straight-arm-pulldown', 'preacher-curl', 'cable-curl']);
    expect(next.workouts[4].image).toBe(10);
    expect(next.workouts[4].exercises[4].sets).toBe(3);
    expect(createSession(next.workouts[4], next.weights).exercises[4].weight).toBe(25);
    expect(next.weights).toEqual(state.weights);
    expect(next.active).toEqual(state.active);
    expect(next.history).toEqual(state.history);
    expect(next.workouts.slice(0, 4)).toEqual(state.workouts.slice(0, 4));
    expect(parseBackup(createBackup(next))).toEqual(next);
  });
  it('updates an inactive saved Bruno routine while preserving Nick and allows later custom covers', () => {
    const state = selectRoutinePlan(oldFriday(), 'sheet');
    const next = migrateState(state);
    expect(next.workouts).toEqual(state.workouts);
    expect(next.planSnapshots?.original?.[4].image).toBe(10);
    expect(next.planSnapshots?.original?.[4].exercises[4].id).toBe('preacher-curl');
    expect(migrateState(next)).toEqual(next);
    next.planSnapshots!.original![4].image = 26;
    expect(migrateState(next).planSnapshots?.original?.[4].image).toBe(26);
  });
  it('does not duplicate Scott if it is already in Friday', () => {
    const state = oldFriday();
    state.workouts[4].exercises.push(copyPreset(exerciseLibrary.find(e => e.id === 'preacher-curl')!));
    const next = migrateState(state);
    expect(next.workouts[4].exercises.filter(e => e.id === 'preacher-curl')).toHaveLength(1);
    expect(next.workouts[4].exercises.some(e => e.id === 'incline-curl')).toBe(false);
    expect(next.workouts[4].image).toBe(10);
  });
});
