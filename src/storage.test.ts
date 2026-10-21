import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { TrackerDatabase, loadState, saveState } from './storage';
import { createInitialState } from './data';
import { createSession } from './domain';

let db: TrackerDatabase;
afterEach(async () => { if (db) await db.delete(); });

describe('IndexedDB persistence', () => {
  it('seeds a fresh installation with all five editable routines', async () => {
    db = new TrackerDatabase(`test-${crypto.randomUUID()}`);
    const state = await loadState(db);
    expect(state.workouts).toHaveLength(5);
    expect(state.history).toEqual([]);
    expect(state.active).toBeNull();
  });
  it('recovers a load, completed series, and timer after closing and reopening the database', async () => {
    const name = `test-${crypto.randomUUID()}`;
    db = new TrackerDatabase(name);
    const state = createInitialState();
    state.weights['bench-press'] = 42.5;
    state.active = createSession(state.workouts[0], state.weights);
    state.active.exercises[0].done[1] = true;
    state.timer = { duration: 90, remaining: 90, started: true, exercise: 'Supino', endAt: Date.now() + 90000 };
    await saveState(state, db);
    db.close();
    db = new TrackerDatabase(name);
    expect(await loadState(db)).toEqual(state);
  });
  it('reports corrupt saved data instead of silently overwriting it', async () => {
    db = new TrackerDatabase(`test-${crypto.randomUUID()}`);
    await db.state.put({ id: 'main', value: { invalid: true } as never });
    await expect(loadState(db)).rejects.toThrow('não puderam ser lidos');
    expect((await db.state.get('main'))?.value).toEqual({ invalid: true });
  });
  it('updates and persists the existing routine without resetting a remembered load', async () => {
    db = new TrackerDatabase(`test-${crypto.randomUUID()}`);
    const state = createInitialState();
    delete state.routineRevision;
    state.workouts[0].exercises[1].name = 'Supino inclinado na máquina';
    state.workouts[0].exercises[1].image = 1;
    state.weights['incline-machine'] = 35;
    await saveState(state, db);
    const next = await loadState(db);
    expect(next.workouts[0].exercises[1].name).toBe('Supino inclinado com barra');
    expect(next.workouts[0].exercises[1].image).toBe(30);
    expect(next.weights['incline-machine']).toBe(35);
    expect((await db.state.get('main'))?.value).toEqual(next);
  });
});
