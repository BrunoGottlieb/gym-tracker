import { describe, expect, it } from 'vitest';
import { createInitialState } from './data';
import { createSession, finishSession } from './domain';
import { currentLoad, exerciseEntries, loadPoints } from './progression';

describe('load progression', () => {
  it('uses chronologically sorted completed-session loads and excludes unperformed exercises', () => {
    let state = createInitialState();
    state.active = createSession(state.workouts[0], { 'bench-press': 40, 'pec-deck': 100 }, 1000);
    state.active.exercises[0].done[0] = true;
    state = finishSession(state, 2000);
    state.active = createSession(state.workouts[0], { 'bench-press': 45 }, 3000);
    state.active.exercises[0].done[1] = true;
    state.active.exercises[0].done[2] = true;
    state = finishSession(state, 4000);
    expect(loadPoints(state, 'bench-press').map(p => [p.at, p.weight, p.completed])).toEqual([[2000, 40, 1], [4000, 45, 2]]);
    expect(loadPoints(state, 'pec-deck')).toEqual([]);
  });
  it('keeps the current saved weight independent of the most recent completed session', () => {
    let state = createInitialState();
    state.active = createSession(state.workouts[0], { 'bench-press': 45 }, 1000);
    state.active.exercises[0].done[0] = true;
    state = finishSession(state, 2000);
    expect(currentLoad(state, 'bench-press')).toBe(45);
    state.weights['bench-press'] = 42.5;
    expect(currentLoad(state, 'bench-press')).toBe(42.5);
    state.weights['bench-press'] = 0;
    expect(currentLoad(state, 'bench-press')).toBe(0);
  });
  it('keeps past exercises discoverable after an exercise replacement', () => {
    let state = createInitialState();
    state.active = createSession(state.workouts[0], {}, 1000);
    state.active.exercises[0].done[0] = true;
    state = finishSession(state, 2000);
    state.workouts[0].exercises.shift();
    expect(exerciseEntries(state).find(e => e.id === 'bench-press')?.archived).toBe(true);
    expect(loadPoints(state, 'bench-press')).toHaveLength(1);
  });
  it('shares remembered pulley loads across days and deduplicates the exercise selector', () => {
    const state = createInitialState();
    state.weights['lat-pulldown'] = 50;
    const tuesday = createSession(state.workouts[1], state.weights);
    const friday = createSession(state.workouts[4], state.weights);
    expect(tuesday.exercises.find(e => e.exerciseId === 'lat-pulldown')?.weight).toBe(50);
    expect(friday.exercises.find(e => e.exerciseId === 'lat-pulldown')?.weight).toBe(50);
    expect(exerciseEntries(state).filter(e => e.id === 'lat-pulldown')).toHaveLength(1);
  });
  it('shares Hammer row loads across days and includes the previous identifier in progression', () => {
    let state = createInitialState();
    state.weights['chest-supported-row'] = 35;
    expect(createSession(state.workouts[4], state.weights).exercises.find(e => e.exerciseId === 'chest-supported-row')?.weight).toBe(35);
    state.active = createSession(state.workouts[4], state.weights, 1000);
    const log = state.active.exercises.find(e => e.exerciseId === 'chest-supported-row')!;
    log.exerciseId = 'supported-row';
    log.done[0] = true;
    state = finishSession(state, 2000);
    expect(loadPoints(state, 'chest-supported-row')[0].weight).toBe(35);
    expect(exerciseEntries(state).filter(e => e.id === 'chest-supported-row')).toHaveLength(1);
  });
});
