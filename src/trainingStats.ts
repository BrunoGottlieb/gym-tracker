import { canonicalExerciseId, getMuscle } from './catalog';
import { localDateKey, sessionsThisWeek } from './calendar';
import type { MuscleGroup, RoutinePlan, Session, Workout } from './types';

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

/** Three performed sets equal one exercise-equivalent, including fractions. */
export function completedWeeklyMuscleCounts(history: Session[], person: RoutinePlan, now = Date.now()): Record<MuscleGroup, number> {
  const volume = weeklyMuscleVolume([], history, person, now);
  return Object.fromEntries(muscleOrder.map(group => [group, volume[group].completedSets / 3])) as Record<MuscleGroup, number>;
}

export interface WeeklyExerciseVolume {
  id: string; name: string; image: number; plannedSets: number; completedSets: number;
  plannedIn: { name: string; day: number; sets: number; optional: boolean }[];
  sessions: { id: string; workoutName: string; date: number; sets: number; extra: boolean }[];
}
export interface WeeklyGroupVolume {
  plannedSets: number; completedSets: number; exercises: WeeklyExerciseVolume[];
}
export function weeklyMuscleVolume(workouts: Workout[], history: Session[], person: RoutinePlan, now = Date.now()): Record<MuscleGroup, WeeklyGroupVolume> {
  const groups = Object.fromEntries(muscleOrder.map(group => [group, { plannedSets: 0, completedSets: 0, exercises: [] }])) as unknown as Record<MuscleGroup, WeeklyGroupVolume>;
  const entries = new Map<string, WeeklyExerciseVolume>();
  const ensure = (group: MuscleGroup, rawId: string, name: string, image: number) => {
    const id = canonicalExerciseId(rawId), key = `${group}:${id}`;
    let entry = entries.get(key);
    if (!entry) { entry = { id, name, image, plannedSets: 0, completedSets: 0, plannedIn: [], sessions: [] }; entries.set(key, entry); groups[group].exercises.push(entry); }
    return entry;
  };
  for (const workout of workouts) for (const exercise of workout.exercises) {
    const group = getMuscle(exercise), entry = ensure(group, exercise.id, exercise.name, exercise.image);
    entry.plannedSets += exercise.sets; groups[group].plannedSets += exercise.sets;
    entry.plannedIn.push({ name: workout.name, day: workout.day, sets: exercise.sets, optional: !!workout.optional });
  }
  const seen = new Set<string>();
  for (const session of sessionsThisWeek(history, now, person)) {
    if (seen.has(session.id)) continue; seen.add(session.id);
    for (const log of session.exercises) {
      const sets = log.done.filter(Boolean).length; if (!sets) continue;
      const group = getMuscle(log), entry = ensure(group, log.exerciseId, log.name, log.image);
      entry.completedSets += sets; groups[group].completedSets += sets;
      entry.sessions.push({ id: session.id, workoutName: session.workoutName, date: session.finishedAt!, sets, extra: !!log.extra || !!log.swappedFrom });
    }
  }
  for (const group of muscleOrder) groups[group].exercises.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return groups;
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

export interface WorkoutAverage {
  workoutId: string; name: string; label: string; sessions: number;
  totals: Record<MuscleGroup,number>; averages: Record<MuscleGroup,number>; total: number;
}
/** Average actual completed sets per execution of each workout, regardless of date. */
export function completedWorkoutAverages(history:Session[],workouts:Workout[],person:RoutinePlan='original'):WorkoutAverage[] {
  const rows=new Map<string,WorkoutAverage>();
  const ensure=(id:string,name:string)=>{
    let row=rows.get(id);
    if(!row){row={workoutId:id,name,label:id==='home'?'CASA':/^[a-z]$/i.test(id)?id.toUpperCase():name,sessions:0,totals:emptyCounts(),averages:emptyCounts(),total:0};rows.set(id,row);}
    return row;
  };
  for(const workout of workouts)ensure(workout.id,workout.name);
  for(const session of history){
    if(session.finishedAt===undefined || (session.person??'original')!==person)continue;
    const row=ensure(session.workoutId,session.workoutName);row.sessions++;
    for(const log of session.exercises)row.totals[getMuscle(log)]+=log.done.filter(Boolean).length;
  }
  for(const row of rows.values())if(row.sessions){
    for(const muscle of muscleOrder)row.averages[muscle]=row.totals[muscle]/row.sessions;
    row.total=Object.values(row.totals).reduce((a,b)=>a+b,0)/row.sessions;
  }
  return [...rows.values()].sort((a,b)=>a.workoutId==='home'?1:b.workoutId==='home'?-1:a.label.localeCompare(b.label,'pt-BR'));
}
