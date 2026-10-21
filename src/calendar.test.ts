import { describe, expect, it } from 'vitest';
import { createInitialState } from './data';
import { createSession } from './domain';
import { localDateKey, sessionsOnDate, workoutFocus } from './calendar';

describe('actual training calendar', () => {
  it('records the actual finish date regardless of the planned weekday', () => {
    const state = createInitialState();
    const wednesday = new Date(2026, 9, 21, 18, 30).getTime();
    const session = createSession(state.workouts[0], {}, wednesday - 3600000);
    session.exercises[0].done[0] = true;
    session.finishedAt = wednesday;
    expect(state.workouts[0].day).toBe(1);
    expect(sessionsOnDate([session], '2026-10-21')).toEqual([session]);
    expect(sessionsOnDate([session], '2026-10-19')).toEqual([]);
    expect(workoutFocus(session)).toBe('chest');
  });
  it('shows every workout performed on one date in chronological order', () => {
    const state = createInitialState();
    const morning = new Date(2026, 9, 21, 9).getTime();
    const evening = new Date(2026, 9, 21, 18).getTime();
    const back = createSession(state.workouts[1], {}, morning - 1000);
    back.finishedAt = morning;
    const legs = createSession(state.workouts[2], {}, evening - 1000);
    legs.finishedAt = evening;
    expect(sessionsOnDate([legs, back], '2026-10-21').map(s => s.id)).toEqual([back.id, legs.id]);
    expect([workoutFocus(back), workoutFocus(legs)]).toEqual(['back', 'legs']);
  });
  it('uses finished-session snapshots after a plan has been edited, and excludes unfinished sessions', () => {
    const state = createInitialState();
    const session = createSession(state.workouts[3], {});
    expect(workoutFocus(session)).toBe('shoulders');
    const date = localDateKey(Date.now());
    expect(sessionsOnDate([session], date)).toEqual([]);
    session.finishedAt = Date.now();
    state.workouts[3].exercises = [];
    state.workouts[3].name = 'Treino alterado';
    expect(workoutFocus(session)).toBe('shoulders');
    expect(sessionsOnDate([session], date)[0].workoutName).toBe('Ombros, peito + tríceps');
  });
});
