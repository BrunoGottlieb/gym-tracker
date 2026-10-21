import { getMuscle } from './catalog';
import type { MuscleGroup, Session } from './types';

export function localDateKey(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function sessionsOnDate(history: Session[], key: string): Session[] {
  return history.filter(s => s.finishedAt !== undefined && localDateKey(s.finishedAt) === key).sort((a, b) => a.finishedAt! - b.finishedAt!);
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
