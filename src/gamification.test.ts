import { describe, expect, it } from 'vitest';
import { createInitialState } from './data';
import { addSessionSet, beginWorkout, createBackup, finishSession, parseBackup, recordHold, removeSessionSet, swapSessionExercise, toggleSeriesCompletion, validateState } from './domain';
import { auraRewards, equippedAura, exerciseXP, levelProgress, personalRecords, personalXP, sessionXP, weeklyGoal, workoutResult } from './gamification';
import { profileBackup, restoreProfile } from './CloudBackup';
import type { Session } from './types';

function started() { const state = createInitialState(); return beginWorkout(state, state.workouts[0], undefined, 1_790_000_000_000); }
function record(person: Session['person'], at: number): Session {
  const state = started();
  const session = state.active!;
  return { ...session, person, startedAt: at - 3600000, finishedAt: at, exercises: [{ ...session.exercises[0], plannedSets: 3, done: [true, true, true] }] };
}
const at = (date: string) => new Date(`${date}T12:00:00`).getTime();

describe('personal XP', () => {
  it('only rewards completed sets, gives extra sets more XP and snapshots the planned count', () => {
    let state = started();
    const id = state.active!.exercises[0].exerciseId;
    state = addSessionSet(addSessionSet(state, id), id);
    const log = state.active!.exercises[0];
    expect(log.plannedSets).toBe(3);
    expect(exerciseXP(log).xp).toBe(0);
    log.done = toggleSeriesCompletion(log.done, 4);
    expect(exerciseXP(log)).toEqual({ sets: 5, extra: 2, xp: 60 });
    expect(sessionXP(state.active!).xp).toBe(60);
    const finished = finishSession(state, state.active!.startedAt + 1000);
    expect(personalXP(finished.history, 'original')).toBe(110);
    expect(parseBackup(createBackup(finished)).history[0].exercises[0].plannedSets).toBe(3);
  });
  it('does not accumulate XP by repeatedly checking a set, restarting, or duplicating a history id', () => {
    const state = started();
    const log = state.active!.exercises[0];
    log.done = toggleSeriesCompletion(log.done, 2);
    expect(sessionXP(state.active!).xp).toBe(30);
    log.done = toggleSeriesCompletion(log.done, 2);
    expect(sessionXP(state.active!).xp).toBe(20);
    log.done = toggleSeriesCompletion(log.done, 2);
    expect(sessionXP(state.active!).xp).toBe(30);
    const finished = finishSession(state, state.active!.startedAt + 1000);
    expect(personalXP([...finished.history, ...finished.history], 'original')).toBe(80);
    expect(personalXP([], 'original')).toBe(0);
  });
  it('counts old history without guessing past extra sets and separates people', () => {
    const legacy = record(undefined, at('2026-11-13'));
    delete legacy.exercises[0].plannedSets;
    legacy.exercises[0].done = [true, true, true, true];
    const nick = record('sheet', at('2026-11-13'));
    expect(personalXP([legacy, nick], 'original')).toBe(90);
    expect(personalXP([legacy, nick], 'sheet')).toBe(80);
    expect(personalXP([legacy, nick], 'ivan')).toBe(0);
    delete legacy.finishedAt;
    expect(personalXP([legacy], 'original')).toBe(0);
    const state = started();
    delete state.active!.exercises[0].plannedSets;
    const next = addSessionSet(state, state.active!.exercises[0].exerciseId);
    expect(next.active!.exercises[0].plannedSets).toBe(3);
  });
  it('preserves the baseline after a temporary swap or removing pending sets', () => {
    let state = started();
    const id = state.active!.exercises[0].exerciseId;
    state = addSessionSet(state, id);
    const replacement = { ...state.workouts[0].exercises[0], id: 'temporary-test' };
    state = swapSessionExercise(state, id, replacement);
    expect(state.active!.exercises[0].plannedSets).toBe(3);
    state = removeSessionSet(state, replacement.id);
    state.active!.exercises[0].done = [true, true, true];
    expect(exerciseXP(state.active!.exercises[0])).toEqual({ sets: 3, extra: 0, xp: 30 });
  });
  it('only rewards a unilateral timed set when both sides are completed', () => {
    const state = started();
    const log = state.active!.exercises[0];
    Object.assign(log, { exerciseId: 'side-plank', kind: 'seconds', done: [false, false, false], plannedSets: 3 });
    const left = recordHold(state, log.exerciseId, 0, 60, 90, Date.now(), 'left');
    expect(sessionXP(left.active!).xp).toBe(0);
    const right = recordHold(left, log.exerciseId, 0, 60, 90, Date.now(), 'right');
    expect(sessionXP(right.active!).xp).toBe(10);
  });
});

describe('weekly goals and levels', () => {
  it('counts training dates, Sunday to Saturday, ignores empty/future/other-profile records', () => {
    const state = createInitialState();
    state.preferences.weeklyGoals = { original: 2, sheet: 3 };
    state.history = [record('original', at('2026-11-08')), record('original', at('2026-11-08')), record('original', at('2026-11-13')), record('sheet', at('2026-11-12')), record('original', at('2026-11-07')), record('original', at('2026-11-14'))];
    const empty = record('original', at('2026-11-09')); empty.exercises[0].done.fill(false); state.history.push(empty);
    expect(weeklyGoal(state, at('2026-11-13'))).toEqual({ target: 2, done: 2, reached: true });
    expect(weeklyGoal(state, at('2026-11-15')).done).toBe(0);
    expect(weeklyGoal({ ...state, selectedPlan: 'sheet' }, at('2026-11-13'))).toEqual({ target: 3, done: 1, reached: false });
  });
  it('defaults to scheduled required days, excluding optional training', () => {
    const state = createInitialState();
    expect(weeklyGoal(state).target).toBe(5);
    expect(state.workouts.some(w => w.optional)).toBe(true);
  });
  it('unlocks cosmetic rewards at level boundaries without accepting a locked equipped reward', () => {
    expect(levelProgress(499)).toEqual({ level: 1, current: 499, remaining: 1 });
    expect(levelProgress(500)).toEqual({ level: 2, current: 0, remaining: 500 });
    const state = createInitialState(); state.preferences.rewardAuras = { original: 'gold' };
    expect(equippedAura(state).id).toBe('blue');
    state.history = Array.from({ length: 10 }, () => record('original', at('2026-11-13')));
    state.preferences.rewardAuras.original = 'amber';
    expect(equippedAura(state).id).toBe('amber');
    for (const reward of auraRewards) { state.preferences.rewardAuras.original = reward.id; expect(validateState(state)).toBe(true); }
  });
  it('validates optional settings and preserves them through backup restoration', () => {
    const state = createInitialState();
    state.preferences = { ...state.preferences, weeklyGoals: { original: 4, sheet: 3 }, rewardAuras: { original: 'amber' }, haptics: false };
    expect(parseBackup(createBackup(state)).preferences).toEqual(state.preferences);
    for (const weeklyGoals of [{ original: 0 }, { ivan: 8 }, { sheet: 1.2 }, { stranger: 3 }]) expect(validateState({ ...state, preferences: { ...state.preferences, weeklyGoals } })).toBe(false);
    expect(validateState({ ...state, preferences: { ...state.preferences, rewardAuras: { original: 'bad' } } })).toBe(false);
    const active = started(); active.active!.exercises[0].plannedSets = -1;
    expect(validateState(active)).toBe(false);
  });
  it('summarizes a level-up and goal only on the completion that reaches them, including backdated workouts', () => {
    const before = started(); before.preferences.weeklyGoals = { original: 1 };
    before.history = Array.from({ length: 6 }, () => record('original', at('2026-11-01'))); // 480 XP
    before.active!.exercises[0].done[0] = true;
    const after = finishSession(before, at('2026-11-10'), at('2026-11-10') - 1000);
    const result = workoutResult(before, after, after.history[0], at('2026-11-13'));
    expect(result).toMatchObject({ xp: { xp: 60, sets: 1 }, levelBefore: 1, levelAfter: 2, goalReached: true });
    const older = finishSession(before, at('2026-11-07'), at('2026-11-07') - 1000);
    expect(workoutResult(before, older, older.history[0], at('2026-11-13')).goalReached).toBe(false);
  });
});

it('compares personal records against earlier completed attempts, using lower assistance and timed holds', () => {
  const old = record('original', at('2026-11-09'));
  old.exercises[0].weight = 20;
  const next = structuredClone(old); next.id = 'next'; next.finishedAt = at('2026-11-13'); next.exercises[0].weight = 25;
  expect(personalRecords(next, [old])).toMatchObject([{ previous: 20, value: 25, unit: 'kg' }]);
  expect(personalRecords(next, [{ ...old, person: 'sheet' }])).toEqual([]);
  old.exercises[0].exerciseId = next.exercises[0].exerciseId = 'assisted-pullup';
  expect(personalRecords(next, [old])).toEqual([]);
  next.exercises[0].weight = 15;
  expect(personalRecords(next, [old])).toMatchObject([{ previous: 20, value: 15, assistance: true }]);
  old.exercises[0].kind = next.exercises[0].kind = 'seconds';
  old.exercises[0].seconds = [30, 30, 30]; next.exercises[0].seconds = [45, 0, 0];
  old.exercises[0].exerciseId = next.exercises[0].exerciseId = 'plank';
  expect(personalRecords(next, [old])).toMatchObject([{ previous: 30, value: 45, unit: 's' }]);
  next.exercises[0].done.fill(false);
  expect(personalRecords(next, [old])).toEqual([]);
});

it('restores cloud XP and personal rewards without replacing other profiles’ goals or equipped colors', () => {
  const current = createInitialState();
  current.preferences.weeklyGoals = { original: 5, sheet: 2 };
  current.preferences.rewardAuras = { original: 'blue', sheet: 'mint' };
  const remote = createInitialState();
  remote.history = [record('original', at('2026-11-13')), record('sheet', at('2026-11-13'))];
  remote.preferences.weeklyGoals = { original: 4, sheet: 7 };
  remote.preferences.rewardAuras = { original: 'amber', sheet: 'gold' };
  const payload = profileBackup(remote);
  expect(JSON.parse(payload).data.preferences.weeklyGoals).toEqual({ original: 4 });
  const restored = restoreProfile(current, payload);
  expect(personalXP(restored.history, 'original')).toBe(80);
  expect(personalXP(restored.history, 'sheet')).toBe(0);
  expect(restored.preferences.weeklyGoals).toEqual({ original: 4, sheet: 2 });
  expect(restored.preferences.rewardAuras).toEqual({ original: 'amber', sheet: 'mint' });
  expect(validateState(restored)).toBe(true);
});
