import { describe, expect, it } from 'vitest';
import { createInitialState } from './data';
import { createBackup, createSession, parseBackup, validateState } from './domain';
import { migrateState } from './migrations';
import { createSheetWorkouts, selectRoutinePlan } from './routinePlans';

describe('local routine choice', () => {
  it('leaves the existing routine untouched until an explicit choice', () => {
    const state = createInitialState();
    state.workouts[0].name = 'Meu treino editado';
    const before = structuredClone(state);
    createSheetWorkouts();
    expect(state).toEqual(before);
    expect(selectRoutinePlan(state, 'original')).toBe(state);
    expect(state.workouts.map(w => w.exercises.length)).toEqual([6, 6, 6, 6, 6]);
  });
  it('transcribes all five sheet routines, series, targets, rest and combinations', () => {
    const workouts = createSheetWorkouts();
    expect(workouts.map(w => w.exercises.length)).toEqual([8, 9, 8, 7, 8]);
    expect(workouts[0].exercises.map(e => e.sets)).toEqual([4, 4, 3, 4, 4, 3, 3, 3]);
    expect(workouts[1].exercises.map(e => e.sets)).toEqual([4, 4, 4, 3, 4, 3, 3, 3, 4]);
    expect(workouts[2].exercises.map(e => e.sets)).toEqual([3, 4, 3, 3, 4, 4, 3, 4]);
    expect(workouts[3].exercises.map(e => e.sets)).toEqual([4, 4, 3, 3, 4, 4, 3]);
    expect(workouts[4].exercises.map(e => e.sets)).toEqual([4, 4, 3, 3, 3, 3, 3, 4]);
    expect(workouts.flatMap(w => w.exercises).every(e => e.rest === 45)).toBe(true);
    expect(workouts[2].exercises[3]).toMatchObject({ kind: 'seconds', target: '45' });
    expect(workouts[4].exercises[6]).toMatchObject({ kind: 'seconds', target: '60' });
    expect(workouts[0].exercises[5].instructions).toMatch(/Bi-set/);
    expect(workouts[4].exercises[4].instructions).toMatch(/Tri-set/);
  });
  it('preserves customizations to both routines, loads, notes and historical snapshots', () => {
    const state = createInitialState();
    state.workouts[0].name = 'Minha segunda';
    state.weights['bench-press'] = 42;
    state.exerciseNotes = { 'bench-press': 'Banco 3' };
    state.history = [{ ...createSession(state.workouts[0], state.weights, 1000), finishedAt: 2000 }];
    const sheet = selectRoutinePlan(state, 'sheet');
    sheet.workouts[0].name = 'Peito editado da folha';
    const original = selectRoutinePlan(sheet, 'original');
    expect(original.workouts).toEqual(state.workouts);
    expect(original.weights).toEqual(state.weights);
    expect(original.history).toEqual(state.history);
    expect(original.exerciseNotes).toEqual(state.exerciseNotes);
    expect(selectRoutinePlan(original, 'sheet').workouts[0].name).toBe('Peito editado da folha');
    expect(state).not.toHaveProperty('planSnapshots');
  });
  it('keeps an active session intact and refuses switching until it ends', () => {
    const state = createInitialState();
    state.active = createSession(state.workouts[0], state.weights);
    state.active.exercises[0].done[0] = true;
    expect(selectRoutinePlan(state, 'sheet')).toBe(state);
  });
  it('roundtrips both configurations in backups and does not normalize sheet series on reload', () => {
    const state = selectRoutinePlan(createInitialState(), 'sheet');
    state.active = createSession(state.workouts[0], state.weights);
    expect(state.active.exercises[0].done).toHaveLength(4);
    expect(state.active.exercises[5].instructions).toMatch(/Bi-set/);
    expect(validateState(state)).toBe(true);
    expect(migrateState(state)).toEqual(state);
    expect(parseBackup(createBackup(state))).toEqual(state);
    const original = selectRoutinePlan({ ...state, active: null }, 'original');
    expect(parseBackup(createBackup(original))).toEqual(original);
    expect(validateState({ ...state, selectedPlan: 'unknown' })).toBe(false);
    expect(validateState({ ...state, planSnapshots: { original: [{ bad: true }] } })).toBe(false);
    expect(validateState({ ...state, planSnapshots: { extra: [] } })).toBe(false);
    const invalid = structuredClone(state);
    invalid.workouts[0].exercises[0].instructions = 'x'.repeat(1001);
    expect(validateState(invalid)).toBe(false);
  });
});
