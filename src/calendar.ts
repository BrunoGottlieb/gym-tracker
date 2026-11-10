import { getMuscle } from './catalog';
import type { MuscleGroup, RoutinePlan, Session } from './types';

export function localDateKey(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function sessionsOnDate(history: Session[], key: string): Session[] {
  return history.filter(s => s.finishedAt !== undefined && localDateKey(s.finishedAt) === key).sort((a, b) => a.finishedAt! - b.finishedAt!);
}

export function localDateTimeInput(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${localDateKey(date)}T${hours}:${minutes}`;
}

export function sessionsThisWeek(history: Session[], now: number, person: RoutinePlan): Session[] {
  const sunday = new Date(now);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  return history.filter(session =>
    (session.person ?? 'original') === person && session.finishedAt !== undefined &&
    session.finishedAt >= sunday.getTime() && session.finishedAt <= now &&
    session.exercises.some(exercise => exercise.done.some(Boolean)),
  );
}
/** Infer from the saved session, never from the suggested weekday or the edited current plan. */
export function workoutFocus(session: Session): MuscleGroup {
  const counts = new Map<MuscleGroup, number>();
  for (const exercise of session.exercises) { const group = getMuscle(exercise); counts.set(group, (counts.get(group) ?? 0) + 1); }
  const max = Math.max(0, ...counts.values());
  const tied = [...counts].filter(([, count]) => count === max).map(([group]) => group);
  const name = session.workoutName.toLocaleLowerCase('pt-BR');
  const named: [string, MuscleGroup][] = [['ombro', 'shoulders'], ['costas', 'back'], ['perna', 'legs'], ['peito', 'chest']];
  return named.find(([part, group]) => name.includes(part) && tied.includes(group))?.[1] ?? tied[0] ?? 'other';
}
