import { describe, expect, it } from 'vitest';
import { createInitialState, declineSitup, militarySitup } from './data';
import { createSession, editHistorySession, createBackup, parseBackup, validateState } from './domain';
import { migrateState } from './migrations';
import { loadPoints } from './progression';
import { sessionsOnDate } from './calendar';
import { selectRoutinePlan } from './routinePlans';

function recorded() {
  const state = createInitialState();
  state.weights['bench-press'] = 60;
  state.active = createSession(state.workouts[1], {});
  const session = createSession(state.workouts[0], state.weights, new Date(2026, 9, 20, 10).getTime());
  session.finishedAt = session.startedAt + 60000;
  session.exercises[0].done = [true, true, true];
  state.history = [session];
  return { state, session };
}
describe('historical workout editing', () => {
  it('corrects the session, progression and calendar without rewriting current loads or the active session', () => {
    const { state, session } = recorded();
    const original = structuredClone(state);
    const edited = structuredClone(session);
    edited.workoutName = 'Peito corrigido';
    edited.startedAt = new Date(2026, 9, 19, 9).getTime();
    edited.finishedAt = edited.startedAt + 120000;
    edited.exercises[0].weight = 42.5;
    edited.exercises[0].done = [true, true, false, false];
    const next = editHistorySession(state, edited);
    expect(loadPoints(next, 'bench-press')[0]).toMatchObject({ weight: 42.5, completed: 2, total: 4 });
    expect(sessionsOnDate(next.history, '2026-10-19')).toHaveLength(1);
    expect(sessionsOnDate(next.history, '2026-10-20')).toHaveLength(0);
    expect(next.weights).toEqual(original.weights);
    expect(next.active).toEqual(original.active);
    expect(next.workouts).toEqual(original.workouts);
    expect(state).toEqual(original);
    edited.exercises[0].weight = 99;
    expect(next.history[0].exercises[0].weight).toBe(42.5);
    expect(parseBackup(createBackup(next))).toEqual(next);
  });
  it('validates edited snapshots and rejects unknown identities or invalid series/loads/dates', () => {
    const { state, session } = recorded();
    for (const patch of [{ id: 'missing' }, { workoutId: 'different' }, { finishedAt: session.startedAt - 1 }, { finishedAt: undefined }]) {
      expect(() => editHistorySession(state, { ...session, ...patch })).toThrow();
    }
    for (const weight of [-1, NaN, Infinity, 5001]) {
      const edited = structuredClone(session); edited.exercises[0].weight = weight;
      expect(() => editHistorySession(state, edited)).toThrow();
    }
    const empty = structuredClone(session); empty.exercises.forEach(e => e.done.fill(false));
    expect(() => editHistorySession(state, empty)).toThrow();
    const duplicate = structuredClone(session); duplicate.exercises.push(duplicate.exercises[0]);
    expect(() => editHistorySession(state, duplicate)).toThrow();
  });
  it('orders history by corrected end time and can replace an exercise snapshot', () => {
    const { state, session } = recorded();
    const second = { ...structuredClone(session), id: 'second', startedAt: session.startedAt + 120000, finishedAt: session.finishedAt! + 120000 };
    state.history.unshift(second);
    const edited = structuredClone(session);
    edited.startedAt = second.startedAt + 120000; edited.finishedAt = edited.startedAt + 60000;
    edited.exercises = [{ exerciseId: 'lever-squat', name: 'Agachamento no squat articulado', image: 66, target: '8–12', kind: 'reps', muscle: 'legs', weight: 20, done: [true, true] }];
    const next = editHistorySession(state, edited);
    expect(next.history.map(s => s.id)).toEqual([session.id, 'second']);
    expect(validateState(next)).toBe(true);
  });
});

describe('Bruno Wednesday leg routine upgrade', () => {
  it('replaces only the two abdominals, including inactive saved Bruno routines, preserving snapshots and old loads', () => {
    const state = createInitialState();
    state.workouts[2].name = 'Pernas + abdômen';
    state.workouts[2].exercises.splice(4, 2, { ...declineSitup }, { ...militarySitup });
    state.weights['decline-situp'] = 10;
    state.active = createSession(state.workouts[2], state.weights);
    state.active.exercises[4].done[0] = true;
    state.history = [{ ...structuredClone(state.active), id: 'past', finishedAt: state.active.startedAt + 60000 }];
    const next = migrateState(state);
    expect(next.workouts[2].exercises.slice(-2).map(e => e.id)).toEqual(['horizontal-leg-press', 'lever-squat']);
    expect(next.workouts[2].name).toBe('Pernas');
    expect(next.active).toEqual(state.active);
    expect(next.history).toEqual(state.history);
    expect(next.weights).toEqual(state.weights);
    expect(next.weights['horizontal-leg-press']).toBeUndefined();
    expect(migrateState(next)).toEqual(next);
    const nick = selectRoutinePlan({ ...state, active: null }, 'sheet');
    const upgraded = migrateState(nick);
    expect(upgraded.workouts).toEqual(nick.workouts);
    expect(upgraded.planSnapshots?.original?.[2].exercises.slice(-2).map(e => e.id)).toEqual(['horizontal-leg-press', 'lever-squat']);
  });
});
