import { describe, expect, it } from 'vitest';
import { createInitialState } from './data';
import { beginWorkout, finishSession, validateState } from './domain';
import { completionEvents, sessionEvent, streakDate, streakSummary, sharedStreak, isDate, isSnapshot, defaultTrainingDays } from './streaks';

describe('shared streaks', () => {
  it('shares one sequence across alternating people and counts multiple members on a date only once', () => {
    const result=sharedStreak([{person:'original',date:'2026-10-28'},{person:'sheet',date:'2026-10-29'},{person:'ivan',date:'2026-10-30'},{person:'original',date:'2026-10-30'}],defaultTrainingDays,'2026-10-30');
    expect(result.current).toBe(3);
    expect(result.peopleToday).toEqual(['original','ivan']);
  });
  it('preserves days when everybody rests, but requires Saturday because Ivan trains', () => {
    expect(sharedStreak([{person:'original',date:'2026-10-30'}],defaultTrainingDays,'2026-11-01').current).toBe(0);
    const result=sharedStreak([{person:'ivan',date:'2026-10-31'},{person:'sheet',date:'2026-11-02'}],defaultTrainingDays,'2026-11-02');
    expect(result.current).toBe(2);
    expect(sharedStreak([{person:'ivan',date:'2026-10-31'}],defaultTrainingDays,'2026-11-01')).toMatchObject({current:1,restToday:true});
  });
  it('preserves weekends without adding free training days', () => {
    expect(streakSummary(['2026-10-23', '2026-10-26'], [1,2,3,4,5], '2026-10-26')).toMatchObject({current:2,best:2});
    expect(streakSummary(['2026-10-23'], [1,2,3,4,5], '2026-10-25').current).toBe(1);
  });
  it('keeps today open but resets on a missed past training day', () => {
    expect(streakSummary(['2026-10-23'], [1,2,3,4,5], '2026-10-26').current).toBe(1);
    expect(streakSummary(['2026-10-23'], [1,2,3,4,5], '2026-10-27')).toMatchObject({current:0,best:1});
  });
  it('uses Ivan’s Thursday rest, counts extra rest-day training once and ignores duplicates', () => {
    expect(streakSummary(['2026-10-28','2026-10-30','2026-10-30'], defaultTrainingDays.ivan,'2026-10-30').current).toBe(2);
    expect(streakSummary(['2026-10-28','2026-10-29','2026-10-30'], defaultTrainingDays.ivan,'2026-10-30').current).toBe(3);
  });
  it('uses Brasília dates across the UTC midnight boundary', () => {
    expect(streakDate(Date.parse('2026-10-31T01:00:00Z'))).toBe('2026-10-30');
    expect(streakDate(Date.parse('2026-10-31T03:00:00Z'))).toBe('2026-10-31');
    expect(isDate('2026-02-30')).toBe(false);
  });
  it('tags new sessions and uploads only identified, saved sessions; partials revoke completion', () => {
    let state = createInitialState();
    state = beginWorkout(state, state.workouts[0]);
    expect(state.active?.person).toBe('original');
    expect(sessionEvent(state.active!)).toBeNull();
    state.active!.exercises.forEach(log=>log.done.fill(true));
    state = finishSession(state);
    expect(completionEvents(state)).toHaveLength(1);
    expect(sessionEvent(state.history[0])?.completed).toBe(true);
    state.history[0].exercises[0].done[0]=false;
    expect(sessionEvent(state.history[0])?.completed).toBe(false);
    delete state.history[0].person;
    expect(completionEvents(state)).toEqual([]);
    expect(validateState(state)).toBe(true);
  });
  it('rejects malformed cloud schedules and dates', () => {
    const snapshot={version:1,today:'2026-10-31',dates:[{person:'ivan',date:'2026-10-30'}],trainingDays:defaultTrainingDays};
    expect(isSnapshot(snapshot)).toBe(true);
    expect(isSnapshot({...snapshot,dates:[{person:'unknown',date:'2026-10-30'}]})).toBe(false);
    expect(isSnapshot({...snapshot,trainingDays:{...defaultTrainingDays,ivan:[7]}})).toBe(false);
  });
});
