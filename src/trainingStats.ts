import { getMuscle } from './catalog';
import { localDateKey } from './calendar';
import type { MuscleGroup, Session, Workout } from './types';

export const muscleOrder: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'abs', 'other'];
export const muscleColors: Record<MuscleGroup, string> = {
  chest: '#df7162', back: '#4161f3', legs: '#279b76', shoulders: '#bd8b19',
  biceps: '#9764cf', triceps: '#d76d9d', abs: '#259eaf', other: '#8791a5',
};
const emptyCounts = (): Record<MuscleGroup, number> => Object.fromEntries(muscleOrder.map(group => [group, 0])) as Record<MuscleGroup, number>;

/** Count appearances in the weekly plan: the same exercise on two days counts twice. */
export function plannedMuscleCounts(workouts: Workout[]): Record<MuscleGroup, number> {
  const counts = emptyCounts();
  for (const workout of workouts) for (const exercise of workout.exercises) counts[getMuscle(exercise)]++;
  return counts;
}

export interface WeekdayAverage {
  weekday: number;
  days: number;
  totals: Record<MuscleGroup, number>;
  averages: Record<MuscleGroup, number>;
  total: number;
}

/** Aggregate actual local calendar dates before averaging, including partial recorded sessions. */
export function completedWeekdayAverages(history: Session[]): WeekdayAverage[] {
  const dates = new Map<string, { weekday: number; counts: Record<MuscleGroup, number> }>();
  for (const session of history) {
    if (session.finishedAt === undefined) continue;
    const key = localDateKey(session.finishedAt);
    let date = dates.get(key);
    if (!date) { date = { weekday: new Date(session.finishedAt).getDay(), counts: emptyCounts() }; dates.set(key, date); }
    for (const log of session.exercises) date.counts[getMuscle(log)] += log.done.filter(Boolean).length;
  }
  const weekdays: WeekdayAverage[] = Array.from({ length: 7 }, (_, weekday) => ({ weekday, days: 0, totals: emptyCounts(), averages: emptyCounts(), total: 0 }));
  for (const date of dates.values()) {
    const row = weekdays[date.weekday];
    row.days++;
    for (const group of muscleOrder) row.totals[group] += date.counts[group];
  }
  for (const row of weekdays) if (row.days) {
    for (const group of muscleOrder) row.averages[group] = row.totals[group] / row.days;
    row.total = muscleOrder.reduce((sum, group) => sum + row.totals[group], 0) / row.days;
  }
  return weekdays;
}
