import { describe, expect, it } from 'vitest';
import { createInitialState } from './data';
import { beginWorkout, createBackup, createSession, finishSession, getProgress, parseBackup, timerSeconds } from './domain';

describe('workout sessions', () => {
  it('starts on the selected series with remembered load and automatic rest', () => {
    const state = createInitialState();
    state.weights['lat-pulldown'] = 30;
    state.preferences.autoRest = true;
    const next = beginWorkout(state, state.workouts[1], { exerciseId: 'lat-pulldown', index: 1 }, 1000);
    expect(state.active).toBeNull();
    expect(next.active?.exercises[0]).toMatchObject({ weight: 30, done: [false, true, false] });
    expect(next.active?.startedAt).toBe(1000);
    expect(next.timer).toMatchObject({ endAt: 91000, started: true, exercise: 'Puxada alta (pulley)' });
  });
  it('replaces a session only when explicitly called without mutating its original state or history', () => {
    const state = createInitialState();
    state.weights['bench-press'] = 45;
    state.active = createSession(state.workouts[0], state.weights, 1000);
    state.active.exercises[0].done[0] = true;
    const original = structuredClone(state);
    const next = beginWorkout(state, state.workouts[1], { exerciseId: 'lat-pulldown', index: 2 }, 2000);
    expect(state).toEqual(original);
    expect(next.active?.workoutId).toBe('b');
    expect(next.active?.exercises[0].done).toEqual([false, false, true]);
    expect(next.weights).toEqual(original.weights);
    expect(next.history).toEqual(original.history);
    expect(next.timer.endAt).toBeNull();
  });
  it('uses one remembered load per exercise and independent completion for every planned set', () => {
    const state = createInitialState();
    const session = createSession(state.workouts[0], { 'bench-press': 42.5 });
    expect(session.exercises[0].weight).toBe(42.5);
    expect(session.exercises[0].done).toEqual([false, false, false]);
    expect(session.exercises[2].done).toHaveLength(3);
    expect(getProgress(session)).toEqual({ done: 0, total: 18 });
    session.exercises[0].done[1] = true;
    expect(getProgress(session)).toEqual({ done: 1, total: 18 });
    expect(session.exercises[1].weight).toBe(0);
  });
  it('finishes a partial session without counting unmarked sets, and keeps a historical snapshot', () => {
    const state = createInitialState();
    state.active = createSession(state.workouts[0], { 'bench-press': 40 }, 1000);
    state.active.exercises[0].done[0] = true;
    const next = finishSession(state, 2000);
    expect(next.active).toBeNull();
    expect(next.history[0].finishedAt).toBe(2000);
    expect(getProgress(next.history[0])).toEqual({ done: 1, total: 18 });
    state.workouts[0].exercises[0].name = 'Changed routine';
    state.weights['bench-press'] = 50;
    expect(next.history[0].exercises[0].name).toBe('Supino reto com barra');
    expect(next.history[0].exercises[0].weight).toBe(40);
  });
  it('does not turn an empty session into a completed workout', () => {
    const state = createInitialState();
    state.active = createSession(state.workouts[0], {});
    expect(finishSession(state)).toBe(state);
  });
});

describe('rest timer', () => {
  it('recomputes remaining time after backgrounding or a reload from an absolute timestamp', () => {
    const timer = { duration: 90, remaining: 90, endAt: 91000, exercise: '', started: true };
    expect(timerSeconds(timer, 1000)).toBe(90);
    expect(timerSeconds(timer, 0)).toBe(90);
    expect(timerSeconds(timer, 61001)).toBe(30);
    expect(timerSeconds(timer, 100000)).toBe(0);
    expect(timerSeconds({ ...timer, remaining: 27, endAt: null }, 200000)).toBe(27);
  });
});

describe('backups', () => {
  it('round trips active sessions, loads, history, routines and timers', () => {
    const state = createInitialState();
    state.weights['leg-press'] = 100;
    state.active = createSession(state.workouts[2], state.weights);
    state.active.exercises[0].done[0] = true;
    state.timer.endAt = Date.now() + 90000;
    state.timer.started = true;
    expect(parseBackup(createBackup(state))).toEqual(state);
  });
  it.each(['{', '{}', '{"format":"gym-tracker","version":999,"data":{}}'])('rejects corrupt or incompatible backups: %s', value => {
    expect(() => parseBackup(value)).toThrow();
  });
  it('rejects nested invalid loads, missing exercise references and malformed series', () => {
    const state = createInitialState();
    state.active = createSession(state.workouts[0], {});
    state.active.exercises[0].weight = -1;
    expect(() => parseBackup(createBackup(state))).toThrow();
    state.active.exercises[0].weight = 40;
    state.active.exercises[0].done = [true];
    expect(() => parseBackup(createBackup(state))).toThrow();
    state.active.exercises[0].done = [true, false, false];
    state.active.workoutId = 'missing';
    expect(() => parseBackup(createBackup(state))).toThrow();
  });
});
