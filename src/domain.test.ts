import { describe, expect, it } from 'vitest';
import { createInitialState } from './data';
import { toggleSeriesCompletion, addSessionSet, removeSessionSet, beginWorkout, createBackup, createSession, finishSession, getProgress, parseBackup, timerSeconds, validateState } from './domain';

describe('workout sessions', () => {
  it.each([2, 3, 4, 13, 100])('completes every series up to the selected number, including %i-series sessions', count => {
    const original = Array(count).fill(false);
    const result = toggleSeriesCompletion(original, count - 1);
    expect(result).toEqual(Array(count).fill(true));
    expect(original).toEqual(Array(count).fill(false));
    expect(toggleSeriesCompletion(result, count - 1)).toEqual([...Array(count - 1).fill(true), false]);
  });
  it('fills previous gaps without changing later marked series, and ignores an invalid index', () => {
    const done = [false, false, false, false, true];
    expect(toggleSeriesCompletion(done, 2)).toEqual([true, true, true, false, true]);
    expect(toggleSeriesCompletion(done, -1)).toBe(done);
    expect(toggleSeriesCompletion(done, 5)).toBe(done);
  });
  it('removes the last pending series without losing completed series, loads, timer or history', () => {
    const state = beginWorkout(createInitialState(), createInitialState().workouts[0]);
    state.active!.exercises[0].done = [true, false, true, false, true];
    state.active!.exercises[0].weight = 45;
    state.weights['bench-press'] = 45;
    state.timer = { duration: 90, remaining: 90, endAt: 91000, started: true, exercise: 'Supino' };
    const original = structuredClone(state);
    const next = removeSessionSet(state, 'bench-press');
    expect(next.active?.exercises[0]).toMatchObject({ weight: 45, done: [true, false, true, true] });
    expect(next.timer).toEqual(original.timer);
    expect(next.history).toEqual(original.history);
    expect(next.workouts).toEqual(original.workouts);
    expect(state).toEqual(original);
    expect(parseBackup(createBackup(next))).toEqual(next);
  });
  it('allows fewer than three series for this session and protects the final or completed series', () => {
    const state = beginWorkout(createInitialState(), createInitialState().workouts[0], { exerciseId: 'bench-press', index: 0 });
    const next = removeSessionSet(removeSessionSet(state, 'bench-press'), 'bench-press');
    expect(next.active?.exercises[0].done).toEqual([true]);
    expect(removeSessionSet(next, 'bench-press')).toBe(next);
    expect(parseBackup(createBackup(next))).toEqual(next);
    expect(createSession(next.workouts[0], next.weights).exercises[0].done).toHaveLength(3);
    state.active!.exercises[0].done = [true, true, true];
    expect(removeSessionSet(state, 'bench-press')).toBe(state);
    const idle = createInitialState();
    expect(removeSessionSet(idle, 'bench-press')).toBe(idle);
  });
  it('preserves completed series, weight and timer when adding session-only series, including backups and history', () => {
    let state = createInitialState();
    state.weights['bench-press'] = 45;
    state = beginWorkout(state, state.workouts[0], { exerciseId: 'bench-press', index: 0 }, 1000);
    state.timer = { duration: 90, remaining: 90, endAt: 91000, started: true, exercise: 'Supino reto com barra' };
    const previous = structuredClone(state);
    state = addSessionSet(addSessionSet(state, 'bench-press'), 'bench-press');
    expect(previous.active?.exercises[0].done).toEqual([true, false, false]);
    expect(state.active?.exercises[0]).toMatchObject({ weight: 45, done: [true, false, false, false, false] });
    expect(state.timer).toEqual(previous.timer);
    expect(state.workouts).toEqual(previous.workouts);
    expect(getProgress(state.active!)).toEqual({ done: 1, total: 20 });
    expect(validateState(state)).toBe(true);
    expect(parseBackup(createBackup(state))).toEqual(state);
    const finished = finishSession(state, 2000);
    expect(finished.history[0].exercises[0].done).toHaveLength(5);
    expect(parseBackup(createBackup(finished))).toEqual(finished);
    expect(createSession(finished.workouts[0], finished.weights).exercises[0].done).toHaveLength(3);
  });
  it('ignores extra-series requests without a matching active exercise', () => {
    const state = createInitialState();
    expect(addSessionSet(state, 'bench-press')).toBe(state);
    state.active = createSession(state.workouts[0], {});
    expect(addSessionSet(state, 'missing')).toBe(state);
  });
  it('starts on the selected series with remembered load and automatic rest', () => {
    const state = createInitialState();
    state.weights['lat-pulldown'] = 30;
    state.preferences.autoRest = true;
    const next = beginWorkout(state, state.workouts[1], { exerciseId: 'lat-pulldown', index: 1 }, 1000);
    expect(state.active).toBeNull();
    expect(next.active?.exercises[0]).toMatchObject({ weight: 30, done: [true, true, false] });
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
    expect(next.active?.exercises[0].done).toEqual([true, true, true]);
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
    state.active.exercises[0].done = [];
    expect(() => parseBackup(createBackup(state))).toThrow();
    state.active.exercises[0].done = [true, false, false];
    state.active.workoutId = 'missing';
    expect(() => parseBackup(createBackup(state))).toThrow();
  });
});
